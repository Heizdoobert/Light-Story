// src/lib/sdk/authHooks.tsx
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../supabase/client";
import type { Session } from "@supabase/supabase-js";
import { useAuthState } from "./authContext";

/**
 * Hook to sign up a user with email/password.
 * Returns a mutation object that resolves with the Supabase session.
 */
export const useSignUp = () => {
  const queryClient = useQueryClient();
  const supabase = createClient();
  return useMutation<Session, Error, { email: string; password: string }>(
    async ({ email, password }) => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data?.session) throw new Error("No session returned after sign‑up");
      return data.session;
    },
    {
      onSuccess: (session) => {
        queryClient.setQueryData(["auth", "session"], session);
      },
    }
  );
};

/** Hook to sign in a user with email/password. */
export const useSignIn = () => {
  const queryClient = useQueryClient();
  const supabase = createClient();
  return useMutation<Session, Error, { email: string; password: string }>(
    async ({ email, password }) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data?.session) throw new Error("No session returned after sign‑in");
      return data.session;
    },
    {
      onSuccess: (session) => {
        queryClient.setQueryData(["auth", "session"], session);
      },
    }
  );
};

/** Hook to sign out the current user. */
export const useSignOut = () => {
  const queryClient = useQueryClient();
  const supabase = createClient();
  return useMutation<void, Error>(
    async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    {
      onSuccess: () => {
        queryClient.removeQueries(["auth", "session"]);
        queryClient.removeQueries(["auth", "user"]);
      },
    }
  );
};

/** Hook to get the current authenticated user from context. */
export const useUser = () => {
  const { user, loading } = useAuthState();
  return { user, loading };
};

/** Utility function version of sign‑up (non‑hook) for non‑React code. */
export const signUp = async (email: string, password: string): Promise<Session> => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data?.session) throw new Error("No session returned after sign‑up");
  return data.session;
};

/** Utility function version of sign‑in. */
export const signIn = async (email: string, password: string): Promise<Session> => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data?.session) throw new Error("No session returned after sign‑in");
  return data.session;
};

/** Utility function version of sign‑out. */
export const signOut = async (): Promise<void> => {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
