import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'danger' | 'info' | 'warning' | 'secondary';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800/50',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800/50',
    danger: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800/50',
    info: 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800/50',
    warning: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800/50',
    secondary: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
