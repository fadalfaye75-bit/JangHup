import React from 'react';
import { motion } from 'motion/react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'danger' | 'info' | 'warning' | 'secondary';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-accent/10 text-accent border-accent/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    info: 'bg-info/10 text-info border-info/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    secondary: 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-main)]',
  };

  return (
    <motion.span
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`badge-standard border ${variants[variant]} ${className}`}
    >
      {children}
    </motion.span>
  );
};
