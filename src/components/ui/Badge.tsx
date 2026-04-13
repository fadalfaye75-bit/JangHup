import React from 'react';
import { motion } from 'motion/react';

interface BadgeProps {
 children: React.ReactNode;
 variant?: 'primary' | 'success' | 'danger' | 'info';
 className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', className = '' }) => {
 const variants = {
 primary: 'bg-primary/10 text-primary border-primary/20',
 success: 'bg-accent/10 text-accent border-accent/20',
 danger: 'bg-[#FF4757]/10 text-[#FF4757] border-[#FF4757]/20',
 info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
 };

 return (
 <motion.span
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${variants[variant]} ${className}`}
 >
 {children}
 </motion.span>
 );
};
