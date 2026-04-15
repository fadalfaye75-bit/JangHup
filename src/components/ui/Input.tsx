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
          <label className="mb-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`input-standard ${error ? 'border-danger focus:ring-danger/20' : ''} ${className}`}
          {...props}
        />
        {error && <span className="mt-1 text-xs text-danger">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
