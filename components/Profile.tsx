import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';
import { 
  LogOut, User as UserIcon, Mail, Shield, GraduationCap, Settings, 
  Bell, ChevronDown, Users, AtSign, Key, Eye, EyeOff, Loader2, CheckCircle2, Lock
} from 'lucide-react';

interface ProfileProps {
  user: User;
  onLogout: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onLogout }) => {
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // UI State for toggle
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return { color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800', icon: Shield, label: 'Administrateur' };
      case UserRole.RESPONSIBLE:
        return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800', icon: GraduationCap, label: 'Délégué de Classe' };
      default:
        return { color: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800', icon: UserIcon, label: 'Élève' };
    }
  };

  const roleInfo = getRoleBadge(user.role);
  const RoleIcon = roleInfo.icon;

  const classEmail = user.classLevel 
    ? `${user.classLevel.toLowerCase().replace(/[^a-z0-9]/g, '.')}@janghub.sn`
    : 'N/A';

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (newPassword.length < 6) {
        setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères.' });
        setLoading(false);
        return;
    }

    if (newPassword !== confirmPassword) {
        setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
        setLoading(false);
        return;
    }

    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        
        setMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès.' });
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setIsEditingPassword(false), 2000);
    } catch (err: any) {
        setMessage({ type: 'error', text: err.message || 'Erreur lors de la mise à jour.' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center gap-3 mb-2">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Mon Profil</h2>
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-full border border-slate-200 dark:border-slate-700">
             Compte {user.role === 'ADMIN' ? 'Administrateur' : 'Étudiant'}
          </span>
      </div>
      
      {/* Carte d'identité */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 md:p-10 shadow-card border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-university/5 dark:bg-sky-500/10 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-university/10"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-brand/10 dark:bg-brand/5 rounded-full -ml-10 -mb-10 blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
             <div className="w-28 h-28 md:w-32 md:h-32 rounded-full p-1.5 bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-700">
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
             </div>
             <div className="absolute bottom-1 right-1 bg-emerald-500 w-8 h-8 rounded-full border-[3px] border-white dark:border-slate-800 shadow-sm flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
             </div>
          </div>
          
          <div className="text-center md:text-left flex-1 space-y-4">
             <div>
                 <h3 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">{user.name}</h3>
                 <div className="flex items-center justify-center md:justify-start gap-2 text-slate-500 dark:text-slate-400 font-medium mt-1">
                   <Mail size={14} /> {user.email}
                 </div>
             </div>
             
             <div className="flex gap-3 justify-center md:justify-start flex-wrap">
                 <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${roleInfo.color}`}>
                    <RoleIcon size={16} /> {roleInfo.label}
                 </div>
                 {user.classLevel && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                        <Users size={16} /> {user.classLevel}
                    </div>
                 )}
             </div>
             
             {user.role !== UserRole.ADMIN && (
                 <div className="pt-3 border-t border-slate-100 dark:border-slate-800 inline-flex flex-col items-center md:items-start w-full">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs font-bold bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 w-full md:w-auto justify-center md:justify-start">
                        <AtSign size={14} className="text-university dark:text-sky-400" /> 
                        <span className="opacity-70">Email de classe :</span> 
                        <span className="select-all">{classEmail}</span>
                    </div>
                 </div>
             )}
          </div>
        </div>
      </div>

      {/* Paramètres */}
      <div>
        <h4 className="font-bold text-slate-800 dark:text-white text-lg mb-4 flex items-center gap-2 px-2">
            <Settings size={20} className="text-university dark:text-sky-400" /> Paramètres du compte
        </h4>
        
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-soft border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            
             {/* Security Section */}
             <div className={`transition-colors duration-300 ${isEditingPassword ? 'bg-slate-50/50 dark:bg-slate-800/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                <button 
                    onClick={() => setIsEditingPassword(!isEditingPassword)}
                    className="w-full p-6 flex items-center justify-between group outline-none"
                >
                    <div className="flex items-center gap-5">
                       <div className="bg-university/10 dark:bg-sky-500/10 p-3.5 rounded-2xl text-university dark:text-sky-400 shadow-sm border border-university/10 dark:border-sky-500/10 group-hover:scale-105 transition-transform duration-300">
                          <Lock size={24} strokeWidth={2.5} />
                       </div>
                       <div className="text-left">
                          <p className="font-bold text-slate-800 dark:text-white text-base">Sécurité & Connexion</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Modifier votre mot de passe</p>
                       </div>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 transition-all duration-300 ${isEditingPassword ? 'rotate-180 bg-university text-white border-university' : 'group-hover:border-university/50 group-hover:text-university'}`}>
                        <ChevronDown size={18} />
                    </div>
                </button>

                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isEditingPassword ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <form onSubmit={handleUpdatePassword} className="px-6 pb-8 pt-2">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-5">
                            {message && (
                                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                    {message.type === 'success' ? <CheckCircle2 size={16}/> : <Shield size={16}/>}
                                    {message.text}
                                </div>
                            )}
                            
                            <div className="grid md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Nouveau mot de passe</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Key className="text-slate-400 group-focus-within:text-university dark:group-focus-within:text-sky-400 transition-colors" size={16} />
                                        </div>
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-university/20 dark:focus:ring-sky-500/20 focus:border-university dark:focus:border-sky-500 outline-none text-sm font-bold text-slate-800 dark:text-white transition-all"
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1">
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Confirmer</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Key className="text-slate-400 group-focus-within:text-university dark:group-focus-within:text-sky-400 transition-colors" size={16} />
                                        </div>
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-university/20 dark:focus:ring-sky-500/20 focus:border-university dark:focus:border-sky-500 outline-none text-sm font-bold text-slate-800 dark:text-white transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-end pt-2">
                                <button disabled={loading} type="submit" className="bg-university hover:bg-university-dark dark:bg-sky-600 dark:hover:bg-sky-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70">
                                    {loading ? <Loader2 className="animate-spin" size={16}/> : 'Enregistrer le nouveau mot de passe'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
             </div>

             {/* Notifications Section */}
             <div className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer" onClick={() => setNotificationsEnabled(!notificationsEnabled)}>
                <div className="flex items-center gap-5">
                   <div className="bg-brand/10 dark:bg-sky-400/10 p-3.5 rounded-2xl text-brand dark:text-sky-400 shadow-sm border border-brand/10 dark:border-sky-400/10 group-hover:scale-105 transition-transform duration-300">
                      <Bell size={24} strokeWidth={2.5} />
                   </div>
                   <div className="text-left">
                      <p className="font-bold text-slate-800 dark:text-white text-base">Notifications</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Alertes emails pour les examens et annonces</p>
                   </div>
                </div>
                
                {/* Custom Toggle Switch */}
                <div className={`w-12 h-7 rounded-full relative transition-colors duration-300 shadow-inner ${notificationsEnabled ? 'bg-brand dark:bg-sky-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                   <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ease-spring ${notificationsEnabled ? 'left-[calc(100%-24px)]' : 'left-1'}`}></div>
                </div>
             </div>
        </div>
      </div>
        
      <div className="pt-2">
           <button 
             onClick={onLogout}
             className="w-full py-4 flex items-center justify-center gap-2 text-alert dark:text-red-400 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-alert-light dark:hover:bg-red-900/10 hover:border-alert/30 rounded-2xl transition-all active:scale-[0.99]"
           >
              <LogOut size={18} strokeWidth={2.5} /> Se déconnecter
           </button>
           <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-4 uppercase font-bold tracking-widest">
               JàngHub Université • v1.0.2
           </p>
      </div>
    </div>
  );
};