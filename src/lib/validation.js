const REQUIRED_FIELDS = ["category", "description", "state", "lga", "ward"];

const ALLOWED_CATEGORIES = [
  "road",
  "power",
  "water",
  "waste",
  "security",
  "health",
  "education",
  "other",
];

const ALLOWED_PRIORITIES = ["low", "medium", "high", "critical"];

const ALLOWED_STATUSES = ["pending", "in_progress", "resolved", "escalated"];

export function isValidEnumValue(value, allowed) {
  return allowed.includes(value);
}

export function validateReportForm(form) {
  const hasMissingField = REQUIRED_FIELDS.some(
    (field) => !String(form[field] ?? "").trim()
  );
  if (hasMissingField) {
    throw new Error("Please complete the required report fields.");
  }

  if (!isValidEnumValue(form.category, ALLOWED_CATEGORIES)) {
    throw new Error("Invalid report category.");
  }

  if (form.priority && !isValidEnumValue(form.priority, ALLOWED_PRIORITIES)) {
    throw new Error("Invalid priority value.");
  }

  if (form.status && !isValidEnumValue(form.status, ALLOWED_STATUSES)) {
    throw new Error("Invalid status value.");
  }

  return true;
}

const TRACKING_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTrackingId() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += TRACKING_CHARS[Math.floor(Math.random() * TRACKING_CHARS.length)];
  }
  return `CP-${code}`;
}

export function normalizeTrackingId(trackingId) {
  return String(trackingId ?? "").trim().toUpperCase();
}
