import { motion, AnimatePresence } from "motion/react";
import { X, MapPin, Mic, ShieldAlert } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

/**
 * Friendly, non-scary modal shown when the browser blocks a permission
 * (location or microphone). Instead of a red error, it explains how to
 * re-enable the permission from the address-bar site icon and reassures the
 * user that the manual text/dropdown inputs are a fine fallback.
 */
export default function PermissionHelpModal({ open, onClose, type = "location" }) {
  const { t } = useLanguage();
  const content = t.home.permissionHelp[type] ?? t.home.permissionHelp.location;
  const Icon = type === "microphone" ? Mic : MapPin;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(4, 8, 16, 0.72)", backdropFilter: "blur(4px)" }}
          role="dialog"
          aria-modal="true"
          aria-label={content.title}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong w-full max-w-md rounded-3xl p-6"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber/30 bg-amber-soft/20 text-amber">
                <Icon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <h3 className="font-display text-base font-semibold text-ink">{content.title}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.common.close}
                className="rounded-full p-1 text-ink-faint transition-colors hover:bg-white/10 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-ink-muted">{content.body}</p>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-border-soft bg-surface/50 p-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
              <p className="text-xs leading-relaxed text-ink-faint">{content.fallback}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald to-cyan px-5 py-2.5 text-sm font-semibold text-[#04120c] transition-opacity hover:opacity-90"
            >
              {t.home.permissionGotIt}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
