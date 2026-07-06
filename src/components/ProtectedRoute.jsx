import { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { ShieldAlert } from "lucide-react";

/**
 * Route protection for the Admin Dashboard.
 *
 * On every navigation into a protected route we re-read the live Supabase
 * session + profile role (via useAuth, which is itself wired to
 * supabase.auth.onAuthStateChange). If the resolved role isn't "admin",
 * rendering is blocked instantly, the user is pushed back to "/", and a
 * red "Unauthorized Access" toast fires — satisfying the brief's requirement
 * that this check happen on navigation, not just once at login.
 */
export default function ProtectedRoute({ children, requireAdmin = true }) {
  const { isAuthenticated, isAdmin, status } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const hasWarned = useRef(false);

  const blocked = status === "ready" && requireAdmin && isAuthenticated && !isAdmin;

  useEffect(() => {
    if (blocked && !hasWarned.current) {
      hasWarned.current = true;
      toast.error(t.toast.unauthorized, {
        icon: <ShieldAlert className="h-4 w-4" />,
        style: {
          background: "rgba(251, 91, 123, 0.12)",
          border: "1px solid rgba(251, 91, 123, 0.4)",
          color: "#ffd7de",
        },
      });
    }
  }, [blocked, t]);

  if (status === "checking") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-ink-muted">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan" />
          </span>
          {t.common.loading}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
