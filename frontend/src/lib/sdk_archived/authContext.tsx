// src/lib/sdk/authContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "../supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  const supabase = createClient();

  // Helper to persist session token
  const persistSession = (session: Session | null) => {
    if (session) {
      // localStorage persistence (client‑side)
      localStorage.setItem("sb-session", JSON.stringify(session));
      // HttpOnly cookie fallback is handled on the server side via an API route.
      // Here we just fire a request to set the cookie.
      fetch("/api/auth/set-cookie", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }),
      }).catch(() => {});
    } else {
      localStorage.removeItem("sb-session");
      fetch("/api/auth/clear-cookie", { method: "POST", credentials: "include" }).catch(() => {});
    }
  };

  useEffect(() => {
    // Initialise from localStorage if present (useful on page reloads)
    const stored = localStorage.getItem("sb-session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Session;
        setState({ user: parsed.user, session: parsed, loading: false });
      } catch {}
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setState({ user: session.user, session, loading: false });
      } else {
        setState({ user: null, session: null, loading: false });
      }
      persistSession(session);
    });
    // Clean up listener on unmount
    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};

export const useAuthState = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthState must be used within an AuthProvider");
  }
  return ctx;
};

export default AuthProvider;
