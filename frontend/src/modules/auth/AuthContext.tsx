// This file manages the global authentication state and Role-Based Access Control (RBAC)
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../core/supabase";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { getErrorMessage } from "../../lib/errorUtils";

export type UserRole = "superadmin" | "admin" | "employee" | "user";

const USER_ROLES: UserRole[] = ["superadmin", "admin", "employee", "user"];

const isUserRole = (value: unknown): value is UserRole =>
  typeof value === "string" && USER_ROLES.includes(value as UserRole);

const resolveRole = (user: User | null, profileRole?: unknown): UserRole | null => {
  const appRole = user?.app_metadata?.role;

  if (isUserRole(appRole)) return appRole;
  if (isUserRole(profileRole)) return profileRole;
  return null;
};

const buildProfile = (user: User, profileData?: any) => ({
  ...(profileData || {}),
  id: profileData?.id ?? user.id,
  email: profileData?.email ?? user.email ?? "",
  full_name:
    profileData?.full_name ??
    user.user_metadata?.full_name ??
    user.email ??
    "Admin",
  avatar_url:
    profileData?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
  role: resolveRole(user, profileData?.role),
});

const PROFILE_SELECT = "id,email,full_name,avatar_url,role";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole | string | null;
};

interface AuthContextType {
  user: User | null;
  profile: any | null;
  role: UserRole | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  register: (
    email: string,
    password: string,
    full_name: string,
  ) => Promise<void>;
  updateProfile: (payload: {
    full_name?: string;
    avatar_url?: string | null;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user);
      else setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (authUser: User) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(buildProfile(authUser, data as ProfileRow | undefined));
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(buildProfile(authUser));
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    if (!supabase) return;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error("Login error:", error.message);
      toast.error(getErrorMessage(error));
    }
  };

  const signInWithEmail = async (email: string) => {
    if (!supabase) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error("Login error:", error.message);
      toast.error(getErrorMessage(error));
      throw error;
    } else {
      toast.info(
        "Check your email for the sign-in link (Magic Link)!",
      );
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) return;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error.message);
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const register = async (
    email: string,
    password: string,
    full_name: string,
  ) => {
    if (!supabase) return;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
        },
      },
    });

    if (error) {
      console.error("Register error: ", error.message);
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const updateProfile = async (payload: {
    full_name?: string;
    avatar_url?: string | null;
  }) => {
    if (!supabase || !user) return;

    const updates: {
      full_name?: string;
      avatar_url?: string | null;
    } = {};

    if (payload.full_name !== undefined) {
      updates.full_name = payload.full_name;
    }

    if (payload.avatar_url !== undefined) {
      updates.avatar_url = payload.avatar_url;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      throw error;
    }

    const { data: freshProfile, error: refreshError } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", user.id)
      .maybeSingle();

    if (refreshError) {
      setProfile((prev: any) => ({
        ...(prev || {}),
        ...updates,
        id: prev?.id ?? user.id,
        email: prev?.email ?? user.email ?? "",
        role: prev?.role ?? resolveRole(user, prev?.role),
      }));
      return;
    }

    setProfile(buildProfile(user, freshProfile as ProfileRow | undefined));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: resolveRole(user, profile?.role),
        loading,
        signIn,
        signInWithEmail,
        signInWithPassword,
        signOut,
        register,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
