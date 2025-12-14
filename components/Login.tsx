import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';
import { Loader2, ArrowRight, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simple trim to remove accidental spaces, no regex restrictions
    const cleanEmail = email.trim();

    try {
        const { error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password
        });
        if (error) throw error;
        // La redirection est gérée par le listener dans App.tsx
    } catch (err: any) {
        console.error("Auth error:", err);
        let msg = err.message;
        
        // Traduction et amélioration des messages d'erreur courants
        if (msg === "Invalid login credentials") {
            msg = "Identifiants incorrects. Veuillez vérifier votre email et mot de passe.";
        } else if (msg.toLowerCase().includes("email address") && msg.toLowerCase().includes("invalid")) {
            msg = "Format d'email invalide. Vérifiez qu'il n'y a pas d'espaces ou de fautes de frappe.";
        } else if (msg.includes("Email not confirmed")) {
            msg = "Veuillez confirmer votre adresse email avant de vous connecter.";
        }
        
        setError(msg);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] dark:bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-card w-full max-w-md overflow-hidden animate-in fade-in duration-500">
        
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
             <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Portail Universitaire Connecté</p>
        </div>

        <div className="p-8 pt-6">
            <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0" /> <span className="break-words">{error}</span>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="email" 
                                required
                                autoComplete="email"
                                placeholder="nom@janghub.sn" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-700 dark:text-white focus:ring-2 focus:ring-university dark:focus:ring-sky-500 transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                placeholder="******" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-700 dark:text-white focus:ring-2 focus:ring-university dark:focus:ring-sky-500 transition-all text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
        </div>
      </div>
    </div>
  );
};