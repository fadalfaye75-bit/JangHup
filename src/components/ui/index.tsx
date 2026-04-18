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
export * from './SwipeAction';

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

export const Shimmer: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("relative overflow-hidden bg-slate-200 dark:bg-slate-800 rounded-xl", className)}>
    <motion.div
      animate={{ x: ['-100%', '200%'] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent skew-x-12"
    />
  </div>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => <Shimmer className={className} />;

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
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 100 || velocity.y > 500) {
                onClose();
              }
            }}
            className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 touch-pan-x"
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
    success: <CheckCircle2 size={18} className="text-emerald-500" />,
    error: <AlertCircle size={18} className="text-rose-500" />,
    info: <Info size={18} className="text-blue-500" />
  };

  const bgStyles = {
    success: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/50',
    error: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/50',
    info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-800/50'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 }, filter: 'blur(8px)' }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-[200]"
        >
          <div className={cn(
            "flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md border",
            bgStyles[type]
          )}>
            <div className="shrink-0">{icons[type]}</div>
            <p className="text-[14px] font-bold text-[var(--text-main)] pr-2">{message}</p>
            <button 
              onClick={onClose}
              className="ml-auto p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              <X size={16} />
            </button>
            
            {/* Progress line */}
            {duration > 0 && (
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
                className={cn(
                  "absolute bottom-0 left-0 h-1 rounded-full opacity-40",
                  type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-rose-500' : 'bg-blue-500'
                )}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
