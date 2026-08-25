"use client";

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** 'dark' matches the always-dark admin palette (slate-900); default adapts to theme. */
  variant?: 'light' | 'dark';
}

export function Modal({ isOpen, onClose, title, children, className, variant = 'light' }: ModalProps) {
  const titleId = React.useId();
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (isOpen) {
      const previouslyFocused = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';
      closeRef.current?.focus();
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCloseRef.current();
          return;
        }
        if (e.key !== 'Tab') return;
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', onKeyDown);
        previouslyFocused?.focus();
      };
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const dark = variant === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          'relative z-10 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto',
          dark
            ? 'bg-slate-900 border border-slate-800 text-white'
            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
          className
        )}
      >
        <div
          className={cn(
            'flex items-center justify-between pb-4 border-b mb-4',
            dark ? 'border-slate-800' : 'border-slate-100 dark:border-slate-800'
          )}
        >
          {title && (
            <h3 id={titleId} className={cn('text-lg font-bold', dark ? 'text-white' : 'text-slate-900 dark:text-slate-100')}>
              {title}
            </h3>
          )}
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Đóng"
            className={cn(
              'p-1 rounded-lg text-slate-400 transition-colors',
              dark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600'
            )}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
