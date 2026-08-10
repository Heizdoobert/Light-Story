"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Mail,
  Lock,
  Loader2,
  LogIn,
  UserPlus,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/features/use-user";
import { useLanguage } from "@/context/LanguageContext";
import { resetPasswordSchema, signInPasswordSchema } from "@/lib/schemas/auth";

type AuthMode = "signin" | "register" | "forgot";

export default function LoginModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const {
    signIn,
    signInWithEmail,
    signInWithPassword,
    register,
    sendPasswordReset,
  } = useUser();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetLocalState = () => {
    setMode("signin");
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetLocalState();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // ponytail: handleClose identity changes per render; isOpen gate keeps it fresh
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === "signin") {
        const pw = signInPasswordSchema.safeParse(password);
        if (!pw.success) {
          toast.error(pw.error.issues[0].message);
          return;
        }
        await signInWithPassword(email, password);
        toast.success("Signed in successfully");
        handleClose();
        router.refresh();
      } else if (mode === "register") {
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
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
      } else {
        await sendPasswordReset(email);
        toast.success("Password reset email sent. Please check your inbox.");
        setMode("signin");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Authentication failed. Please check your credentials.";
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

  const titles: Record<
    AuthMode,
    { title: string; subtitle: string; submit: string }
  > = {
    signin: {
      title: t("auth_welcome_back"),
      subtitle: t("auth_sign_in_subtitle"),
      submit: t("auth_sign_in"),
    },
    register: {
      title: t("auth_create_account"),
      subtitle: t("auth_create_account_subtitle"),
      submit: t("auth_create_account"),
    },
    forgot: {
      title: t("auth_reset_password_title"),
      subtitle: t("auth_reset_password_subtitle"),
      submit: t("auth_send_reset_link"),
    },
  };

  const current = titles[mode];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-y-auto max-h-[90vh] border border-white/20"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {current.title}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                    {current.subtitle}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {mode === "register" && (
                  <div>
                    <label htmlFor="modal-full-name" className="text-[10px] font-bold uppercase tracking-wide text-slate-400 ml-1">
                      {t("auth_full_name")}
                    </label>
                    <input
                      id="modal-full-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-4 text-sm font-bold focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 mt-2"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="modal-email" className="text-[10px] font-bold uppercase tracking-wide text-slate-400 ml-1">
                    {t("auth_email_address")}
                  </label>
                  <div className="relative mt-2">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="modal-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {mode !== "forgot" && (
                  <div>
                    <label htmlFor="modal-password" className="text-[10px] font-bold uppercase tracking-wide text-slate-400 ml-1">
                      {t("auth_password")}
                    </label>
                    <div className="relative mt-2">
                      <Lock
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        id="modal-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                )}

                {mode === "register" && (
                  <div>
                    <label htmlFor="modal-confirm-password" className="text-[10px] font-bold uppercase tracking-wide text-slate-400 ml-1">
                      {t("auth_confirm_password")}
                    </label>
                    <div className="relative mt-2">
                      <KeyRound
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        id="modal-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 dark:bg-cyan-400 py-4 rounded-2xl text-white dark:text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : mode === "signin" ? (
                    <LogIn size={18} />
                  ) : mode === "register" ? (
                    <UserPlus size={18} />
                  ) : (
                    <Mail size={18} />
                  )}
                  {current.submit}
                </button>

                {mode === "signin" && (
                  <>
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
                  </>
                )}
              </form>

              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-center gap-3 text-xs font-bold">
                  {mode !== "signin" && (
                    <button
                      onClick={() => setMode("signin")}
                      className="text-slate-500 hover:text-primary transition-colors"
                    >
                      {t("auth_sign_in_link")}
                    </button>
                  )}
                  {mode !== "register" && (
                    <button
                      onClick={() => setMode("register")}
                      className="text-slate-500 hover:text-primary transition-colors"
                    >
                      {t("auth_register")}
                    </button>
                  )}
                  {mode !== "forgot" && (
                    <button
                      onClick={() => setMode("forgot")}
                      className="text-slate-500 hover:text-primary transition-colors"
                    >
                      {t("auth_forgot_password")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
