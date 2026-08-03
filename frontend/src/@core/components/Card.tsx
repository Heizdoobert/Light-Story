"use client";

import type { ReactNode, HTMLAttributes, FC } from 'react';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  variant?: 'default' | 'outlined' | 'glass';
}

export const CoreCard: FC<CardProps> = ({
  title,
  subtitle,
  action,
  footer,
  children,
  className = '',
  variant = 'default',
  ...props
}) => {
  const baseStyles = "rounded-xl transition-all duration-200 overflow-hidden";
  const variants = {
    default: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md",
    outlined: "bg-transparent border border-slate-300 dark:border-slate-700",
    glass: "bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/20 dark:border-slate-800/50 shadow-xl",
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            {title && <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && (
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          {footer}
        </div>
      )}
    </div>
  );
};

export default CoreCard;
