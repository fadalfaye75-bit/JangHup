import React from 'react';
import { motion } from 'motion/react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  tilt?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick, style }) => {
  return (
    <motion.div
      onClick={onClick}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`glass-card ${className} ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
    >
      <div className="h-full">
        {children}
      </div>
    </motion.div>
  );
};
