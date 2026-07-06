import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router";
import { AnimatePresence } from "motion/react";

import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import Navbar from "./components/Navbar";
import AppToaster from "./components/AppToaster";
import ProtectedRoute from "./components/ProtectedRoute";
import PageTransition from "./components/PageTransition";

import Home from "./pages/Home";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";
import MapPage from "./pages/MapPage";
import ProfilePage from "./pages/ProfilePage";
import UserManagementPage from "./pages/UserManagementPage";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

function DashboardFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-ink-muted text-sm">
      Loading Mission Control…
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><SignUp /></PageTransition>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Suspense fallback={<DashboardFallback />}>
                  <AdminDashboard />
                </Suspense>
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <PageTransition>
                <MapPage />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute requireAdmin={false}>
              <PageTransition>
                <ProfilePage />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <PageTransition>
                <UserManagementPage />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border-soft/70 px-4 py-6 text-center text-xs text-ink-faint sm:px-6">
      {t.appName} · {t.footer.builtFor}
    </footer>
  );
}

function Shell() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <AnimatedRoutes />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Shell />
          <AppToaster />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
