import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Loader2, X, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

// ... existing components ...

export const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }> = ({ children, className, style, onClick }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn("card", onClick && "card-interactive", className)}
    style={style}
    onClick={onClick}
  >
    {children}
  </motion.div>
);

export const Badge: React.FC<{ children: React.ReactNode; type?: 'info' | 'success' | 'warning' | 'danger' | 'primary'; className?: string }> = ({ children, type = 'info', className }) => {
  const styles = {
    info: 'bg-info/10 text-info',
    success: 'bg-accent/10 text-accent',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    primary: 'bg-primary/10 text-primary',
  };
  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center", styles[type], className)}>
      {children}
    </span>
  );
};

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger', size?: 'sm' | 'md' | 'lg', loading?: boolean }> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  loading, 
  className, 
  ...props 
}) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: '',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <motion.button 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn("btn", variants[variant], sizes[size], className)} 
      disabled={loading || props.disabled} 
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : children}
    </motion.button>
  );
};

export const Spinner: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
  <Loader2 className={cn("animate-spin text-primary", className)} size={size} />
);

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl", className)} />
);

export const ErrBox: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 flex items-center gap-3 text-sm font-medium">
    <AlertCircle size={20} />
    {message}
  </div>
);

export const SecHdr: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
    <div>
      <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">{title}</h2>
      {subtitle && <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">{subtitle}</p>}
    </div>
    {action && <div className="flex shrink-0">{action}</div>}
  </div>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800"
      >
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-8">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export const ConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'danger'
}) => {
  const getColors = () => {
    switch (type) {
      case 'danger': return 'bg-rose-600 hover:bg-rose-700 shadow-rose-200';
      case 'warning': return 'bg-amber-500 hover:bg-amber-600 shadow-amber-200';
      default: return 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
          <div className={cn(
            "p-3 rounded-xl",
            type === 'danger' ? 'bg-rose-100 text-rose-600' : 
            type === 'warning' ? 'bg-amber-100 text-amber-600' : 
            'bg-indigo-100 text-indigo-600'
          )}>
            <AlertCircle size={24} />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "flex-1 py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-all hover:scale-105",
              getColors()
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export type ToastType = 'success' | 'error' | 'info';

export const Toast: React.FC<{
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}> = ({ message, type = 'info', isVisible, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const icons = {
    success: <CheckCircle2 size={20} className="text-emerald-500" />,
    error: <AlertCircle size={20} className="text-rose-500" />,
    info: <Info size={20} className="text-blue-500" />
  };

  const bgColors = {
    success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30',
    error: 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30'
  };

  const textColors = {
    success: 'text-emerald-700 dark:text-emerald-400',
    error: 'text-rose-700 dark:text-rose-400',
    info: 'text-blue-700 dark:text-blue-400'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-6 right-6 z-[200]"
        >
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md",
            bgColors[type]
          )}>
            {icons[type]}
            <p className={cn("text-sm font-bold", textColors[type])}>{message}</p>
            <button 
              onClick={onClose}
              className={cn("ml-2 p-1 rounded-lg hover:bg-black/5 transition-colors", textColors[type])}
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
