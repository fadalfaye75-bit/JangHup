import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface GlassCardProps {
 children: React.ReactNode;
 className?: string;
 tilt?: boolean;
 onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', tilt = true, onClick }) => {
 const ref = useRef<HTMLDivElement>(null);
 const x = useMotionValue(0);
 const y = useMotionValue(0);

 const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
 const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

 const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg","-7deg"]);
 const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg","7deg"]);

 const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
 if (!ref.current || !tilt) return;
 const rect = ref.current.getBoundingClientRect();
 const width = rect.width;
 const height = rect.height;
 const mouseX = e.clientX - rect.left;
 const mouseY = e.clientY - rect.top;
 const xPct = mouseX / width - 0.5;
 const yPct = mouseY / height - 0.5;
 x.set(xPct);
 y.set(yPct);
 };

 const handleMouseLeave = () => {
 x.set(0);
 y.set(0);
 };

 return (
 <motion.div
 ref={ref}
 onMouseMove={handleMouseMove}
 onMouseLeave={handleMouseLeave}
 onClick={onClick}
 style={{
 rotateX: tilt ? rotateX : 0,
 rotateY: tilt ? rotateY : 0,
 transformStyle:"preserve-3d",
 }}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ type:"spring", stiffness: 300, damping: 20 }}
 className={`relative glass-card ${className}`}
 >
 {/* Subtle gradient overlay for light reflection */}
 <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"/>
 <div style={{ transform: tilt ?"translateZ(30px)":"none"}} className="h-full">
 {children}
 </div>
 </motion.div>
 );
};
