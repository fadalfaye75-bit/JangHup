import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
 isOpen: boolean;
 onClose: () => void;
 title: string;
 children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
 return (
 <AnimatePresence>
 {isOpen && (
 <>
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={onClose}
 className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
 />
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 transition={{ type:"spring", stiffness: 300, damping: 25 }}
 className="w-full max-w-lg bg-[var(--bg-main)] border border-[var(--border-card)] rounded-3xl shadow-[var(--shadow-strong)] overflow-hidden pointer-events-auto"
 >
 <div className="flex justify-between items-center p-6 border-b border-[var(--border-card)]">
 <h2 className="text-xl font-bold text-[var(--text-main)]">{title}</h2>
 <button
 onClick={onClose}
 className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] transition-colors"
 >
 <X size={20} />
 </button>
 </div>
 <div className="p-6">
 {children}
 </div>
 </motion.div>
 </div>
 </>
 )}
 </AnimatePresence>
 );
};
