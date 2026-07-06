import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate, useLocation, Link } from "react-router";
import { toast } from "sonner";
import { Fingerprint, Mail, Lock, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";

import FloatingField from "../components/FloatingField";
import RadarField from "../components/RadarField";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function Login() {
  const { t } = useLanguage();
  const { signIn, isAuthenticated, isAdmin, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isDemoMode && !isAuthenticated) {
      void signIn("demo@civicpulse.test", "demo-password");
    }
  }, [isDemoMode, isAuthenticated, signIn]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(isAdmin ? "/dashboard" : location.state?.from?.pathname || "/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email, password);
    setSubmitting(false);

    if (error) {
      setError(t.toast.loginError);
      toast.error(t.toast.loginError);
      return;
    }
    toast.success(t.toast.loginSuccess);
  };

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden px-4 py-16">
      <RadarField className="opacity-70" />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="glass-strong relative w-full max-w-sm rounded-3xl p-8"
      >
        <div className="flex flex-col items-center text-center">
          <motion.span
            className="relative flex h-16 w-16 items-center justify-center rounded-full border border-cyan/30 bg-cyan-soft/20"
            animate={{ boxShadow: ["0 0 0px rgba(41,211,245,0.3)", "0 0 24px rgba(41,211,245,0.35)", "0 0 0px rgba(41,211,245,0.3)"] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            <Fingerprint className="h-7 w-7 text-cyan" />
            <span className="absolute inset-0 rounded-full border border-cyan/20 animate-pulse-ring" />
          </motion.span>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-faint">
            {t.login.eyebrow}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold">{t.login.title}</h1>
          <p className="mt-2 text-sm text-ink-muted">{t.login.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <FloatingField
            label={t.login.email}
            type="email"
            icon={Mail}
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="relative">
            <FloatingField
              label={t.login.password}
              type={showPassword ? "text" : "password"}
              icon={Lock}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted"
              tabIndex={-1}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-emerald px-5 py-3.5 text-sm font-semibold text-[#04120c] shadow-[0_0_30px_-6px_rgba(41,211,245,0.55)] disabled:opacity-70"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? t.login.submitting : t.login.submit}
          </motion.button>
        </form>

        {isDemoMode ? (
          <p className="mt-4 rounded-lg border border-cyan/20 bg-cyan-soft/10 px-3 py-2 text-center text-xs text-cyan">
            Preview mode is active — the admin dashboard is available locally.
          </p>
        ) : null}

        <p className="mt-6 text-center text-xs text-ink-faint">{t.login.footer}</p>

        <Link
          to="/signup"
          className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
        >
          {t.login.createAccount}
        </Link>

        <Link
          to="/"
          className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {t.login.backHome}
        </Link>
      </motion.div>
    </div>
  );
}
