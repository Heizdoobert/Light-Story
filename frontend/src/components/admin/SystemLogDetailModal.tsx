"use client";

import { useState } from 'react';
import { X, Copy, Check, Terminal, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { LogEntry } from '@/sdk/logger/types';
import { useLanguage } from '@/context/LanguageContext';

export interface SystemLogDetailModalProps {
  log: LogEntry | null;
  onClose: () => void;
}

export function SystemLogDetailModal({ log, onClose }: SystemLogDetailModalProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  const handleCopyJson = async () => {
    try {
      const fullJson = JSON.stringify(log, null, 2);
      await navigator.clipboard.writeText(fullJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard write errors
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <AlertCircle size={13} />
            ERROR
          </span>
        );
      case 'warn':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <AlertTriangle size={13} />
            WARN
          </span>
        );
      case 'info':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
            <Info size={13} />
            INFO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            <Terminal size={13} />
            DEBUG
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-log-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            {getLevelBadge(log.level)}
            <h2 id="system-log-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('log_detail_title')}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
              {log.service ?? 'default'}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Message */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('log_col_message')}
            </span>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono text-slate-800 dark:text-slate-200 break-words">
              {log.message}
            </div>
          </div>

          {/* Context Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl">
              <span className="text-slate-500 block mb-0.5">{t('log_col_time')}</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl">
              <span className="text-slate-500 block mb-0.5">Request ID</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {log.request_id || '—'}
              </span>
            </div>
          </div>

          {/* Stack Trace */}
          {log.error_stack && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">
                {t('log_detail_stack')}
              </span>
              <pre className="p-4 bg-slate-950 text-rose-300 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre border border-rose-950/50">
                {log.error_stack}
              </pre>
            </div>
          )}

          {/* Metadata JSON */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('log_detail_metadata')}
              </span>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-500 dark:hover:text-orange-400 font-medium transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                {copied ? t('log_detail_copied') : t('log_detail_copy')}
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-emerald-300 rounded-xl text-xs font-mono overflow-x-auto max-h-60 border border-slate-800">
              {JSON.stringify(log.metadata ?? {}, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
