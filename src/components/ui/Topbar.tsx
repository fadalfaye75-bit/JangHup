import React from 'react';
import { motion } from 'motion/react';
import { Search, Bell, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

export const Topbar = () => {
 const { theme, toggleTheme } = useTheme();
 const { user } = useAuth();

 return (
 <motion.header
 initial={{ y: -20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 className="sticky top-4 z-40 mx-4 lg:mx-8 px-6 py-3 bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--border-card)] rounded-2xl flex items-center justify-between shadow-[var(--shadow-soft)]"
 >
 <div className="flex items-center flex-1">
 <div className="relative w-full max-w-md group">
 <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-primary transition-colors"/>
 <input
 type="text"
 placeholder="Rechercher..."
 className="w-full bg-[var(--bg-secondary)] border border-transparent focus:border-primary/50 focus:bg-[var(--bg-main)] rounded-xl py-2 pl-10 pr-4 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none transition-all duration-300 shadow-inner"
 />
 </div>
 </div>

 <div className="flex items-center gap-4">
 <motion.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 onClick={toggleTheme}
 className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] transition-colors"
 >
 {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
 </motion.button>

 <motion.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 className="relative p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] transition-colors"
 >
 <Bell size={20} />
 <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full shadow-[0_0_8px_rgba(255,75,110,0.8)]"/>
 </motion.button>

 <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px] cursor-pointer">
 <div className="w-full h-full rounded-full bg-[var(--bg-main)] border-2 border-transparent overflow-hidden">
 <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=random`} alt="User"className="w-full h-full object-cover"loading="lazy"/>
 </div>
 </div>
 </div>
 </motion.header>
 );
};
