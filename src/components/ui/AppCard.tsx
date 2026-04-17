import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '../../lib/utils';

interface AppCardProps extends HTMLMotionProps<"div"> {
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
  hover = true,
  ...props
}) => {
  const paddingClass = variant === 'compact' ? 'p-3' : 'p-4';
  
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover && onClick ? { y: -4, scale: 1.015, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" } : {}}
      whileTap={hover && onClick ? { scale: 0.98, y: 0 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={cn(
        "bg-white dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-white/10 rounded-[16px] flex flex-col transition-all duration-300 shadow-sm",
        hover && onClick && "cursor-pointer hover:border-blue-500/30 dark:hover:border-blue-400/30",
        className
      )}
      {...props as any}
    >
      {/* Header */}
      {(header || title || badge) && (
        <div className={cn("flex items-start justify-between gap-3", paddingClass, "pb-2")}>
          {header ? header : (
            <div className="flex items-center gap-2">
              {icon && <div className="text-gray-500 dark:text-gray-400">{icon}</div>}
              {title && <h3 className="text-[16px] md:text-[18px] font-semibold text-gray-900 dark:text-gray-100 leading-tight">{title}</h3>}
            </div>
          )}
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
      )}

      {/* Content */}
      <div className={cn("flex-1 text-[13px] md:text-[14px] text-gray-600 dark:text-gray-300 flex flex-col gap-2.5", paddingClass, (header || title || badge) ? "pt-0" : "", footer ? "pb-3" : "")}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className={cn("flex items-center justify-between border-t border-[#E5E7EB] dark:border-white/5 text-[12px] text-gray-500 dark:text-gray-400", paddingClass, "pt-3 mt-auto")}>
          {footer}
        </div>
      )}
    </motion.div>
  );
};

export const CardGrid: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
    {children}
  </div>
);

export const AutoGrid: React.FC<{ children: React.ReactNode; className?: string; minWidth?: string }> = ({ 
  children, 
  className,
  minWidth = "260px" 
}) => (
  <div 
    className={cn("grid gap-4", className)}
    style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))` }}
  >
    {children}
  </div>
);
