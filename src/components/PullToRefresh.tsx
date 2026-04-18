import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
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
  const maxPull = 150;
  
  const y = useMotionValue(0);
  const rotate = useTransform(y, [0, pullDistance], [0, 360]);
  const opacity = useTransform(y, [0, pullDistance * 0.5, pullDistance], [0, 0.5, 1]);
  const scale = useTransform(y, [0, pullDistance], [0.5, 1]);

  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only start pulling if we are at the top of the container/window
      if (disabled || isRefreshing) return;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      // We also check element.scrollTop if inside a scrollable container
      const containerScrollTop = element.scrollTop;
      
      if (scrollY <= 0 && containerScrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return;
      
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      
      if (diff > 0) {
        // Prevent default scrolling when pulling down
        if (e.cancelable) e.preventDefault();
        // Apply friction
        const pullValue = Math.min(diff * 0.4, maxPull);
        y.set(pullValue);
      } else {
        y.set(0);
      }
    };

    const onTouchEnd = async () => {
      if (!isPulling.current) return;
      isPulling.current = false;

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

    element.addEventListener('touchstart', onTouchStart, { passive: true });
    // Not passive because we might preventDefault
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd);
    element.addEventListener('touchcancel', onTouchEnd);

    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [disabled, isRefreshing, onRefresh, y]);

  return (
    <div 
      ref={containerRef}
      className={cn("relative h-full overflow-y-auto overflow-x-hidden flex flex-col", className)}
    >
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
        <div className="mt-4 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center text-primary">
          <motion.div style={{ rotate }}>
            <RefreshCw size={20} className={cn(isRefreshing ? "animate-spin" : "")} />
          </motion.div>
        </div>
      </motion.div>

      <motion.div 
        style={{ y }}
        className="flex-1 h-full min-h-screen"
      >
        {children}
      </motion.div>
    </div>
  );
};
