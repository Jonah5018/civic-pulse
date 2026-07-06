import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Radar, Menu, X, LogOut, ShieldCheck, LayoutDashboard, FileText, Languages, Map, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { toast } from "sonner";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, isAdmin, signOut } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const navigate = useNavigate();

  const linkClasses = ({ isActive }) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? "text-cyan bg-cyan-soft/40" : "text-ink-muted hover:text-ink hover:bg-white/5"
    }`;

  const handleSignOut = async () => {
    await signOut();
    toast(t.toast.signedOut);
    navigate("/");
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border-soft/70 bg-base/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald/20 to-cyan/20 border border-border-strong">
            <Radar className="h-4.5 w-4.5 text-emerald" />
            <span className="absolute inline-flex h-full w-full animate-radar-spin rounded-xl border border-cyan/20" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Civic<span className="text-gradient">Pulse</span>
          </span>
        </NavLink>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          <NavLink to="/" className={linkClasses} end>
            <FileText className="h-4 w-4" /> {t.nav.report}
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/users" className={linkClasses}>
                <Users className="h-4 w-4" /> Users
              </NavLink>
              <NavLink to="/dashboard" className={linkClasses}>
                <LayoutDashboard className="h-4 w-4" /> {t.nav.dashboard}
              </NavLink>
              <NavLink to="/map" className={linkClasses}>
                <Map className="h-4 w-4" /> Incident Map
              </NavLink>
            </>
          )}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageToggle lang={lang} onToggle={toggleLang} />
          {isAuthenticated ? (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-lg border border-border-soft px-3.5 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-rose/40 hover:text-rose"
            >
              <LogOut className="h-4 w-4" /> {t.nav.signOut}
            </button>
          ) : (
            <NavLink
              to="/login"
              className="flex items-center gap-1.5 rounded-lg border border-emerald/30 bg-emerald-soft/30 px-3.5 py-2 text-sm font-medium text-emerald transition-colors hover:border-emerald/60"
            >
              <ShieldCheck className="h-4 w-4" /> {t.nav.signIn}
            </NavLink>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-2 text-ink-muted hover:bg-white/5 md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border-soft/70 md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              <NavLink to="/" className={linkClasses} end onClick={() => setOpen(false)}>
                <FileText className="h-4 w-4" /> {t.nav.report}
              </NavLink>
              {isAdmin && (
                <>
                  <NavLink to="/users" className={linkClasses} onClick={() => setOpen(false)}>
                    <Users className="h-4 w-4" /> Users
                  </NavLink>
                  <NavLink to="/dashboard" className={linkClasses} onClick={() => setOpen(false)}>
                    <LayoutDashboard className="h-4 w-4" /> {t.nav.dashboard}
                  </NavLink>
                </>
              )}
              <div className="my-1 border-t border-border-soft/70" />
              <LanguageToggle lang={lang} onToggle={toggleLang} full />
              {isAuthenticated ? (
                <button
                  onClick={handleSignOut}
                  className="mt-1 flex items-center gap-1.5 rounded-lg border border-border-soft px-3.5 py-2.5 text-sm font-medium text-ink-muted"
                >
                  <LogOut className="h-4 w-4" /> {t.nav.signOut}
                </button>
              ) : (
                <NavLink
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="mt-1 flex items-center gap-1.5 rounded-lg border border-emerald/30 bg-emerald-soft/30 px-3.5 py-2.5 text-sm font-medium text-emerald"
                >
                  <ShieldCheck className="h-4 w-4" /> {t.nav.signIn}
                </NavLink>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function LanguageToggle({ lang, onToggle, full }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 rounded-lg border border-border-soft bg-surface/60 px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-border-strong ${
        full ? "justify-center" : ""
      }`}
      aria-label="Toggle language"
    >
      <Languages className="h-3.5 w-3.5" />
      <span className={lang === "en" ? "text-cyan" : ""}>English</span>
      <span className="text-ink-faint">|</span>
      <span className={lang === "ig" ? "text-cyan" : ""}>Igbo</span>
    </button>
  );
}
