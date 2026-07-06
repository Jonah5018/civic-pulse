import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { getReports } from "../lib/reports";
import { StatusPill } from "../components/StatusPill";

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getReports({});
        const mine = data.filter((r) => r.user_id === user?.id);
        setReports(mine);
      } catch {
        setReports([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const byStatus = useMemo(() => {
    const map = {};
    reports.forEach((r) => {
      map[r.status] = (map[r.status] ?? 0) + 1;
    });
    return map;
  }, [reports]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-3xl px-4 py-8 sm:px-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-surface/60">
          <span className="font-display text-lg font-semibold text-cyan">
            {(user?.email?.[0] ?? "?").toUpperCase()}
          </span>
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">My Reports</h1>
          <p className="text-sm text-ink-muted">
            {user?.email ?? ""} — {reports.length} {reports.length === 1 ? "report" : "reports"} total
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {Object.entries(
          { pending: "Pending", in_progress: "In progress", resolved: "Resolved", escalated: "Escalated" }
        ).map(([status, label]) => (
          <div key={status} className="glass rounded-xl px-3 py-3 text-center">
            <p className="font-display text-xl font-semibold text-cyan">{byStatus[status] ?? 0}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-faint">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 glass rounded-2xl p-5">
        {loading ? (
          <p className="text-sm text-ink-muted">{t.common.loading}</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-ink-muted">You haven't submitted any reports yet.</p>
        ) : (
          <div className="divide-y divide-border-soft/60">
            {reports.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-mono text-sm text-cyan">{r.tracking_id}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {t.categories[r.category] ?? r.category} · {r.ward}, {r.lga}, {r.state}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={r.status} />
                  <span className="text-[11px] text-ink-faint">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
