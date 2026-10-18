// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { config } from "@/lib/config";

/**
 * NextAuth configuration for Light‑Story.
 * Using a simple Credentials provider for now – replace with real auth (e.g., Supabase) later.
 */
export const authOptions = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      // The credentials object defines the form fields shown on the sign‑in page.
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // In a real app, verify credentials against a user store.
        // Here we accept any non‑empty credentials for demonstration.
        const schema = z.object({
          email: z.string().email(),
          password: z.string().min(1),
        });
        try {
          const parsed = schema.parse(credentials);
          // Return a minimal user object.
          return { id: parsed.email, email: parsed.email, name: parsed.email.split("@")[0] };
        } catch {
          return null; // Authentication failed.
        }
      },
    }),
  ],
  secret: config.NEXTAUTH_SECRET,
  callbacks: {
    // Attach the user ID to the JWT so it can be read in getServerSession.
    async jwt({ token, user }) {
      if (user) token.id = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      if (token && typeof token === "object") {
        (session as any).user.id = (token as any).id;
      }
      return session;
    },
  },
  // Use a strict cookie policy for security.
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
  },
});

// Export the handler for the App Router.
export { GET, POST } from "next-auth/react";
