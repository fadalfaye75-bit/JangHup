import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'motion/react';
import { cn } from '../../lib/utils';

interface SwipeActionProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  leftBg?: string;
  rightBg?: string;
  threshold?: number;
  className?: string;
  disabled?: boolean;
}

export const SwipeAction: React.FC<SwipeActionProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftContent,
  rightContent,
  leftBg = 'bg-danger/20',
  rightBg = 'bg-success/20',
  threshold = 80,
  className,
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const controls = useAnimation();
  const [isSwiping, setIsSwiping] = useState(false);

  // Values for background opacity based on drag position
  const leftOpacity = useTransform(x, [0, -threshold], [0, 1]);
  const rightOpacity = useTransform(x, [0, threshold], [0, 1]);
  
  // Icon scale effect
  const leftScale = useTransform(x, [0, -threshold], [0.8, 1.1]);
  const rightScale = useTransform(x, [0, threshold], [0.8, 1.1]);

  const handleDragEnd = async (e: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    // Swipe left (trigger leftAction which means swiping left towards negative x)
    if (onSwipeLeft && leftContent && (offset < -threshold || velocity < -500)) {
      controls.start({ x: -window.innerWidth, transition: { duration: 0.2 } }).then(() => {
        onSwipeLeft();
        // Reset after action if component doesn't unmount
        setTimeout(() => controls.set({ x: 0 }), 100);
      });
      return;
    }

    // Swipe right (trigger rightAction)
    if (onSwipeRight && rightContent && (offset > threshold || velocity > 500)) {
      controls.start({ x: window.innerWidth, transition: { duration: 0.2 } }).then(() => {
        onSwipeRight();
        setTimeout(() => controls.set({ x: 0 }), 100);
      });
      return;
    }

    // Bounce back
    controls.start({
      x: 0,
      transition: { type: "spring", stiffness: 400, damping: 25 }
    });
  };

  return (
    <div 
      className={cn("relative overflow-hidden w-full", className)}
      ref={containerRef}
    >
      {/* Background Actions */}
      <div className="absolute inset-0 flex justify-between items-center z-0">
        <motion.div 
          className={cn("absolute inset-y-0 left-0 w-1/2 flex items-center justify-start pl-6", rightBg)}
          style={{ opacity: rightOpacity }}
        >
          <motion.div style={{ scale: rightScale }}>
            {rightContent}
          </motion.div>
        </motion.div>
        
        <motion.div 
          className={cn("absolute inset-y-0 right-0 w-1/2 flex items-center justify-end pr-6", leftBg)}
          style={{ opacity: leftOpacity }}
        >
          <motion.div style={{ scale: leftScale }}>
            {leftContent}
          </motion.div>
        </motion.div>
      </div>

      {/* Foreground Draggable Content */}
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        dragDirectionLock
        onDirectionLock={(axis) => {
          if (axis === 'y') x.stop();
        }}
        onDragStart={() => setIsSwiping(true)}
        onDragEnd={(e, info) => {
          setIsSwiping(false);
          handleDragEnd(e, info);
        }}
        animate={controls}
        style={{ x, touchAction: 'pan-y' }}
        className="relative z-10 bg-white dark:bg-gray-900"
      >
        <div style={{ pointerEvents: isSwiping ? 'none' : 'auto' }}>
          {children}
        </div>
      </motion.div>
    </div>
  );
};
