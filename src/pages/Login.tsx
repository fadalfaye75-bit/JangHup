import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Loader2, 
  ArrowRight, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { authService } from '../services/authService';
import { Register } from './Register';

import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';

export const Login: React.FC = () => {
  const { loginUser, loginAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'class' | 'admin' | 'register'>('class');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetEmailSent(false);

    try {
      if (mode === 'class') {
        await loginUser(email.toLowerCase().trim(), password);
      } else {
        await loginAdmin();
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = "Identifiants incorrects.";
      
      const errorCode = err.code || (err.message?.includes('auth/') ? err.message.match(/auth\/[a-z-]+/)?.[0] : null);
      
      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
        msg = "Email ou mot de passe incorrect. Vérifiez vos identifiants ou inscrivez-vous si vous n'avez pas encore de compte.";
        
        // Special hint for admin email
        if (email.toLowerCase().trim() === 'fadalfaye75@gmail.com') {
          msg = "Pour le compte administrateur, veuillez utiliser l'onglet 'Admin' et la connexion Google.";
        }
      } else if (errorCode === 'auth/popup-blocked') {
        msg = "Le popup de connexion a été bloqué par votre navigateur. Veuillez autoriser les popups pour ce site.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Veuillez saisir votre email pour réinitialiser votre mot de passe.");
      return;
    }
    setLoading(true);
    try {
      await authService.sendPasswordReset(email.toLowerCase().trim());
      setResetEmailSent(true);
      setError(null);
    } catch (err: any) {
      setError("Erreur lors de l'envoi de l'email de réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-blue/10 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.9, filter: 'blur(20px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <GlassCard className="rounded-[40px] border-white/10 shadow-2xl overflow-hidden" tilt={true}>
          <div className="p-10 text-center relative">
            {/* Scanning Line Effect */}
            <motion.div 
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent z-20 pointer-events-none opacity-30"
            />

            <motion.div 
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
              className="w-20 h-20 bg-gradient-to-br from-primary to-neon-blue text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(108,99,255,0.4)] relative group"
            >
              <GraduationCap size={40} />
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full border-4 border-[#0F0F1A] flex items-center justify-center shadow-lg"
              >
                <Sparkles size={10} className="text-primary" />
              </motion.div>
            </motion.div>

            <h1 className="text-4xl font-black text-white tracking-tighter mb-1">JàngHub</h1>
            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[9px]">
              {mode === 'register' ? "Protocol d'Inscription" : mode === 'class' ? "Terminal Étudiant" : "Noyau d'Administration"}
            </p>
          </div>

          <div className="px-10 pb-10">
            {mode !== 'register' && (
              <div className="flex bg-white/5 p-1 rounded-2xl mb-8 border border-white/5 backdrop-blur-md">
                <button 
                  onClick={() => setMode('class')}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${mode === 'class' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Étudiant
                </button>
                <button 
                  onClick={() => setMode('admin')}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${mode === 'admin' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Admin
                </button>
              </div>
            )}

            {mode === 'register' ? (
              <Register onBack={() => setMode('class')} />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
                      exit={{ opacity: 0, height: 0, filter: 'blur(10px)' }}
                      className="p-4 bg-danger/10 text-danger border border-danger/20 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-3 shadow-lg overflow-hidden"
                    >
                      <AlertCircle size={16} className="shrink-0 text-danger" /> 
                      <span className="leading-relaxed">{error}</span>
                    </motion.div>
                  )}

                  {resetEmailSent && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
                      className="p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-3 shadow-lg overflow-hidden"
                    >
                      <CheckCircle2 size={16} className="shrink-0" /> 
                      <span>Lien de réinitialisation envoyé !</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {mode === 'class' ? (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Email</label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors duration-300">
                          <Mail size={18} />
                        </div>
                        <input 
                          type="email" 
                          required
                          placeholder="votre@email.com" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-white text-sm font-medium placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Mot de passe</label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors duration-300">
                          <Lock size={18} />
                        </div>
                        <input 
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="••••••••" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-14 pr-14 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-white text-sm font-medium placeholder:text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary transition-colors duration-300"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <div className="flex justify-end">
                        <button 
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-[9px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors duration-300"
                        >
                          Oublié ?
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-6">
                    <motion.div 
                      animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="w-20 h-20 bg-white/5 rounded-[32px] flex items-center justify-center mx-auto text-primary border border-white/10 shadow-inner"
                    >
                      <ShieldCheck size={40} />
                    </motion.div>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed px-4">
                      Accès restreint. Authentification biométrique/Google requise pour le terminal d'administration.
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  isLoading={loading}
                  className="w-full py-4 flex items-center justify-center gap-3 group"
                >
                  <span className="font-black uppercase tracking-[0.2em] text-[11px]">
                    {mode === 'class' ? "Initialiser la session" : "Connexion Google Admin"}
                  </span>
                  {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                </Button>

                {mode === 'class' && (
                  <div className="text-center pt-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Nouveau sur la plateforme ?{' '}
                      <button 
                        type="button"
                        onClick={() => setMode('register')}
                        className="text-primary font-black hover:text-white transition-colors ml-1"
                      >
                        S'inscrire
                      </button>
                    </p>
                  </div>
                )}
              </form>
            )}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
