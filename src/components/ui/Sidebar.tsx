import React from 'react';
import { motion } from 'motion/react';
import { Home, BarChart2, Calendar, Settings, Users } from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
 const navItems = [
 { id: 'dashboard', icon: Home, label: 'Dashboard' },
 { id: 'polls', icon: BarChart2, label: 'Sondages' },
 { id: 'meetings', icon: Calendar, label: 'Réunions' },
 { id: 'users', icon: Users, label: 'Étudiants' },
 ];

 return (
 <motion.aside
 initial={{ x: -50, opacity: 0 }}
 animate={{ x: 0, opacity: 1 }}
 className="fixed left-0 top-0 h-screen w-20 lg:w-64 bg-[var(--glass-bg)] backdrop-blur-[14px] border-r border-[var(--glass-border)] flex flex-col items-center lg:items-start py-8 z-50 transition-all duration-300"
 >
 <div className="px-0 lg:px-8 mb-12 flex items-center justify-center lg:justify-start w-full">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent shadow-[0_0_20px_rgba(108,99,255,0.4)] flex items-center justify-center text-[var(--text-main)] font-bold text-xl">
 J
 </div>
 <span className="hidden lg:block ml-3 font-bold text-[var(--text-main)] tracking-tight">
 JangHup
 </span>
 </div>

 <nav className="flex-1 w-full px-3 lg:px-4 space-y-2">
 {navItems.map((item) => {
 const isActive = activeTab === item.id;
 const Icon = item.icon;
 return (
 <button
 key={item.id}
 onClick={() => setActiveTab(item.id)}
 className={`relative w-full flex items-center justify-center lg:justify-start px-3 lg:px-4 py-3 rounded-xl transition-all duration-300 group ${
 isActive ? 'text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
 }`}
 >
 {isActive && (
 <motion.div
 layoutId="activeTab"
 className="absolute inset-0 bg-primary rounded-xl shadow-[0_0_15px_rgba(108,99,255,0.4)]"
 initial={false}
 transition={{ type:"spring", stiffness: 400, damping: 30 }}
 />
 )}
 <Icon size={20} className="relative z-10"/>
 <span className="hidden lg:block ml-3 font-medium relative z-10">{item.label}</span>
 </button>
 );
 })}
 </nav>

 <div className="w-full px-3 lg:px-4 mt-auto">
 <button className="w-full flex items-center justify-center lg:justify-start px-3 lg:px-4 py-3 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--glass-bg)] transition-all">
 <Settings size={20} />
 <span className="hidden lg:block ml-3 font-medium">Paramètres</span>
 </button>
 </div>
 </motion.aside>
 );
};
