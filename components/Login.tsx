import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, UserRole } from '../types';
import { Loader2, ArrowRight, Mail, Lock, AlertCircle, Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // View State: 'LOGIN' | 'FORGOT'
  const [view, setView] = useState<'LOGIN' | 'FORGOT'>('LOGIN');

  // Forgot Password State
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Fonction de vérification Backdoor (Secours)
    const checkBackdoor = () => {
        if ((cleanEmail === 'faye@janghup.sn' || cleanEmail === 'faye@janghub.sn') && cleanPassword === 'passer25') {
            const adminUser: User = {
                id: 'admin-preview-id', // ID spécial pour le mode démo
                name: 'M. Faye (Admin)',
                email: cleanEmail,
                role: UserRole.ADMIN,
                classLevel: 'ADMINISTRATION',
                avatar: `https://ui-avatars.com/api/?name=Faye&background=2F6FB2&color=fff`
            };
            onLogin(adminUser);
            return true;
        }
        return false;
    };

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
        });
        
        if (error) {
            // Tentative de connexion secours si Supabase refuse l'accès
            if (checkBackdoor()) return;
            throw error;
        }
        
        // La session est gérée par onAuthStateChange dans App.tsx pour les utilisateurs normaux
    } catch (err: any) {
        // BACKDOOR CRITIQUE : Intercepte "Failed to fetch" ou autres erreurs réseau
        if (checkBackdoor()) return;

        console.error("Login error:", err);
        const msg = err.message || "";
        
        if (msg.includes("Failed to fetch")) {
            setError("Erreur de connexion au serveur. Vérifiez votre internet.");
        } else if (msg.includes("Invalid login credentials")) {
            setError("Identifiants incorrects.");
        } else if (msg.includes("Email not confirmed")) {
            setError("Veuillez confirmer votre email.");
        } else {
            setError("Erreur de connexion. Réessayez.");
        }
        setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resetEmail) return;
      setResetLoading(true);
      setResetMessage(null);

      try {
          const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
              redirectTo: window.location.origin, // Redirige vers le site pour changer le mdp
          });

          if (error) throw error;

          setResetMessage({
              type: 'success',
              text: 'Si un compte existe, un email de réinitialisation a été envoyé.'
          });
      } catch (err: any) {
          setResetMessage({
              type: 'error',
              text: err.message || "Impossible d'envoyer l'email."
          });
      } finally {
          setResetLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] dark:bg-slate-950 flex items-center justify-center p-6 font-sans transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-card w-full max-w-md overflow-hidden animate-in fade-in duration-500">
        
        {/* Header Institutionnel */}
        <div className="bg-white dark:bg-slate-900 p-8 pb-6 border-b border-slate-100 dark:border-slate-800 text-center flex flex-col items-center">
             <div className="w-16 h-16 mb-4 relative">
                 <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <circle cx="20" cy="10" r="4" className="fill-university dark:fill-sky-500" />
                    <path d="M20 16H10C7.79086 16 6 17.7909 6 20V32C6 33.1046 6.89543 34 8 34H20V16Z" className="fill-university dark:fill-sky-500" />
                    <path d="M20 16H30C32.2091 16 34 17.7909 34 20V32C34 33.1046 33.1046 34 32 34H20V16Z" className="fill-brand dark:fill-sky-300" />
                    <path d="M20 16V34" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                 </svg>
             </div>
             <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">JàngHub</h1>
             <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Portail Académique Sécurisé</p>
        </div>

        <div className="p-8 pt-6">
            {view === 'LOGIN' ? (
                <>
                <form onSubmit={handleAuth} className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                    {error && (
                        <div className="bg-alert-light dark:bg-alert/10 border border-alert/20 text-alert-text dark:text-alert p-3 rounded-lg text-sm flex items-start gap-2 font-medium">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" /> 
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Email académique</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="email" 
                                    required
                                    placeholder="identifiant@janghub.sn" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-university dark:focus:ring-sky-500 focus:border-university dark:focus:border-sky-500 outline-none font-medium text-slate-700 dark:text-white transition-all placeholder:text-slate-400 text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5 ml-1">
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Mot de passe</label>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="••••••••" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-university dark:focus:ring-sky-500 focus:border-university dark:focus:border-sky-500 outline-none font-medium text-slate-700 dark:text-white transition-all placeholder:text-slate-400 text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className="flex justify-end mt-2">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setView('FORGOT');
                                        setError(null);
                                        setResetMessage(null);
                                    }}
                                    className="text-xs font-bold text-university dark:text-sky-400 hover:underline"
                                >
                                    Mot de passe oublié ?
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-university hover:bg-university-dark dark:bg-sky-600 dark:hover:bg-sky-700 text-white rounded-lg font-bold shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : "Connexion"}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>
                </>
            ) : (
                <form onSubmit={handleResetPassword} className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-university dark:text-sky-400">
                            <KeyRound size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Récupération</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Entrez votre email pour recevoir un lien de réinitialisation.</p>
                    </div>

                    {resetMessage && (
                        <div className={`p-3 rounded-lg text-sm flex items-start gap-2 font-medium border ${resetMessage.type === 'success' ? 'bg-success-light dark:bg-success/10 border-success/20 text-success' : 'bg-alert-light dark:bg-alert/10 border-alert/20 text-alert-text dark:text-alert'}`}>
                            {resetMessage.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                            <span>{resetMessage.text}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Email associé au compte</label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="email" 
                                required
                                placeholder="identifiant@janghub.sn" 
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-university dark:focus:ring-sky-500 focus:border-university dark:focus:border-sky-500 outline-none font-medium text-slate-700 dark:text-white transition-all placeholder:text-slate-400 text-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={resetLoading}
                        className="w-full py-3 bg-university hover:bg-university-dark dark:bg-sky-600 dark:hover:bg-sky-700 text-white rounded-lg font-bold shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-70"
                    >
                        {resetLoading ? <Loader2 className="animate-spin" size={18} /> : "Envoyer le lien"}
                    </button>

                    <button 
                        type="button"
                        onClick={() => {
                            setView('LOGIN');
                            setError(null);
                        }}
                        className="w-full py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                        <ArrowLeft size={14} /> Retour à la connexion
                    </button>
                </form>
            )}
            
            <p className="text-center text-[10px] text-slate-300 dark:text-slate-600 mt-8">
                © {new Date().getFullYear()} JàngHub - Université
            </p>
        </div>
      </div>
    </div>
  );
};