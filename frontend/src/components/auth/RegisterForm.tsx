"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/hooks/features/use-user";
import { resetPasswordSchema } from "@/lib/schemas/auth";
import { ROUTES } from "@/lib/constants/routes";
import {
  AuthField,
  AuthFormShell,
  authFooterLinkClass,
} from "./AuthFormShell";

export function RegisterForm() {
  const { register } = useUser();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!fullName.trim()) {
        toast.error("Please enter your full name");
        return;
      }
      const pw = resetPasswordSchema.safeParse({ password, confirmPassword });
      if (!pw.success) {
        toast.error(pw.error.issues[0].message);
        return;
      }
      await register(email, password, fullName.trim());
      toast.success(
        "Registration successful. Please check your email to verify your account.",
      );
      setRegistered(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Authentication failed. Please check your credentials.";
      toast.error(message || "Authentication failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registered) {
    return (
      <AuthFormShell
        title="Create account"
        subtitle="Register as a user account. Admin roles are assigned by superadmin."
        submitLabel="Create Account"
        submitIcon={UserPlus}
        isSubmitting={false}
        onSubmit={(e) => e.preventDefault()}
        footer={
          <Link href={ROUTES.LOGIN} className={authFooterLinkClass}>
            Sign in
          </Link>
        }
      >
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Registration successful. Please check your email to verify your
          account.
        </p>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title="Create account"
      subtitle="Register as a user account. Admin roles are assigned by superadmin."
      submitLabel="Create Account"
      submitIcon={UserPlus}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      footer={
        <Link href={ROUTES.LOGIN} className={authFooterLinkClass}>
          Sign in
        </Link>
      }
    >
      <AuthField
        label="Full Name"
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Your name"
      />
      <AuthField
        label="Email Address"
        icon={Mail}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <AuthField
        label="Password"
        icon={Lock}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
      />
      <AuthField
        label="Confirm Password"
        icon={KeyRound}
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="••••••••"
      />
    </AuthFormShell>
  );
}
