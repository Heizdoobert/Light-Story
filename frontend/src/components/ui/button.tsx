"use client";

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-orange-500 hover:bg-orange-600 text-white dark:bg-[#001eff] dark:hover:bg-[#8900ff] shadow-sm',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100',
      outline: 'border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
      danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
      ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg',
      md: 'px-4 py-2 text-sm font-bold rounded-xl',
      lg: 'px-6 py-3 text-base font-extrabold rounded-2xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-[#001eff] disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
