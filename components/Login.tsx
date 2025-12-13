import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '../types';
import { Loader2, ArrowRight, Mail, Lock, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
        });
        
        if (error) throw error;
        
        // La session est gérée par onAuthStateChange dans App.tsx
        // Le composant va se démonter automatiquement une fois l'utilisateur détecté
    } catch (err: any) {
        console.error("Login error:", err);
        const msg = err.message || "";
        if (msg.includes("Invalid login credentials")) {
            setError("Identifiants incorrects.");
        } else if (msg.includes("Email not confirmed")) {
            setError("Veuillez confirmer votre email.");
        } else {
            setError("Erreur de connexion. Vérifiez votre réseau.");
        }
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-6 font-sans">
      <div className="bg-white rounded-xl border border-slate-200 shadow-card w-full max-w-md overflow-hidden animate-in fade-in duration-500">
        
        {/* Header Institutionnel */}
        <div className="bg-white p-8 pb-6 border-b border-slate-100 text-center flex flex-col items-center">
             <div className="w-16 h-16 mb-4 relative">
                 <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <circle cx="20" cy="10" r="4" className="fill-university" />
                    <path d="M20 16H10C7.79086 16 6 17.7909 6 20V32C6 33.1046 6.89543 34 8 34H20V16Z" className="fill-university" />
                    <path d="M20 16H30C32.2091 16 34 17.7909 34 20V32C34 33.1046 33.1046 34 32 34H20V16Z" className="fill-brand" />
                    <path d="M20 16V34" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                 </svg>
             </div>
             <h1 className="text-2xl font-bold text-slate-800 tracking-tight">JàngHub</h1>
             <p className="text-slate-500 text-sm font-medium mt-1">Portail Académique Sécurisé</p>
        </div>

        <div className="p-8 pt-6">
            <form onSubmit={handleAuth} className="space-y-5">
                {error && (
                    <div className="bg-alert-light border border-alert/20 text-alert-text p-3 rounded-lg text-sm flex items-start gap-2 font-medium">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" /> 
                        <span>{error}</span>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">Email académique</label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="email" 
                                required
                                placeholder="identifiant@janghub.sn" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-university focus:border-university outline-none font-medium text-slate-700 transition-all placeholder:text-slate-400 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">Mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="password" 
                                required
                                placeholder="••••••••" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-university focus:border-university outline-none font-medium text-slate-700 transition-all placeholder:text-slate-400 text-sm"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-university hover:bg-university-dark text-white rounded-lg font-bold shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-70"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : "Connexion"}
                    {!loading && <ArrowRight size={18} />}
                </button>
            </form>
            
            <p className="text-center text-[10px] text-slate-300 mt-8">
                © {new Date().getFullYear()} JàngHub - Université
            </p>
        </div>
      </div>
    </div>
  );
};