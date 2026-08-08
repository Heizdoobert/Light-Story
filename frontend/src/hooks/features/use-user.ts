"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants/routes";
import type { User } from "@supabase/supabase-js";

type ProfileRow = {
  role: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

const ADMIN_ROLES = ["superadmin", "admin", "employee", "internal"];

function resolveRole(role: unknown): string | null {
  if (typeof role === "string" && role.trim()) {
    return role.trim().toLowerCase();
  }
  return null;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [role, setRole] = useState<string | null>("user");
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        setUser(currentUser);
        // Role source mirrors middleware.ts: app_metadata.role preferred
        // (synced by the DB trigger), user_metadata fallback, profiles last.
        const resolvedRole =
          resolveRole(currentUser.app_metadata?.role) ??
          resolveRole(currentUser.user_metadata?.role);
        const { data: prof } = await supabase
          .from("profiles")
          .select("role, full_name, avatar_url")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (prof) {
          setProfile(prof);
          setRole(resolvedRole ?? resolveRole(prof.role) ?? "user");
        } else {
          setProfile(null);
          setRole(resolvedRole ?? "user");
        }
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
    } catch (err) {
      console.error("Error fetching user session:", err);
      setUser(null);
      setProfile(null);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();

    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadSession();
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadSession]);

  const signOut = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut({ scope: "global" });
    } catch (err) {
      console.error("SignOut error:", err);
    } finally {
      setUser(null);
      setProfile(null);
      setRole(null);

      // Clean stale auth tokens from browser storage to ensure next login is fresh
      if (typeof window !== "undefined") {
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          console.error("Error clearing local storage auth tokens:", e);
        }

        setTimeout(() => {
          window.location.href = ROUTES.HOME;
        }, 2000);
      }
    }
  };

  const signIn = async () => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signInWithEmail = async (email: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signInWithPassword = async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    await loadSession();
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
  ) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const sendPasswordReset = async (email: string) => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  };

  return {
    user,
    profile,
    role,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: role === "superadmin" || role === "admin",
    isStaff: !!role && ADMIN_ROLES.includes(role),
    signIn,
    signInWithEmail,
    signInWithPassword,
    register,
    sendPasswordReset,
    signOut,
  };
}
