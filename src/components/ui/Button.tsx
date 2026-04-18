import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface ButtonProps extends Omit<React.AllHTMLAttributes<HTMLElement>, 'as' | 'size'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  as?: any;
  whileHover?: any;
  whileTap?: any;
  transition?: any;
}

export const Button = React.forwardRef<any, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, as, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none gap-2";

    const variants = {
      primary: "bg-[var(--color-primary)] text-white hover:opacity-90 shadow-[0_2px_10px_-3px_rgba(108,99,255,0.4)]",
      secondary: "bg-[var(--bg-secondary)] text-[var(--text-main)] border border-[var(--border-main)] hover:bg-[var(--bg-main)] shadow-sm",
      danger: "bg-[var(--color-danger)] text-white hover:opacity-90 shadow-[0_2px_10px_-3px_rgba(255,71,87,0.4)]",
      ghost: "bg-transparent text-[var(--text-main)] hover:bg-[var(--border-main)]/20"
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs min-h-[36px]",
      md: "px-4 py-2 text-sm min-h-[44px]",
      lg: "px-6 py-3 text-base min-h-[52px]"
    };

    const Component = as ? (motion as any)[as] : motion.button;

    return (
      <Component
        ref={ref}
        whileHover={!isLoading && !(props as any).disabled ? { scale: 1.02 } : {}}
        whileTap={!isLoading && !(props as any).disabled ? { scale: 0.96 } : {}}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading || (props as any).disabled}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </Component>
    );
  }
);
Button.displayName = 'Button';
