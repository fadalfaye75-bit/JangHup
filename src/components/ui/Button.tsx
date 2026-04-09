import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const baseStyles = "relative inline-flex items-center justify-center font-medium rounded-xl transition-colors overflow-hidden outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-[#0f1115]";

    const variants = {
      primary: "bg-[#6C63FF] text-white hover:bg-[#5b54d6] focus:ring-[#6C63FF] shadow-[0_0_20px_rgba(108,99,255,0.3)] hover:shadow-[0_0_25px_rgba(108,99,255,0.5)]",
      secondary: "bg-white/10 dark:bg-white/5 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10 focus:ring-slate-400",
      danger: "bg-[#FF4757] text-white hover:bg-[#ff2e43] focus:ring-[#FF4757] shadow-[0_0_20px_rgba(255,71,87,0.3)] hover:shadow-[0_0_25px_rgba(255,71,87,0.5)]",
      ghost: "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 focus:ring-slate-400"
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg"
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';
