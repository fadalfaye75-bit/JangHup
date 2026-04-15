import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
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
    const baseStyles = "btn-standard outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 ring-offset-[var(--bg-main)] inline-flex items-center justify-center";

    const variants = {
      primary: "btn-primary",
      secondary: "btn-secondary",
      danger: "btn-danger",
      ghost: "btn-ghost"
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-6 py-2.5 text-sm",
      lg: "px-8 py-3.5 text-base"
    };

    const Component = as ? (motion as any)[as] : motion.button;

    return (
      <Component
        ref={ref}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
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
