"use client";

// ponytail: thin adapter over the canonical AuthContext — removes the second
// live auth implementation (divergent role semantics, double subscriptions).
import { useAuth } from "@/context/AuthContext";

const ADMIN_ROLES = ["superadmin", "admin", "employee"];

export function useUser() {
  const {
    user,
    profile,
    role,
    loading,
    signIn,
    signInWithEmail,
    signInWithPassword,
    sendPasswordReset,
    signOut,
    register,
  } = useAuth();

  // Preserve legacy default: logged-in user with no resolvable role = "user".
  const resolvedRole = role ?? (user ? "user" : null);

  return {
    user,
    profile,
    role: resolvedRole,
    isLoading: loading,
    isAuthenticated: !!user,
    isAdmin: resolvedRole === "superadmin" || resolvedRole === "admin",
    isStaff: !!resolvedRole && ADMIN_ROLES.includes(resolvedRole),
    signIn,
    signInWithEmail,
    signInWithPassword,
    sendPasswordReset,
    signOut,
    register,
  };
}
