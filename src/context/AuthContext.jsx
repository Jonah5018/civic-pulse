import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  // "checking" -> session not resolved yet, "ready" -> resolved (session may be null)
  const [status, setStatus] = useState("checking");

  const isSupabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      !String(import.meta.env.VITE_SUPABASE_URL).includes("example.supabase.co")
  );
  const shouldUseDemoAuth = import.meta.env.DEV && !isSupabaseConfigured;

  const activateDemoSession = useCallback((displayName = "Demo Admin") => {
    setSession({ user: { id: "demo-user", email: "demo@civicpulse.test" } });
    setProfile({ id: "demo-user", role: "admin", full_name: displayName });
    setStatus("ready");
  }, []);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    // RBAC lives here: every user's role is read from the `profiles` table,
    // which is protected by Row Level Security (see supabase/schema.sql).
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", userId)
      .single();

    if (error) {
      console.warn("[CivicPulse] Could not load profile/role:", error.message);
      setProfile(null);
      return;
    }
    setProfile(data);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (shouldUseDemoAuth) {
      activateDemoSession();
      return () => {
        isMounted = false;
      };
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        await loadProfile(data.session.user.id);
      }
      setStatus("ready");
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      if (newSession?.user?.id) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      setStatus("ready");
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [activateDemoSession, loadProfile, shouldUseDemoAuth]);

  const signIn = async (email, password) => {
    if (shouldUseDemoAuth) {
      activateDemoSession(email || "Demo Admin");
      return { data: { session: { user: { id: "demo-user" } } }, error: null };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.session?.user?.id) {
      await loadProfile(data.session.user.id);
    }
    return { data, error };
  };

  const signUp = async (email, password, fullName = "") => {
    if (shouldUseDemoAuth) {
      activateDemoSession(fullName || email || "Demo Admin");
      return { data: { session: { user: { id: "demo-user" } } }, error: null };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (!error && data?.session?.user?.id) {
      await loadProfile(data.session.user.id);
    }
    return { data, error };
  };

  const signOut = async () => {
    if (shouldUseDemoAuth) {
      setSession(null);
      setProfile(null);
      setStatus("ready");
      return;
    }
    await supabase.auth.signOut();
    setProfile(null);
  };

  const role = profile?.role ?? null;

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role,
    isAdmin: role === "admin",
    isAuthenticated: !!session,
    status, // "checking" | "ready"
    signIn,
    signUp,
    signOut,
    isDemoMode: shouldUseDemoAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
