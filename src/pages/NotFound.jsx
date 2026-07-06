import { Link } from "react-router";
import { motion } from "motion/react";
import { RadarIcon, ArrowLeft } from "lucide-react";
import RadarField from "../components/RadarField";
import { useLanguage } from "../context/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden px-4 text-center">
      <RadarField className="opacity-60" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border-strong bg-surface/60">
          <RadarIcon className="h-7 w-7 text-ink-faint" />
        </span>
        <p className="mt-6 font-display text-6xl font-bold text-gradient">404</p>
        <h1 className="mt-2 font-display text-xl font-semibold">{t.notFound.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t.notFound.subtitle}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl border border-emerald/30 bg-emerald-soft/30 px-4 py-2.5 text-sm font-medium text-emerald transition-colors hover:border-emerald/60"
        >
          <ArrowLeft className="h-4 w-4" /> {t.notFound.cta}
        </Link>
      </motion.div>
    </div>
  );
}
