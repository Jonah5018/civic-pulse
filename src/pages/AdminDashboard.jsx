import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  TriangleAlert,
  Search,
  Download,
  X,
  ImageOff,
  MapPin,
  User,
  Phone,
  MessageSquareText,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import { toast } from "sonner";

import MetricCard from "../components/MetricCard";
import Spinner from "../components/Spinner";
import { StatusPill, PriorityBadge } from "../components/StatusPill";
import { TableRowSkeleton, ChartSkeleton } from "../components/Skeletons";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useReports, exportReportsToCsv } from "../hooks/useReports";
import { getReportDetail, updateReportStatus, updateAdminNote, getAuditLogForReport, logAdminAction } from "../lib/reports";
import { STATES } from "../data/locations";

const STATUS_OPTIONS = ["pending", "in_progress", "resolved", "escalated"];

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { profile } = useAuth();

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [evidenceReport, setEvidenceReport] = useState(null);
  const [detailReport, setDetailReport] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailContent, setDetailContent] = useState({ report: null, contact: null, history: [] });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const filters = useMemo(
    () => ({
      search,
      state: stateFilter === "all" ? null : stateFilter,
      status: statusFilter === "all" ? null : statusFilter,
    }),
    [search, stateFilter, statusFilter]
  );

  const { reports, loading, updateStatus, totalPages, totalReports } = useReports({
    filters,
    page,
    pageSize: PAGE_SIZE,
    scopedWards: profile?.approved_wards,
  });

  useEffect(() => {
    setPage(1);
  }, [search, stateFilter, statusFilter]);

  const metrics = useMemo(() => {
    const total = totalReports ?? reports.length;
    const pending = reports.filter((r) => r.status === "pending").length;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    const critical = reports.filter((r) => r.priority === "critical" && r.status !== "resolved").length;
    return { total, pending, resolved, critical };
  }, [reports, totalReports]);

  const byState = useMemo(() => {
    const counts = Object.fromEntries(STATES.map((s) => [s, 0]));
    reports.forEach((r) => {
      if (counts[r.state] !== undefined) counts[r.state] += 1;
    });
    return STATES.map((s) => ({ state: s, count: counts[s] }));
  }, [reports]);

  const overTime = useMemo(() => {
    const days = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }), count: 0 };
    });
    const map = Object.fromEntries(days.map((d) => [d.key, d]));
    reports.forEach((r) => {
      const key = r.created_at?.slice(0, 10);
      if (map[key]) map[key].count += 1;
    });
    return days;
  }, [reports]);

  useEffect(() => {
    if (!detailReport?.id) {
      setDetailContent({ report: null, contact: null, history: [] });
      return;
    }

    let isMounted = true;
    setDetailLoading(true);

    (async () => {
      try {
        const nextDetail = await getReportDetail(detailReport.id);
        if (!isMounted) return;
        setDetailContent(nextDetail);
      } catch {
        if (isMounted) {
          setDetailContent({ report: detailReport, contact: null, history: [] });
        }
      } finally {
        if (isMounted) setDetailLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [detailReport?.id, detailReport]);

  const handleStatusChange = async (id, status) => {
    const { error } = await updateStatus(id, status);
    if (!error) toast.success(t.toast.statusUpdated);
  };

  const handleDetailStatusChange = async (id, status, note) => {
    try {
      const updated = await updateReportStatus(id, status, note, "admin");
      setDetailContent((prev) => ({
        ...prev,
        report: updated,
        history: [
          ...(prev.history ?? []),
          {
            id: `${updated.id}-${Date.now()}`,
            status,
            changed_at: new Date().toISOString(),
            changed_by: "admin",
            note: note || `Status changed to ${status}.`,
          },
        ],
      }));
      toast.success(t.toast.statusUpdated);
    } catch {
      toast.error(t.toast.reportError);
    }
  };

  const handleExport = () => {
    exportReportsToCsv(reports);
    toast.success(t.toast.csvExported);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t.admin.title}</h1>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald-soft/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald" />
              </span>
              {t.admin.liveBadge}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-muted">{t.admin.subtitle}</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-xl border border-border-soft bg-surface/60 px-4 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
        >
          <Download className="h-4 w-4" /> {t.admin.exportCsv}
        </button>
      </div>

      {/* Metric cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label={t.admin.metricTotal} value={metrics.total} icon={ClipboardList} accent="cyan" loading={loading} />
        <MetricCard label={t.admin.metricPending} value={metrics.pending} icon={Clock} accent="amber" loading={loading} />
        <MetricCard label={t.admin.metricResolved} value={metrics.resolved} icon={CheckCircle2} accent="emerald" loading={loading} />
        <MetricCard label={t.admin.metricCritical} value={metrics.critical} icon={TriangleAlert} accent="rose" loading={loading} />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {loading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <div className="glass rounded-2xl p-5">
              <p className="mb-4 text-sm font-medium text-ink-muted">{t.admin.chartByState}</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byState}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,178,199,0.12)" vertical={false} />
                  <XAxis dataKey="state" tick={{ fill: "#8ea0ae", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8ea0ae", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="url(#barGradient)" />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16e9a6" />
                      <stop offset="100%" stopColor="#29d3f5" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass rounded-2xl p-5">
              <p className="mb-4 text-sm font-medium text-ink-muted">{t.admin.chartOverTime}</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={overTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,178,199,0.12)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#8ea0ae", fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis tick={{ fill: "#8ea0ae", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(41,211,245,0.3)" }} />
                  <Area type="monotone" dataKey="count" stroke="#29d3f5" fill="url(#areaGradient)" strokeWidth={2} />
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#29d3f5" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#29d3f5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <div className="glass mt-6 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink-muted">{t.admin.tableTitle}</p>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
            <div className="relative min-w-[200px] flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.admin.searchPlaceholder}
                className="w-full rounded-lg border border-border-soft bg-surface/60 py-2 pl-8 pr-3 text-xs text-ink outline-none transition-colors focus:border-cyan"
              />
            </div>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="rounded-lg border border-border-soft bg-surface/60 px-2.5 py-2 text-xs text-ink outline-none focus:border-cyan"
            >
              <option value="all">{t.admin.filterState}</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-border-soft bg-surface/60 px-2.5 py-2 text-xs text-ink outline-none focus:border-cyan"
            >
              <option value="all">{t.admin.filterStatus}</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {t.status[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-soft text-[11px] uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-medium">{t.admin.colId}</th>
                <th className="px-4 py-3 font-medium">{t.admin.colCategory}</th>
                <th className="px-4 py-3 font-medium">{t.admin.colLocation}</th>
                <th className="px-4 py-3 font-medium">{t.admin.colPriority}</th>
                <th className="px-4 py-3 font-medium">{t.admin.colStatus}</th>
                <th className="px-4 py-3 font-medium">{t.admin.colReported}</th>
                <th className="px-4 py-3 font-medium">{t.admin.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={7} />)}

              {!loading && reports.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-faint">
                    {t.admin.noResults}
                  </td>
                </tr>
              )}

              {!loading &&
                reports.map((r) => (
                  <tr key={r.id} className="border-b border-border-soft/60 transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs text-cyan">{r.tracking_id}</td>
                    <td className="px-4 py-3 text-xs text-ink">{t.categories[r.category] ?? r.category}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {r.ward}, {r.lga}
                      <br />
                      <span className="text-ink-faint">{r.state}</span>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={r.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                        className="rounded-full border-0 bg-transparent text-xs outline-none"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s} className="bg-surface text-ink">
                            {t.status[s]}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1">
                        <StatusPill status={r.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-faint">
                      {new Date(r.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setDetailReport(r)}
                          className="text-xs font-medium text-cyan hover:underline"
                        >
                          {t.admin.viewDetails}
                        </button>
                        <button
                          onClick={() => setEvidenceReport(r)}
                          className="text-xs font-medium text-ink-muted hover:underline"
                        >
                          {t.admin.viewEvidence}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Paginator page={page} totalPages={totalPages} onPageChange={setPage} t={t} />
      </div>

      <AnimatePresence>
        {evidenceReport && (
          <EvidenceModal report={evidenceReport} t={t} onClose={() => setEvidenceReport(null)} />
        )}
        {detailReport && (
          <ReportDetails
            report={detailReport}
            content={detailContent}
            loading={detailLoading}
            t={t}
            onClose={() => setDetailReport(null)}
            onStatusChange={handleDetailStatusChange}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs">
      <p className="text-ink-muted">{label}</p>
      <p className="font-semibold text-cyan">{payload[0].value} reports</p>
    </div>
  );
}

function ReportDetails({ report, content, loading, t, onClose, _onStatusChange }) {
  const safeContent = content ?? { report: null, contact: null, history: [] };
  const { report: detailReport, contact, history } = safeContent;
  const activeReport = detailReport ?? report;
  const urls = activeReport?.evidence_urls ?? [];
  const [note, setNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(activeReport?.status ?? "pending");
  const [, _setSubmittingNote] = useState(false);
  const [adminNoteText, setAdminNoteText] = useState(activeReport?.admin_note ?? "");
  const [adminNoteSubmitting, setAdminNoteSubmitting] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    setSelectedStatus(activeReport?.status ?? "pending");
    setAdminNoteText(activeReport?.admin_note ?? "");
  }, [activeReport?.status, activeReport?.admin_note]);

  useEffect(() => {
    if (!activeReport?.id) return;
    let isMounted = true;
    setLoadingAudit(true);
    getAuditLogForReport(activeReport.id).then((data) => {
      if (isMounted) setAuditLog(data ?? []);
      setLoadingAudit(false);
    }).catch(() => setLoadingAudit(false));
    return () => { isMounted = false; };
  }, [activeReport?.id]);

  const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const handleAdminNoteSubmit = async (e) => {
    e.preventDefault();
    if (!activeReport?.id || adminNoteText === (activeReport?.admin_note ?? "")) return;
    setAdminNoteSubmitting(true);
    try {
      const updated = await updateAdminNote(activeReport.id, adminNoteText);
      setDetailContent((prev) => ({ ...prev, report: updated }));
      await logAdminAction(activeReport.id, "admin_note_update", activeReport?.admin_note, adminNoteText);
      toast.success("Admin note saved");
    } catch {
      toast.error(t.toast.reportError);
    } finally {
      setAdminNoteSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex justify-end bg-black/70 p-0 backdrop-blur-sm"
    >
      <motion.div
        initial={{ x: 420, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 420, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-2xl overflow-y-auto bg-surface/95 p-6 shadow-2xl"
      >
        {!activeReport || loading ? (
          <div className="flex h-full items-center justify-center p-6">
            <Spinner />
          </div>
        ) : (
          <>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-cyan">{activeReport?.tracking_id}</p>
            <h2 className="mt-2 font-display text-xl font-semibold">{t.admin.detailsTitle}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t.admin.detailsSubtitle}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-white/5 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-border-soft bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{t.admin.incidentSummary}</p>
              <p className="mt-1 text-sm text-ink">{activeReport?.description}</p>
            </div>
            <StatusPill status={activeReport?.status} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border-soft bg-surface/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">{t.admin.colCategory}</p>
              <p className="mt-1 text-sm text-ink">{t.categories[activeReport?.category] ?? activeReport?.category}</p>
            </div>
            <div className="rounded-xl border border-border-soft bg-surface/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">{t.admin.colPriority}</p>
              <p className="mt-1 text-sm text-ink"><PriorityBadge priority={activeReport?.priority} /></p>
            </div>
            <div className="rounded-xl border border-border-soft bg-surface/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">{t.admin.colLocation}</p>
              <p className="mt-1 text-sm text-ink">{activeReport?.ward}, {activeReport?.lga}</p>
              <p className="text-xs text-ink-faint">{activeReport?.state}</p>
            </div>
            <div className="rounded-xl border border-border-soft bg-surface/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">{t.admin.reportedAt}</p>
              <p className="mt-1 text-sm text-ink">{formatDate(activeReport?.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border-soft bg-white/[0.03] p-5">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-cyan" />
              <p className="text-sm font-medium text-ink">{t.admin.contactDetails}</p>
            </div>
            {loading ? (
              <div className="mt-3 flex items-center">
                <Spinner size={20} />
              </div>
            ) : contact ? (
              <div className="mt-3 space-y-3 text-sm text-ink-muted">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  <span>{contact.reporter_name || t.admin.anonymousReporter}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{contact.reporter_phone || t.admin.noPhoneProvided}</span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">{t.admin.noContactDetails}</p>
            )}

            {profile?.admin_phone && (
              <div className="mt-4 border-t border-border-soft/50 pt-4">
                <p className="text-xs uppercase tracking-wide text-ink-faint">Your Contact</p>
                <div className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{profile?.admin_phone}</span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border-soft bg-white/[0.03] p-5">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-cyan" />
              <p className="text-sm font-medium text-ink">{t.admin.statusHistory}</p>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!note.trim()) return;
              _setSubmittingNote(true);
              try {
                await onStatusChange(activeReport.id, selectedStatus, note);
                setNote("");
              } finally {
                _setSubmittingNote(false);
              }
            }} className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-xl border border-border-soft bg-surface/70 px-3 py-2 text-sm text-ink outline-none"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-surface text-ink">
                      {t.status[option]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!note.trim()}
                  className="rounded-xl border border-cyan/30 bg-cyan-soft/20 px-3 py-2 text-sm font-medium text-cyan disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t.admin.addUpdate}
                </button>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={t.admin.notePlaceholder}
                className="w-full rounded-xl border border-border-soft bg-surface/70 px-3 py-2 text-sm text-ink outline-none focus:border-cyan"
              />
            </form>
            <div className="mt-3 space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-ink-muted">{t.admin.historyEmpty}</p>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border-soft bg-surface/70 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StatusPill status={item.status} />
                      <span className="text-[11px] uppercase tracking-wide text-ink-faint">{formatDate(item.changed_at)}</span>
                    </div>
                    {item.changed_by ? (
                      <p className="mt-2 text-xs text-ink-muted">{t.admin.changedBy} {item.changed_by}</p>
                    ) : null}
                    {item.note ? <p className="mt-2 text-sm text-ink-muted">{item.note}</p> : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border-soft bg-white/[0.03] p-5">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-cyan" />
              <p className="text-sm font-medium text-ink">{t.admin.adminNoteTitle}</p>
            </div>
            <form onSubmit={handleAdminNoteSubmit} className="mt-3 space-y-3">
              <textarea
                value={adminNoteText}
                onChange={(e) => setAdminNoteText(e.target.value)}
                rows={2}
                placeholder={t.admin.adminNotePlaceholder}
                className="w-full rounded-xl border border-border-soft bg-surface/70 px-3 py-2 text-sm text-ink outline-none focus:border-cyan"
                defaultValue={activeReport?.admin_note ?? ""}
              />
              <button
                type="submit"
                disabled={adminNoteSubmitting || adminNoteText === (activeReport?.admin_note ?? "")}
                className="rounded-xl border border-cyan/30 bg-cyan-soft/20 px-3 py-2 text-sm font-medium text-cyan disabled:cursor-not-allowed disabled:opacity-60"
              >
                {adminNoteSubmitting ? t.common.loading : t.admin.saveNote}
              </button>
            </form>
            {activeReport?.admin_note && (
              <div className="mt-3 rounded-xl border border-border-soft bg-surface/70 p-3">
                <p className="text-xs uppercase tracking-wide text-ink-faint">Current Note</p>
                <p className="mt-1 text-sm text-ink">{activeReport?.admin_note}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border-soft bg-white/[0.03] p-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-cyan" />
            <p className="text-sm font-medium text-ink">{t.admin.evidenceTitle}</p>
          </div>
          {urls.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {urls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border-soft">
                  <img src={url} alt="Evidence" className="h-32 w-full object-cover" />
                </a>
              ))}
            </div>
          ) : (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-soft py-8 text-ink-faint">
            <ImageOff className="h-6 w-6" />
            <p className="text-xs">{t.admin.noEvidence}</p>
          </div>
          )}

          <div className="mt-6 rounded-2xl border border-border-soft bg-white/[0.03] p-5">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-cyan" />
              <p className="text-sm font-medium text-ink">{t.admin.auditLogTitle}</p>
            </div>
            <div className="mt-3 space-y-2">
              {loadingAudit ? (
                <p className="text-sm text-ink-muted">{t.common.loading}</p>
              ) : auditLog.length === 0 ? (
                <p className="text-sm text-ink-muted">{t.admin.auditLogEmpty}</p>
              ) : (
                auditLog.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border-soft bg-surface/70 p-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-ink">{entry.action}</span>
                      <span className="text-ink-faint">{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                    {entry.previous_value && (
                      <p className="mt-1 text-ink-faint">Prev: {entry.previous_value}</p>
                    )}
                    {entry.new_value && (
                      <p className="text-ink-faint">New: {entry.new_value}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function EvidenceModal({ report, t, onClose }) {
  const urls = report.evidence_urls ?? [];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong w-full max-w-lg rounded-2xl p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-sm text-cyan">{report.tracking_id}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-ink-faint">
              <MapPin className="h-3 w-3" /> {report.ward}, {report.lga}, {report.state}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-white/5 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm text-ink-muted">{report.description}</p>

        {urls.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {urls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border-soft">
                <img src={url} alt="Evidence" className="h-32 w-full object-cover" />
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-soft py-8 text-ink-faint">
            <ImageOff className="h-6 w-6" />
            <p className="text-xs">{t.admin.noEvidence}</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Paginator({ page, totalPages, onPageChange, t }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-xs text-ink-faint">
        {t.admin.page} {page} / {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-border-soft px-3 py-1.5 text-xs text-ink-muted disabled:opacity-40 hover:border-border-strong"
        >
          {t.admin.prevPage}
        </button>
        <span className="text-xs text-ink-faint">{page} / {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-border-soft px-3 py-1.5 text-xs text-ink-muted disabled:opacity-40 hover:border-border-strong"
        >
          {t.admin.nextPage}
        </button>
      </div>
    </div>
  );
}
