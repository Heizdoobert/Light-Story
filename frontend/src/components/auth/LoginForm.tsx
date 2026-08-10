"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/hooks/features/use-user";
import { useLanguage } from "@/context/LanguageContext";
import { signInPasswordSchema } from "@/lib/schemas/auth";
import { ROUTES } from "@/lib/constants/routes";
import {
  AuthField,
  AuthFormShell,
  authFooterLinkClass,
} from "./AuthFormShell";

export function LoginForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const { signIn, signInWithEmail, signInWithPassword } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const pw = signInPasswordSchema.safeParse(password);
      if (!pw.success) {
        toast.error(pw.error.issues[0].message);
        return;
      }
      await signInWithPassword(email, password);
      toast.success("Signed in successfully");
      router.push(ROUTES.USER.DASHBOARD);
      router.refresh();
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

  const handleGoogle = async () => {
    setIsSubmitting(true);
    try {
      await signIn();
    } catch {
      // ignored
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      toast.error("Please enter your email first");
      return;
    }
    setIsSubmitting(true);
    try {
      await signInWithEmail(email);
      toast.success("Magic link sent. Please check your inbox.");
    } catch {
      // ignored
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormShell
      title={t("auth_welcome_back")}
      subtitle={t("auth_sign_in_subtitle")}
      submitLabel={t("auth_sign_in")}
      submitIcon={LogIn}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      footer={
        <>
          <Link href={ROUTES.REGISTER} className={authFooterLinkClass}>
            {t("auth_register")}
          </Link>
          <Link href={ROUTES.FORGET_PASSWORD} className={authFooterLinkClass}>
            {t("auth_forgot_password")}
          </Link>
        </>
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
      <AuthField
        label={t("auth_password")}
        icon={Lock}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
      />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-100 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-bold">
            {t("auth_or")}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleGoogle}
        disabled={isSubmitting}
        className="w-full border border-slate-200 dark:border-slate-700 py-3 rounded-2xl text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
      >
        {t("auth_continue_google")}
      </button>
      <button
        type="button"
        onClick={handleMagicLink}
        disabled={isSubmitting}
        className="w-full border border-slate-200 dark:border-slate-700 py-3 rounded-2xl text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
      >
        {t("auth_send_magic_link")}
      </button>
    </AuthFormShell>
  );
}
