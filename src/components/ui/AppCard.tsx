import React from 'react';
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
  const paddingClass = variant === 'compact' ? 'p-3' : 'p-4';
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-white/10 rounded-[12px] flex flex-col transition-all duration-150",
        hover && onClick && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-white/20",
        className
      )}
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
    </div>
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
