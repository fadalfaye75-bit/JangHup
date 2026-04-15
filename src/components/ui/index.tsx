import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Loader2, X, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export * from './GlassCard';
export * from './Button';
export * from './Input';
export * from './AppCard';
export * from './Avatar';

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'info' | 'success' | 'warning' | 'danger' | 'primary' | 'secondary'; className?: string }> = ({ children, variant = 'info', className }) => {
  const styles = {
    info: 'badge-info',
    success: 'badge-normal',
    warning: 'badge-important',
    danger: 'badge-urgent',
    primary: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-main)]',
  };
  return (
    <span className={cn("badge-standard border", styles[variant], className)}>
      {children}
    </span>
  );
};

// Legacy Btn component for compatibility, mapping to new Button
export const Btn: React.FC<any> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  loading, 
  className, 
  ...props 
}) => {
  return (
    <Button 
      variant={variant}
      size={size}
      isLoading={loading}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
};

export const Spinner: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
  <Loader2 className={cn("animate-spin text-primary", className)} size={size} />
);

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse bg-slate-200/50 dark:bg-white/5 rounded-xl", className)} />
);

export const ErrBox: React.FC<{ message: string }> = ({ message }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-4 bg-danger/5 border border-danger/10 rounded-xl text-danger flex items-center gap-3 text-sm font-medium"
  >
    <AlertCircle size={20} className="shrink-0" />
    <span>{message}</span>
  </motion.div>
);

export const SecHdr: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
    <div className="space-y-1">
      <h2 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">{title}</h2>
      {subtitle && <p className="text-[var(--text-secondary)] font-medium text-lg">{subtitle}</p>}
    </div>
    {action && <div className="flex shrink-0">{action}</div>}
  </div>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
          >
            <div className="px-6 py-4 border-b border-[var(--border-card)] flex items-center justify-between">
              <h3 className="text-lg font-bold">{title}</h3>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--bg-main)] text-[var(--text-muted)] transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <div className="flex items-start gap-4 p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-main)]">
          <div className={cn(
            "p-2.5 rounded-lg shrink-0",
            type === 'danger' ? 'bg-danger/10 text-danger' : 
            type === 'warning' ? 'bg-warning/10 text-warning' : 
            'bg-info/10 text-info'
          )}>
            <AlertCircle size={24} />
          </div>
          <p className="text-sm font-medium text-[var(--text-secondary)] leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={type === 'danger' ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1"
          >
            {confirmText}
          </Button>
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
    success: <CheckCircle2 size={18} className="text-success" />,
    error: <AlertCircle size={18} className="text-danger" />,
    info: <Info size={18} className="text-info" />
  };

  const styles = {
    success: 'border-success/20',
    error: 'border-danger/20',
    info: 'border-info/20'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-[200]"
        >
          <div className={cn(
            "bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl",
            styles[type]
          )}>
            {icons[type]}
            <p className="text-sm font-bold">{message}</p>
            <button 
              onClick={onClose}
              className="ml-2 p-1 rounded-lg hover:bg-[var(--bg-main)] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
