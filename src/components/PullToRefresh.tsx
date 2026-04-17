import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ 
  onRefresh, 
  children, 
  className,
  disabled = false
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullDistance = 80;
  
  const y = useMotionValue(0);
  const rotate = useTransform(y, [0, pullDistance], [0, 360]);
  const opacity = useTransform(y, [0, pullDistance * 0.5, pullDistance], [0, 0.5, 1]);
  const scale = useTransform(y, [0, pullDistance], [0.5, 1]);

  const handleDrag = (_: any, info: PanInfo) => {
    if (disabled || isRefreshing) return;
    
    // Simple check: we only pull down
    if (info.offset.y > 0) {
      y.set(info.offset.y * 0.4);
    } else {
      y.set(0);
    }
  };

  const handleDragEnd = async () => {
    if (disabled || isRefreshing) return;

    if (y.get() >= pullDistance) {
      setIsRefreshing(true);
      animate(y, pullDistance, { type: 'spring', stiffness: 300, damping: 30 });
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
      }
    } else {
      animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
    }
  };

  return (
    <div className={cn("relative h-full overflow-hidden flex flex-col", className)}>
      <motion.div
        style={{ 
          y, 
          opacity, 
          scale,
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          display: 'flex', 
          justifyContent: 'center', 
          zIndex: 40,
          pointerEvents: 'none'
        }}
      >
        <div className="mt-4 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center text-blue-500">
          <motion.div style={{ rotate }}>
            <RefreshCw size={20} className={cn(isRefreshing ? "animate-spin" : "")} />
          </motion.div>
        </div>
      </motion.div>

      <motion.div 
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.4}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ y: isRefreshing ? pullDistance : 0 }}
        className="flex-1 h-full"
      >
        {children}
      </motion.div>
    </div>
  );
};
