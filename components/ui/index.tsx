import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Loader2, X, CheckCircle2, Info, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Card: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }> = ({ children, className, style, onClick }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={onClick ? { y: -8, scale: 1.02, transition: { type: 'spring', stiffness: 300 } } : {}}
    className={cn("card-futuristic", className)}
    style={style}
    onClick={onClick}
  >
    {children}
  </motion.div>
);

export const Badge: React.FC<{ children: React.ReactNode; type?: 'info' | 'success' | 'warning' | 'danger' | 'primary'; className?: string }> = ({ children, type = 'info', className }) => {
  const styles = {
    info: 'badge-info',
    success: 'badge-normal',
    warning: 'badge-important',
    danger: 'badge-urgent',
    primary: 'bg-primary/10 text-primary border-primary/20',
  };
  return (
    <span className={cn("badge-futuristic", styles[type], className)}>
      {children}
    </span>
  );
};

export const Btn: React.FC<any> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  loading, 
  className, 
  ...props 
}) => {
  const variants: Record<string, string> = {
    primary: 'btn-futuristic-primary',
    secondary: 'btn-futuristic-secondary',
    ghost: 'btn-futuristic-ghost',
    danger: 'btn-futuristic-danger',
  };
  const sizes: Record<string, string> = {
    sm: 'px-4 py-2 text-xs rounded-xl',
    md: 'px-8 py-3 text-sm rounded-2xl',
    lg: 'px-10 py-4 text-base rounded-3xl',
  };
  return (
    <motion.button 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn("btn-futuristic", variants[variant] || variants.primary, sizes[size] || sizes.md, className)} 
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
  <div className={cn("animate-pulse bg-slate-200/50 dark:bg-white/5 rounded-2xl", className)} />
);

export const ErrBox: React.FC<{ message: string }> = ({ message }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger flex items-center gap-3 text-sm font-medium backdrop-blur-md"
  >
    <AlertCircle size={20} />
    {message}
  </motion.div>
);

export const SecHdr: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
    <div className="space-y-2">
      <h2 className="heading-futuristic">{title}</h2>
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
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-card rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
          >
            <div className="px-8 py-6 border-b border-[var(--border-main)] flex items-center justify-between">
              <h3 className="text-xl font-bold">{title}</h3>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
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
      <div className="space-y-8">
        <div className="flex items-center gap-5 p-5 glass-card rounded-2xl">
          <div className={cn(
            "p-3.5 rounded-xl shrink-0",
            type === 'danger' ? 'bg-danger/10 text-danger' : 
            type === 'warning' ? 'bg-warning/10 text-warning' : 
            'bg-info/10 text-info'
          )}>
            <AlertCircle size={28} />
          </div>
          <p className="text-sm font-medium text-[var(--text-secondary)] leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex gap-4">
          <Btn
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            {cancelText}
          </Btn>
          <Btn
            variant={type === 'danger' ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1"
          >
            {confirmText}
          </Btn>
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
    success: <CheckCircle2 size={20} className="text-success" />,
    error: <AlertCircle size={20} className="text-danger" />,
    info: <Info size={20} className="text-info" />
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
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-6 right-6 z-[200]"
        >
          <div className={cn(
            "glass-card flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl",
            styles[type]
          )}>
            {icons[type]}
            <p className="text-sm font-bold">{message}</p>
            <button 
              onClick={onClose}
              className="ml-2 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
