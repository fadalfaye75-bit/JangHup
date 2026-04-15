import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface AppCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  title?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'compact' | 'extended';
  hover?: boolean;
}

export const AppCard: React.FC<AppCardProps> = ({ 
  children, 
  className, 
  onClick, 
  header, 
  footer,
  title,
  badge,
  icon,
  variant = 'default',
  hover = true
}) => {
  const paddingClass = variant === 'compact' ? 'p-4' : 'p-5 md:p-6';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={cn(
        "bg-[var(--bg-card)] border border-[var(--border-card)] rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-200",
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Header */}
      {(header || title || badge) && (
        <div className={cn("flex items-center justify-between border-b border-[var(--border-card)]/50", paddingClass, "pb-4")}>
          {header ? header : (
            <div className="flex items-center gap-3">
              {icon && <div className="text-primary">{icon}</div>}
              {title && <h3 className="text-base md:text-lg font-bold text-[var(--text-main)] tracking-tight">{title}</h3>}
            </div>
          )}
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
      )}

      {/* Content */}
      <div className={paddingClass}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className={cn("border-t border-[var(--border-card)]/50 bg-[var(--bg-main)]/30", paddingClass, "py-4")}>
          {footer}
        </div>
      )}
    </motion.div>
  );
};

export const CardGrid: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6", className)}>
    {children}
  </div>
);

export const AutoGrid: React.FC<{ children: React.ReactNode; className?: string; minWidth?: string }> = ({ 
  children, 
  className,
  minWidth = "240px" 
}) => (
  <div 
    className={cn("grid gap-4 md:gap-6", className)}
    style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))` }}
  >
    {children}
  </div>
);
