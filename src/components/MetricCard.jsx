import { motion } from "motion/react";

const ACCENTS = {
  emerald: {
    ring: "from-emerald/40 via-emerald/0 to-transparent",
    text: "text-emerald",
    glow: "shadow-[0_0_30px_-8px_rgba(22,233,166,0.5)]",
  },
  cyan: {
    ring: "from-cyan/40 via-cyan/0 to-transparent",
    text: "text-cyan",
    glow: "shadow-[0_0_30px_-8px_rgba(41,211,245,0.5)]",
  },
  amber: {
    ring: "from-amber/40 via-amber/0 to-transparent",
    text: "text-amber",
    glow: "shadow-[0_0_30px_-8px_rgba(251,191,63,0.5)]",
  },
  rose: {
    ring: "from-rose/40 via-rose/0 to-transparent",
    text: "text-rose",
    glow: "shadow-[0_0_30px_-8px_rgba(251,91,123,0.5)]",
  },
};

export default function MetricCard({ label, value, icon: Icon, accent = "cyan", loading, delta }) {
  const style = ACCENTS[accent] ?? ACCENTS.cyan;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass relative overflow-hidden rounded-2xl p-5 ${style.glow}`}
    >
      <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${style.ring} blur-2xl`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-200">{label}</p>
          {loading ? (
            <div className="mt-3 h-8 w-16 animate-pulse rounded-md bg-white/10" />
          ) : (
            <p className={`mt-1 font-display text-3xl font-semibold ${style.text}`}>
              {value}
            </p>
          )}
          {delta && !loading && <p className="mt-1 text-[11px] text-slate-300">{delta}</p>}
        </div>
        {Icon && (
          <span className={`rounded-xl border border-border-soft bg-white/5 p-2.5 ${style.text}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
    </motion.div>
  );
}
