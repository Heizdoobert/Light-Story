"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";

const inputClass =
  "w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500";

export function AuthField({
  label,
  icon: Icon,
  id,
  ...props
}: {
  label: string;
  icon?: LucideIcon;
  id?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div>
      <label htmlFor={fieldId} className="text-[10px] font-bold uppercase tracking-wide text-slate-400 ml-1">
        {label}
      </label>
      <div className="relative mt-2">
        {Icon && (
          <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        )}
        <input id={fieldId} className={inputClass} {...props} />
      </div>
    </div>
  );
}

export function AuthFormShell({
  title,
  subtitle,
  submitLabel,
  submitIcon: SubmitIcon,
  isSubmitting,
  onSubmit,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  submitLabel: string;
  submitIcon: LucideIcon;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-y-auto max-h-[90vh] border border-white/20 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
            {subtitle}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {children}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 dark:bg-cyan-400 py-4 rounded-2xl text-white dark:text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:hover:scale-100"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <SubmitIcon size={18} />
            )}
            {submitLabel}
          </button>
        </form>

        {footer && (
          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-center gap-3 text-xs font-bold">
              {footer}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export const authFooterLinkClass =
  "text-slate-500 hover:text-primary transition-colors";
