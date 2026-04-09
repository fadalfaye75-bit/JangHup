import React from 'react';
import { motion } from 'motion/react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col w-full">
        {label && (
          <label className="mb-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={`w-full bg-transparent border-b-2 border-slate-200 dark:border-white/10 py-2 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#6C63FF] dark:focus:border-[#6C63FF] transition-colors duration-300 ${className}`}
            {...props}
          />
          <motion.div
            className="absolute bottom-0 left-0 h-[2px] bg-[#6C63FF] origin-left"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            transition={{ duration: 0.3 }}
          />
        </div>
        {error && <span className="mt-1 text-xs text-[#FF4757]">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
