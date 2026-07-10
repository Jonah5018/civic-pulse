import { supabase, EVIDENCE_BUCKET } from "./supabaseClient";
import {
  generateTrackingId,
  validateReportForm,
} from "./validation";

const REPORT_SELECT = "id, tracking_id, category, description, priority, admin_note, state, lga, ward, latitude, longitude, place_name, evidence_urls, status, created_at, updated_at";

async function createStatusHistoryEntry(reportId, status, note = null, changedBy = "system") {
  const { error } = await supabase.from("report_status_history").insert({
    report_id: reportId,
    status,
    changed_by: changedBy,
    note,
  });

  if (error) {
    console.warn("[CivicPulse] Couldn't save status history:", error.message);
  }
}

/** Uploads evidence files to Supabase Storage and returns their public URLs. */
async function uploadEvidence(trackingId, files) {
  if (!files?.length) return [];

  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf", "video/mp4", "video/webm"];

  const uploads = await Promise.all(
    files.map(async ({ file }) => {
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Unsupported file type: ${file.type}`);
      }

      const baseName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const safeTrackingId = trackingId.replace(/[^a-zA-Z0-9_-]/g, "");
      const path = `${safeTrackingId}/${Date.now()}-${baseName}`.slice(0, 255);

      const { error } = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(EVIDENCE_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    })
  );

  return uploads;
}

/**
 * Submits a citizen report. Requires user_id for authentication.
 * Evidence upload failures don't block the report itself — better a report with no photo than no report.
 */
export async function submitReport(form, files, userId) {
  if (!userId) throw new Error("Authentication required to submit a report.");
  validateReportForm(form);

  const trackingId = generateTrackingId();

  let evidenceUrls = [];

  try {
    evidenceUrls = await uploadEvidence(trackingId, files);
  } catch (err) {
    console.warn("[CivicPulse] Evidence upload failed, continuing without it:", err.message);
  }

  const reportPayload = {
    user_id: userId,
    tracking_id: trackingId,
    category: form.category,
    description: form.description,
    priority: form.priority,
    state: form.state,
    lga: form.lga,
    ward: form.ward,
    latitude: form.latitude ?? null,
    longitude: form.longitude ?? null,
    place_name: form.placeName ?? null,
    evidence_urls: evidenceUrls,
    status: "pending",
  };

  const { data, error } = await supabase
    .from("reports")
    .insert(reportPayload)
    .select(REPORT_SELECT)
    .single();

  if (error) {
    await removeEvidenceByTrackingId(trackingId);
    throw new Error(`Report submission failed: ${error.message}`);
  }

  await createStatusHistoryEntry(data.id, "pending", "Report submitted via the citizen portal.");

  // Contact info (if given) is stored separately, admin-eyes-only
  if (form.name || form.phone) {
    const { error: contactError } = await supabase.from("report_contacts").insert({
      report_id: data.id,
      reporter_name: form.name || null,
      reporter_phone: form.phone || null,
    });
    if (contactError) {
      console.warn("[CivicPulse] Couldn't save contact info:", contactError.message);
    }
  }

  return data;
}

/** Removes uploaded evidence files from storage for a given tracking ID. */
async function removeEvidenceByTrackingId(trackingId) {
  if (!trackingId) return;
  try {
    const { data } = await supabase.storage.from(EVIDENCE_BUCKET).list(trackingId, {
      limit: 100,
    });
    if (data?.length) {
      const paths = data.map((f) => `${trackingId}/${f.name}`);
      await supabase.storage.from(EVIDENCE_BUCKET).remove(paths);
    }
  } catch (e) {
    console.warn("[CivicPulse] Couldn't clean up orphaned evidence:", e.message);
  }
}

export async function getReports(options = {}, signal) {
  const { state, status, search, limit, offset = 0, scopedWards } = options;

  let query = supabase.from("reports").select(REPORT_SELECT);

  if (state) query = query.eq("state", state);
  if (status) query = query.eq("status", status);
  if (search) {
    const term = `%${search.trim()}%`;
    query = query.or(`tracking_id.ilike.${term},category.ilike.${term},description.ilike.${term}`);
  }
  if (scopedWards && scopedWards.length > 0) {
    query = query.in("ward", scopedWards);
  }

  query = query.order("created_at", { ascending: false });
  if (offset > 0) query = query.range(offset, offset + (limit ?? 20) - 1);
  else if (limit) query = query.limit(limit);

  const { data, error } = await query.abortSignal(signal);
  if (error) throw error;
  return data ?? [];
}

export async function getReportStats(signal, scopedWards) {
  const base = () =>
    scopedWards?.length
      ? supabase.from("reports").in("ward", scopedWards).select("id", { count: "exact" })
      : supabase.from("reports").select("id", { count: "exact" });

  const run = (q) => (signal ? q.abortSignal(signal) : q);

  // Use allSettled (not all) so a single failing query can never reject the
  // whole call — otherwise the UI would be stuck on its blank loading state.
  const [totalRes, resolvedRes] = await Promise.allSettled([
    run(base()),
    run(base().eq("status", "resolved")),
  ]);

  const total = totalRes.status === "fulfilled" ? totalRes.value?.count ?? 0 : 0;
  const resolved = resolvedRes.status === "fulfilled" ? resolvedRes.value?.count ?? 0 : 0;

  return { total, resolved };
}

export async function getReportByTrackingId(trackingId) {
  const { data, error } = await supabase
    .from("reports")
    .select(REPORT_SELECT)
    .eq("tracking_id", trackingId.trim().toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateReportStatus(id, status, note = null, changedBy = "admin") {
  const { data, error } = await supabase.from("reports").update({ status }).eq("id", id).select(REPORT_SELECT).single();
  if (error) throw error;
  await createStatusHistoryEntry(data.id, status, note ?? `Status changed to ${status}.`, changedBy);
  return data;
}

export async function addStatusHistoryNote(reportId, status, note, changedBy = "admin") {
  const { data, error } = await supabase.from("reports").select(REPORT_SELECT).eq("id", reportId).single();
  if (error) throw error;

  const { error: updateError } = await supabase.from("reports").update({ status }).eq("id", reportId);
  if (updateError) throw updateError;

  await createStatusHistoryEntry(reportId, status, note, changedBy);
  return data;
}

export async function getReportDetail(id) {
  const [{ data: report, error: reportError }, { data: contact, error: contactError }, { data: history, error: historyError }] = await Promise.all([
    supabase.from("reports").select(REPORT_SELECT).eq("id", id).single(),
    supabase.from("report_contacts").select("reporter_name, reporter_phone, created_at").eq("report_id", id).maybeSingle(),
    supabase.from("report_status_history").select("id, status, changed_at, changed_by, note").eq("report_id", id).order("changed_at", { ascending: true }),
  ]);

  if (reportError) throw reportError;
  if (contactError && contactError.code !== "PGRST116") throw contactError;
  if (historyError) throw historyError;

  return {
    report,
    contact: contact ?? null,
    history: history ?? [],
  };
}

/** Returns the seeded/loaded wards for an LGA from Supabase, or null if none exist yet. */
export async function getWardsForLga(lga) {
  const { data, error } = await supabase
    .from("wards")
    .select("name")
    .eq("lga", lga)
    .order("name", { ascending: true });

  if (error || !data?.length) return null;
  return data.map((w) => w.name);
}

/** Updates the admin_note on a report (visible to the report owner). */
export async function updateAdminNote(reportId, adminNote) {
  const { data, error } = await supabase
    .from("reports")
    .update({ admin_note: adminNote })
    .eq("id", reportId)
    .select(REPORT_SELECT)
    .single();

  if (error) throw error;
  return data;
}

/** Inserts an audit log entry for an admin action. */
export async function logAdminAction(reportId, action, previousValue = null, newValue = null) {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .insert({
      report_id: reportId,
      admin_id: (await supabase.auth.getSession()).data.session?.user?.id ?? null,
      action,
      previous_value: previousValue,
      new_value: newValue,
    });

  if (error) {
    console.warn("[CivicPulse] Couldn't save audit log:", error.message);
  }
  return data;
}

/** Fetches audit log entries for a specific report. */
export async function getAuditLogForReport(reportId) {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// USER MANAGEMENT (super admin only — enforced by RLS)
// ============================================================================

/** Returns all registered users with their profiles (super-admin only, RLS-enforced). */
export async function getAllUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, super_admin, approved_wards, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Promotes or demotes a user. Only the super admin can call this (RLS-enforced). */
export async function updateUserRole(userId, role, approvedWards = []) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      role,
      approved_wards: approvedWards,
    })
    .eq("id", userId)
    .select("id, full_name, role, approved_wards")
    .single();

  if (error) throw error;
  return data;
}

/** Demotes an admin back to citizen. */
export async function removeAdminRole(userId) {
  return updateUserRole(userId, "citizen", []);
}
