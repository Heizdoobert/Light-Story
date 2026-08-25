"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/hooks/features/use-user";
import { useLanguage } from "@/context/LanguageContext";
import { ROUTES } from "@/lib/constants/routes";
import {
  AuthField,
  AuthFormShell,
  authFooterLinkClass,
} from "./AuthFormShell";

export function ForgetPasswordForm() {
  const { sendPasswordReset } = useUser();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await sendPasswordReset(email);
      toast.success("Password reset email sent. Please check your inbox.");
      setSent(true);
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

  if (sent) {
    return (
      <AuthFormShell
        title={t("auth_reset_password_title")}
        subtitle={t("auth_reset_password_subtitle")}
        submitLabel={t("auth_send_reset_link")}
        submitIcon={KeyRound}
        isSubmitting={false}
        onSubmit={(e) => e.preventDefault()}
        footer={
          <Link href={ROUTES.LOGIN} className={authFooterLinkClass}>
            {t("auth_sign_in_link")}
          </Link>
        }
      >
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Password reset email sent. Please check your inbox.
        </p>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title={t("auth_reset_password_title")}
      subtitle={t("auth_reset_password_subtitle")}
      submitLabel={t("auth_send_reset_link")}
      submitIcon={KeyRound}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      footer={
        <Link href={ROUTES.LOGIN} className={authFooterLinkClass}>
          {t("auth_sign_in_link")}
        </Link>
      }
    >
      <AuthField
        label={t("auth_email_address")}
        icon={Mail}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
    </AuthFormShell>
  );
}
