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
      className="sticky top-4 z-40 mx-4 lg:mx-8 px-6 py-3 bg-white/40 dark:bg-[#161a22]/60 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-center flex-1">
        <div className="relative w-full max-w-md group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#6C63FF] transition-colors" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full bg-slate-100/50 dark:bg-black/20 border border-transparent focus:border-[#6C63FF]/50 focus:bg-white dark:focus:bg-[#0f1115] rounded-xl py-2 pl-10 pr-4 text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none transition-all duration-300 shadow-inner"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF4757] rounded-full shadow-[0_0_8px_rgba(255,71,87,0.8)]" />
        </motion.button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6C63FF] to-[#00C896] p-[2px] cursor-pointer">
          <div className="w-full h-full rounded-full bg-[#161a22] border-2 border-transparent overflow-hidden">
            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=random`} alt="User" className="w-full h-full object-cover" loading="lazy" />
          </div>
        </div>
      </div>
    </motion.header>
  );
};
