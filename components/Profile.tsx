import React from 'react';
import { User, UserRole } from '../types';
import { LogOut, User as UserIcon, Mail, Shield, GraduationCap, Settings, Bell, ChevronRight, Users, AtSign } from 'lucide-react';

interface ProfileProps {
  user: User;
  onLogout: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onLogout }) => {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Shield, label: 'Administrateur' };
      case UserRole.RESPONSIBLE:
        return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: GraduationCap, label: 'Délégué de Classe' };
      default:
        return { color: 'bg-sky-100 text-sky-700 border-sky-200', icon: UserIcon, label: 'Élève' };
    }
  };

  const roleInfo = getRoleBadge(user.role);
  const RoleIcon = roleInfo.icon;

  // Génération de l'email de classe
  const classEmail = user.classLevel 
    ? `${user.classLevel.toLowerCase().replace(/[^a-z0-9]/g, '.')}@janghub.sn`
    : 'N/A';

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Mon Profil</h2>
      
      {/* Identity Card */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-soft border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-100 rounded-full -ml-10 -mb-10 blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
             <div className="w-28 h-28 md:w-36 md:h-36 rounded-full p-1 bg-white shadow-lg">
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
             </div>
             <div className="absolute bottom-2 right-2 bg-emerald-500 w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
             </div>
          </div>
          
          <div className="text-center md:text-left flex-1 space-y-3">
             <h3 className="text-3xl font-bold text-slate-800">{user.name}</h3>
             <div className="flex items-center justify-center md:justify-start gap-2 text-slate-500 font-medium bg-slate-50 w-fit mx-auto md:mx-0 px-4 py-1.5 rounded-full">
               <Mail size={16} /> {user.email}
             </div>
             
             <div className="flex gap-3 justify-center md:justify-start flex-wrap">
                 <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border ${roleInfo.color}`}>
                    <RoleIcon size={18} /> {roleInfo.label}
                 </div>
                 <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border bg-orange-50 text-orange-700 border-orange-200">
                    <Users size={18} /> {user.classLevel}
                 </div>
             </div>
             
             {/* Class Email Display */}
             {user.role !== UserRole.ADMIN && (
                 <div className="mt-2 pt-2 border-t border-slate-100/50 inline-flex flex-col items-center md:items-start">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Email de classe (Partage)</span>
                    <div className="flex items-center gap-2 text-slate-600 font-bold bg-white/50 px-3 py-1 rounded-lg border border-slate-100">
                        <AtSign size={14} className="text-brand" /> {classEmail}
                    </div>
                 </div>
             )}
          </div>
        </div>
      </div>

      {/* Settings / Info */}
      <div className="bg-white rounded-[2.5rem] shadow-soft border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50">
          <h4 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-3">
            <Settings size={22} className="text-brand" /> Paramètres du compte
          </h4>
          <div className="space-y-4">
             <button className="w-full flex items-center justify-between p-5 bg-slate-50 rounded-3xl hover:bg-slate-100 transition-colors group">
                <div className="flex items-center gap-4">
                   <div className="bg-white p-3 rounded-2xl text-brand shadow-sm group-hover:scale-110 transition-transform">
                      <Bell size={22} />
                   </div>
                   <div className="text-left">
                      <p className="font-bold text-slate-800">Notifications</p>
                      <p className="text-xs text-slate-400 font-medium">Gérer les alertes e-mail et push</p>
                   </div>
                </div>
                <div className="w-12 h-7 bg-brand rounded-full relative cursor-pointer shadow-inner">
                   <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow-sm"></div>
                </div>
             </button>

             <button className="w-full flex items-center justify-between p-5 bg-slate-50 rounded-3xl hover:bg-slate-100 transition-colors group">
                <div className="flex items-center gap-4">
                   <div className="bg-white p-3 rounded-2xl text-purple-500 shadow-sm group-hover:scale-110 transition-transform">
                      <Shield size={22} />
                   </div>
                   <div className="text-left">
                      <p className="font-bold text-slate-800">Sécurité & Connexion</p>
                      <p className="text-xs text-slate-400 font-medium">Mot de passe et authentification</p>
                   </div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
             </button>
          </div>
        </div>
        
        <div className="p-8">
           <button 
             onClick={onLogout}
             className="w-full py-5 flex items-center justify-center gap-3 text-red-500 font-bold bg-red-50 hover:bg-red-100 rounded-3xl transition-colors"
           >
              <LogOut size={20} /> Se déconnecter
           </button>
        </div>
      </div>
    </div>
  );
};