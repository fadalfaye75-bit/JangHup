import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';
import { 
  LogOut, User as UserIcon, Mail, Shield, GraduationCap, Settings, 
  Bell, ChevronDown, Users, AtSign, Key, Eye, EyeOff, Loader2, CheckCircle2, Lock,
  Award, Calendar, Hash, HelpCircle
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
       
       {/* Logout Confirmation Modal */}
       {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setShowLogoutConfirm(false)}></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xs w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center mb-4">
                        <LogOut size={24} className="ml-0.5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Déconnexion</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Êtes-vous sûr de vouloir vous déconnecter ?
                    </p>
                    
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => setShowLogoutConfirm(false)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs uppercase tracking-wider"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={() => {
                                setShowLogoutConfirm(false);
                                onLogout();
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-alert hover:bg-red-700 text-white font-bold transition-colors shadow-sm flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                        >
                            Confirmer
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

       {/* Header Section */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Dossier Académique</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gérez vos informations personnelles et vos préférences de compte.</p>
          </div>
          <span className="self-start md:self-auto px-4 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-100 dark:border-emerald-800 flex items-center gap-2 shadow-sm">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Compte Actif
          </span>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: ID Card & Details */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* Identity Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-card border border-slate-200 dark:border-slate-800 group">
                  {/* University Banner */}
                  <div className="h-32 bg-gradient-to-r from-university to-university-dark dark:from-sky-900 dark:to-slate-950 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                      <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-32"></div>
                  </div>

                  <div className="px-8 pb-8 relative">
                      <div className="flex justify-between items-end -mt-12 mb-6">
                          <div className="relative">
                              <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 p-1 shadow-lg ring-4 ring-white dark:ring-slate-900">
                                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-xl object-cover bg-slate-100 dark:bg-slate-800" />
                              </div>
                              <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-md border border-slate-100 dark:border-slate-700">
                                  <div className={`p-1.5 rounded-full ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' : 'bg-sky-100 text-sky-600'}`}>
                                      {user.role === UserRole.ADMIN ? <Shield size={14} /> : <GraduationCap size={14} />}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div>
                          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-1 tracking-tight">{user.name}</h2>
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-8">
                              <Mail size={14} /> {user.email}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col gap-1 hover:border-university/20 dark:hover:border-sky-500/20 transition-colors">
                                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Niveau / Classe</p>
                                  <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 text-lg">
                                      <Users size={20} className="text-university dark:text-sky-400" />
                                      {user.classLevel || 'Non assigné'}
                                  </div>
                              </div>
                              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col gap-1 hover:border-university/20 dark:hover:border-sky-500/20 transition-colors">
                                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Rôle Système</p>
                                  <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 text-lg">
                                      {user.role === UserRole.ADMIN ? <Shield size={20} className="text-purple-500" /> : <UserIcon size={20} className="text-emerald-500" />}
                                      {user.role === 'ADMIN' ? 'Administrateur' : user.role === 'RESPONSIBLE' ? 'Délégué' : 'Étudiant'}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Security Settings Block */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-card border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          <Lock size={18} className="text-slate-400" /> Sécurité & Connexion
                      </h3>
                  </div>
                  
                  {/* Password Accordion */}
                  <div className={`transition-all ${isEditingPassword ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                      <button 
                          onClick={() => setIsEditingPassword(!isEditingPassword)}
                          className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                          <div className="text-left">
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Mot de passe</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pour sécuriser votre accès au portail</p>
                          </div>
                          <div className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${isEditingPassword ? 'bg-slate-200 dark:bg-slate-700 border-transparent text-slate-700 dark:text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                              {isEditingPassword ? 'Annuler' : 'Modifier'}
                          </div>
                      </button>

                      {isEditingPassword && (
                          <div className="px-6 pb-8 animate-in slide-in-from-top-2">
                              <form onSubmit={handleUpdatePassword} className="space-y-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                                  {message && (
                                      <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-800'}`}>
                                          {message.type === 'success' ? <CheckCircle2 size={16}/> : <Shield size={16}/>}
                                          {message.text}
                                      </div>
                                  )}
                                  <div className="grid md:grid-cols-2 gap-5">
                                      <div className="space-y-1.5">
                                          <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Nouveau mot de passe</label>
                                          <div className="relative">
                                              <input 
                                                  type={showPassword ? "text" : "password"}
                                                  value={newPassword}
                                                  onChange={e => setNewPassword(e.target.value)}
                                                  className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-bold focus:ring-2 focus:ring-university/20 dark:focus:ring-sky-500/20 focus:border-university dark:focus:border-sky-500 text-slate-800 dark:text-white transition-all"
                                                  placeholder="Min. 6 caractères"
                                              />
                                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                                                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                              </button>
                                          </div>
                                      </div>
                                      <div className="space-y-1.5">
                                          <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Confirmer</label>
                                          <input 
                                              type={showPassword ? "text" : "password"}
                                              value={confirmPassword}
                                              onChange={e => setConfirmPassword(e.target.value)}
                                              className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-bold focus:ring-2 focus:ring-university/20 dark:focus:ring-sky-500/20 focus:border-university dark:focus:border-sky-500 text-slate-800 dark:text-white transition-all"
                                              placeholder="Répéter le mot de passe"
                                          />
                                      </div>
                                  </div>
                                  <div className="flex justify-end">
                                      <button disabled={loading} type="submit" className="w-full md:w-auto px-8 py-3 bg-university dark:bg-sky-600 hover:bg-university-dark dark:hover:bg-sky-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-university/20 dark:shadow-sky-900/20 active:scale-95 transition-all disabled:opacity-70 disabled:scale-100">
                                          {loading && <Loader2 className="animate-spin" size={16}/>} Enregistrer les modifications
                                      </button>
                                  </div>
                              </form>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* Right Column: Preferences & Actions */}
          <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-card border border-slate-200 dark:border-slate-800 overflow-hidden p-6 md:p-8">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                      <Settings size={20} className="text-slate-400" /> Préférences
                  </h3>
                  
                  <div className="space-y-8">
                      {/* Notifications Toggle */}
                      <div className="flex items-center justify-between group cursor-pointer" onClick={() => setNotificationsEnabled(!notificationsEnabled)}>
                          <div>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-university dark:group-hover:text-sky-400 transition-colors">Notifications</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Emails pour examens et avis</p>
                          </div>
                          <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${notificationsEnabled ? 'left-[calc(100%-20px)]' : 'left-1'}`}></div>
                          </div>
                      </div>
                      
                      {user.role !== UserRole.ADMIN && (
                          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Email de classe</p>
                              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 group hover:border-university/30 dark:hover:border-sky-500/30 transition-colors">
                                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg text-university dark:text-sky-400 shadow-sm">
                                      <AtSign size={16} />
                                  </div>
                                  <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300 truncate select-all">{classEmail}</span>
                              </div>
                          </div>
                      )}
                  </div>
              </div>

              {/* Logout Button */}
              <button 
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full p-5 flex items-center justify-center gap-3 text-alert dark:text-red-400 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-alert-light dark:hover:bg-red-900/10 hover:border-alert/30 rounded-3xl shadow-card transition-all active:scale-[0.98] group"
              >
                  <LogOut size={20} strokeWidth={2.5} className="group-hover:-translate-x-1 transition-transform" /> Se déconnecter
              </button>
              
              <div className="text-center pt-2">
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">
                      JàngHub Université • v1.0.2
                  </p>
              </div>
          </div>
       </div>
    </div>
  );
};