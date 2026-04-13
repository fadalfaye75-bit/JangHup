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
 const baseStyles ="btn-futuristic outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 :ring-offset-[var(--bg-main)]";

 const variants = {
 primary:"btn-futuristic-primary",
 secondary:"btn-futuristic-secondary",
 danger:"btn-futuristic-danger",
 ghost:"btn-futuristic-ghost"
 };

 const sizes = {
 sm:"px-4 py-2 text-sm",
 md:"px-6 py-3 text-base",
 lg:"px-8 py-4 text-lg"
 };

 return (
 <motion.button
 ref={ref}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 transition={{ type:"spring", stiffness: 400, damping: 25 }}
 className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
 disabled={isLoading || props.disabled}
 {...props}
 >
 {isLoading && (
 <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"fill="none"viewBox="0 0 24 24">
 <circle className="opacity-25"cx="12"cy="12"r="10"stroke="currentColor"strokeWidth="4"/>
 <path className="opacity-75"fill="currentColor"d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
 </svg>
 )}
 {children}
 </motion.button>
 );
 }
);
Button.displayName = 'Button';
