// src/lib/sdk/index.ts

// Export SDK members with the `sdk` prefix as decided.

export { AuthProvider as sdkAuthProvider } from "./authContext";
export { useAuthState as sdkUseAuthState } from "./authContext";

export {
  useSignUp as sdkUseSignUp,
  useSignIn as sdkUseSignIn,
  useSignOut as sdkUseSignOut,
  useUser as sdkUseUser,
  signUp as sdkSignUp,
  signIn as sdkSignIn,
  signOut as sdkSignOut,
} from "./authHooks";

export {
  useSupabaseQuery as sdkUseSupabaseQuery,
  useSupabaseMutation as sdkUseSupabaseMutation,
} from "./supabaseQuery";
