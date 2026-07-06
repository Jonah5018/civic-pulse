import { Clock, Loader2, CheckCircle2, TriangleAlert } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const STATUS_STYLES = {
  pending: {
    text: "text-amber",
    bg: "bg-amber/10",
    border: "border-amber/30",
    glow: "shadow-[0_0_12px_rgba(251,191,63,0.35)]",
    Icon: Clock,
  },
  in_progress: {
    text: "text-cyan",
    bg: "bg-cyan-soft/50",
    border: "border-cyan/30",
    glow: "shadow-[0_0_12px_rgba(41,211,245,0.35)]",
    Icon: Loader2,
  },
  resolved: {
    text: "text-emerald",
    bg: "bg-emerald-soft/50",
    border: "border-emerald/30",
    glow: "shadow-[0_0_12px_rgba(22,233,166,0.35)]",
    Icon: CheckCircle2,
  },
  escalated: {
    text: "text-rose",
    bg: "bg-rose/10",
    border: "border-rose/30",
    glow: "shadow-[0_0_12px_rgba(251,91,123,0.35)]",
    Icon: TriangleAlert,
  },
};

export function StatusPill({ status }) {
  const { t } = useLanguage();
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  const { Icon } = style;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${style.text} ${style.bg} ${style.border} ${style.glow}`}
    >
      <Icon className={`h-3 w-3 ${status === "in_progress" ? "animate-spin" : ""}`} />
      {t.status[status] ?? status}
    </span>
  );
}

const PRIORITY_STYLES = {
  low: "text-ink-muted bg-white/5 border-border-soft",
  medium: "text-cyan bg-cyan-soft/40 border-cyan/30",
  high: "text-amber bg-amber/10 border-amber/30",
  critical: "text-rose bg-rose/10 border-rose/30",
};

export function PriorityBadge({ priority }) {
  const { t } = useLanguage();
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.low
      }`}
    >
      {t.priority[priority] ?? priority}
    </span>
  );
}
