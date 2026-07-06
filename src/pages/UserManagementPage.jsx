import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ShieldCheck, Users, Loader2 } from "lucide-react";

import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { getAllUsers, updateUserRole, removeAdminRole, getWardsForLga } from "../lib/reports";
import { LGAS_BY_STATE } from "../data/locations";

export default function UserManagementPage() {
  const { t } = useLanguage();
  const { profile: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});

  const [wardSearch, setWardSearch] = useState({});
  const [wardSuggestions, setWardSuggestions] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const data = await getAllUsers();
        setUsers(data ?? []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRoleChange = async (userId, currentRole) => {
    if (currentRole === "admin") {
      handleDemote(userId);
    } else {
      handlePromote(userId);
    }
  };

  const handlePromote = async (userId) => {
    if (!confirm(t.admin.usersPromoteConfirm ?? "Make this user a community admin?")) return;
    setUpdating((s) => ({ ...s, [userId]: true }));
    try {
      const updated = await updateUserRole(userId, "admin");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? updated : u))
      );
      toast.success(t.admin.usersPromoted ?? "User promoted to admin");
    } catch {
      toast.error(t.toast.reportError);
    } finally {
      setUpdating((s) => ({ ...s, [userId]: false }));
    }
  };

  const handleDemote = async (userId) => {
    if (!confirm(t.admin.usersDemoteConfirm ?? "Remove admin access from this user?")) return;
    setUpdating((s) => ({ ...s, [userId]: true }));
    try {
      const updated = await removeAdminRole(userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? updated : u))
      );
      toast.success(t.admin.usersDemoted ?? "User demoted to citizen");
    } catch {
      toast.error(t.toast.reportError);
    } finally {
      setUpdating((s) => ({ ...s, [userId]: false }));
    }
  };

  const handleWardSearch = async (userId, _lga, search) => {
    setWardSearch((s) => ({ ...s, [userId]: search }));
    if (!search.trim()) {
      setWardSuggestions((s) => ({ ...s, [userId]: [] }));
      return;
    }
    try {
      const promises = Object.values(LGAS_BY_STATE).flat().map((lga) => getWardsForLga(lga));
      const results = await Promise.all(promises);
      const allWards = results.flat().filter(Boolean);
      const matches = allWards
        .filter((w) => w.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 8);
      setWardSuggestions((s) => ({ ...s, [userId]: matches }));
    } catch {
      setWardSuggestions((s) => ({ ...s, [userId]: [] }));
    }
  };

  const addWard = async (userId, _lga, wardName) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const current = user.approved_wards ?? [];
    if (current.includes(wardName)) return;
    const updated = await updateUserRole(userId, user.role, [...current, wardName]);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? updated : u))
    );
    setWardSearch((s) => ({ ...s, [userId]: "" }));
    setWardSuggestions((s) => ({ ...s, [userId]: [] }));
  };

  const removeWard = async (userId, wardName) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const updated = await updateUserRole(
      userId,
      user.role,
      (user.approved_wards ?? []).filter((w) => w !== wardName)
    );
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? updated : u))
    );
  };

  const isCentralAdmin = me?.super_admin;

  const citizens = useMemo(
    () => users.filter((u) => u.role === "citizen"),
    [users]
  );
  const admins = useMemo(
    () => users.filter((u) => u.role === "admin"),
    [users]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-5xl px-4 py-8 sm:px-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-surface/60">
          <Users className="h-6 w-6 text-cyan" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            {t.admin.usersTitle}
          </h1>
          <p className="text-sm text-ink-muted">{t.admin.usersSubtitle}</p>
        </div>
      </div>

      {!isCentralAdmin && (
        <p className="mt-4 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
          Only the central admin can manage users and assign community admin roles.
        </p>
      )}

      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-ink-muted text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> {t.common.loading}
        </div>
      ) : error ? (
        <p className="mt-6 text-sm text-rose">{error}</p>
      ) : (
        <div className="mt-8 space-y-8">
          {/* Community admins section */}
          <section className="glass rounded-2xl p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-ink-muted">
              <ShieldCheck className="h-4 w-4 text-cyan" />
              Community Admins ({admins.length})
            </h2>
            {admins.length === 0 ? (
              <p className="text-sm text-ink-faint">No community admins yet.</p>
            ) : (
              <div className="divide-y divide-border-soft/60">
                {admins.map((user) => (
                  <AdminRow
                    key={user.id}
                    user={user}
                    t={t}
                    isCentralAdmin={isCentralAdmin}
                    updating={updating[user.id]}
                    wardSearch={wardSearch[user.id] ?? ""}
                    wardSuggestions={wardSuggestions[user.id] ?? []}
                    onRoleChange={() => handleRoleChange(user.id, user.role)}
                    onWardSearch={(s) => handleWardSearch(user.id, "", s)}
                    onAddWard={(ward) => addWard(user.id, "", ward)}
                    onRemoveWard={(ward) => removeWard(user.id, ward)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Citizens section */}
          <section className="glass rounded-2xl p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-ink-muted">
              <Users className="h-4 w-4 text-ink-faint" />
              Citizens ({citizens.length})
            </h2>
            {citizens.length === 0 ? (
              <p className="text-sm text-ink-faint">No registered citizens yet.</p>
            ) : (
              <div className="divide-y divide-border-soft/60">
                {citizens.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    t={t}
                    isCentralAdmin={isCentralAdmin}
                    updating={updating[user.id]}
                    onPromote={() => handlePromote(user.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </motion.div>
  );
}

function AdminRow({
  user,
  t,
  isCentralAdmin,
  updating,
  wardSearch,
  wardSuggestions,
  onRoleChange,
  onWardSearch,
  onAddWard,
  onRemoveWard,
}) {
  const [showWardInput, setShowWardInput] = useState(false);

  return (
    <div className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">
            {user.full_name || "Anonymous User"}
          </p>
          <p className="text-xs text-ink-faint">
            ID: {user.id} · Joined: {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>
        {isCentralAdmin && (
          <button
            onClick={onRoleChange}
            disabled={updating}
            className="flex items-center gap-1.5 rounded-lg border border-rose/30 px-3 py-1.5 text-xs font-medium text-rose transition-colors hover:border-rose/60 disabled:opacity-60"
          >
            <ShieldCheck className="h-3 w-3" />
            {t.admin.usersDemote}
          </button>
        )}
      </div>

      {/* Ward assignment */}
      <div className="mt-3">
        <p className="mb-1.5 text-[10px] uppercase tracking-wide text-ink-faint">
          {t.admin.usersColWards}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(user.approved_wards ?? []).length === 0 ? (
            <span className="text-xs text-ink-faint">{t.admin.usersNoWards}</span>
          ) : (
            (user.approved_wards ?? []).map((ward) => (
              <span
                key={ward}
                className="flex items-center gap-1 rounded-full border border-border-soft bg-surface/70 px-2 py-0.5 text-[11px] text-ink-muted"
              >
                {ward}
                {isCentralAdmin && (
                  <button
                    onClick={() => onRemoveWard(ward)}
                    className="text-ink-faint hover:text-rose"
                    aria-label={`Remove ${ward}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))
          )}
        </div>
        {isCentralAdmin && (
          <div className="mt-2">
            {!showWardInput ? (
              <button
                onClick={() => setShowWardInput(true)}
                className="rounded-lg border border-border-soft px-2.5 py-1 text-xs text-ink-muted hover:border-border-strong"
              >
                + Add ward
              </button>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    value={wardSearch}
                    onChange={(e) => onWardSearch(e.target.value)}
                    placeholder={t.admin.usersWardPlaceholder}
                    className="w-full rounded-lg border border-border-soft bg-surface/60 px-2.5 py-1.5 text-xs text-ink outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && wardSearch.trim()) {
                        onAddWard(wardSearch.trim());
                      }
                    }}
                  />
                  {wardSuggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-border-soft bg-surface shadow-lg">
                      {wardSuggestions.map((ward) => (
                        <button
                          key={ward}
                          onClick={() => onAddWard(ward)}
                          className="block w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-white/5"
                        >
                          {ward}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowWardInput(false);
                    setWardSearch("");
                    setWardSuggestions([]);
                  }}
                  className="text-xs text-ink-faint hover:text-ink"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({ user, t, isCentralAdmin, updating, onPromote }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div>
        <p className="text-sm font-medium text-ink">
          {user.full_name || "Anonymous User"}
        </p>
        <p className="text-xs text-ink-faint">
          Joined: {new Date(user.created_at).toLocaleDateString()}
        </p>
      </div>
      {isCentralAdmin && (
        <button
          onClick={onPromote}
          disabled={updating}
          className="flex items-center gap-1.5 rounded-lg border border-emerald/30 bg-emerald-soft/20 px-3 py-1.5 text-xs font-medium text-emerald transition-colors hover:border-emerald/60 disabled:opacity-60"
        >
          {t.admin.usersPromote}
        </button>
      )}
    </div>
  );
}
