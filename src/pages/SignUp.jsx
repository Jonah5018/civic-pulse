import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { UserRound, Mail, Lock, Loader2, ArrowLeft } from "lucide-react";

import FloatingField from "../components/FloatingField";
import RadarField from "../components/RadarField";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function SignUp() {
  const { t } = useLanguage();
  const { signUp, isAuthenticated, isAdmin, isDemoMode } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate(isAdmin ? "/dashboard" : "/", { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t.signup.passwordMismatch);
      return;
    }

    setSubmitting(true);
    setError("");
    const { error } = await signUp(email, password, fullName);
    setSubmitting(false);

    if (error) {
      setError(error.message || t.toast.loginError);
      toast.error(error.message || t.toast.loginError);
      return;
    }

    toast.success(t.signup.success);
    if (isDemoMode) {
      navigate("/dashboard", { replace: true });
    }
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
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan/30 bg-cyan-soft/20">
            <UserRound className="h-7 w-7 text-cyan" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold">{t.signup.title}</h1>
          <p className="mt-2 text-sm text-slate-200">{t.signup.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <FloatingField
            label={t.signup.fullName}
            icon={UserRound}
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <FloatingField
            label={t.signup.email}
            type="email"
            icon={Mail}
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FloatingField
            label={t.signup.password}
            type="password"
            icon={Lock}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FloatingField
            label={t.signup.confirmPassword}
            type="password"
            icon={Lock}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error ? <p className="rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">{error}</p> : null}

          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-emerald px-5 py-3.5 text-sm font-semibold text-[#04120c] shadow-[0_0_30px_-6px_rgba(41,211,245,0.55)] disabled:opacity-70"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? t.signup.submitting : t.signup.submit}
          </motion.button>
        </form>

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {t.signup.alreadyHaveAccount}
        </Link>
      </motion.div>
    </div>
  );
}
