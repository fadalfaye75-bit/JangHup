import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, UserRole } from '../types';
import { Loader2, ArrowRight, Mail, Lock, AlertCircle, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  // Pré-remplissage des identifiants (Démo)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // BACKDOOR ADMIN POUR DEMO
    if (cleanEmail === 'admin@janghub.sn' && cleanPassword === 'admin123') {
        setTimeout(() => {
            const adminUser: User = {
                id: 'admin-master',
                name: 'Administration',
                email: 'admin@janghub.sn',
                role: UserRole.ADMIN,
                classLevel: 'Administration',
                avatar: 'https://ui-avatars.com/api/?name=Admin&background=8b5cf6&color=fff'
            };
            onLogin(adminUser);
            setLoading(false);
        }, 800);
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
        });
        if (error) throw error;
        // La redirection est gérée par le listener dans App.tsx
    } catch (err: any) {
        console.error("Login error details:", err);
        setError(err.message === "Invalid login credentials" ? "Identifiants incorrects." : "Erreur de connexion.");
    } finally {
        setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    // Mode démo Responsable Tle S2
    const demoUser: User = {
        id: 'demo-resp-' + Date.now(),
        name: 'Moussa Diop (Délégué)',
        email: 'delegue@tle.s2.sn',
        role: UserRole.RESPONSIBLE,
        classLevel: 'Tle S2',
        avatar: 'https://ui-avatars.com/api/?name=Moussa+Diop&background=0ea5e9&color=fff'
    };
    onLogin(demoUser);
  };

  return (
    <div className="min-h-screen bg-[#F0F8FF] flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] w-full max-w-md relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-brand/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-100 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-sky-200 mx-auto mb-6 transform rotate-3">
                    J
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">JàngHub</h1>
                <p className="text-slate-500 font-medium">Plateforme Scolaire Sénégalaise</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
                {error && (
                    <div className="bg-red-50 text-alert p-3 rounded-xl text-sm flex items-start gap-2 font-medium animate-in slide-in-from-top-2">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" /> 
                        <span>{error}</span>
                    </div>
                )}

                <div>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="email" 
                            required
                            placeholder="Email (Connexion classe)" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-brand focus:bg-white outline-none font-medium text-slate-700 transition-all"
                        />
                    </div>
                </div>

                <div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="password" 
                            required
                            placeholder="Mot de passe" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-brand focus:bg-white outline-none font-medium text-slate-700 transition-all"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-brand hover:bg-sky-400 text-white rounded-2xl font-bold shadow-lg shadow-sky-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : "Accéder à ma classe"}
                    {!loading && <ArrowRight size={20} />}
                </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-50">
                <button 
                    onClick={handleDemoLogin}
                    className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                >
                    <ShieldCheck size={18} /> Démo Délégué (Tle S2)
                </button>
            </div>

            <div className="mt-6 text-center px-4">
                <p className="text-xs text-slate-400 font-medium">
                    Problème de connexion ? Contactez votre délégué ou l'administration.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};