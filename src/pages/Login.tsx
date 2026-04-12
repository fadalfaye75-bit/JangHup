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

import { Register } from './Register';
import { authService } from '../services/authService';

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
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden relative z-10"
      >
        <div className="p-10 text-center relative">
          <div className="w-20 h-20 bg-primary text-white rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/30 relative group">
            <GraduationCap size={40} />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center">
              <Sparkles size={10} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">JangHup</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
            {mode === 'register' ? "Inscription Étudiant" : mode === 'class' ? "Espace Étudiant & Délégué" : "Administration Centrale"}
          </p>
        </div>

        <div className="px-10 pb-10">
          {mode !== 'register' && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-8">
              <button 
                onClick={() => setMode('class')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${mode === 'class' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'}`}
              >
                Étudiant
              </button>
              <button 
                onClick={() => setMode('admin')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${mode === 'admin' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'}`}
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
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-2xl text-xs font-bold flex items-center gap-3"
                  >
                    <AlertCircle size={18} className="shrink-0" /> 
                    <span className="break-words">{error}</span>
                  </motion.div>
                )}

                {resetEmailSent && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-xs font-bold flex items-center gap-3"
                  >
                    <CheckCircle2 size={18} className="shrink-0" /> 
                    <span className="break-words">Email de réinitialisation envoyé ! Vérifiez votre boîte de réception.</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {mode === 'class' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="email" 
                        required
                        placeholder="votre@email.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Mot de passe</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    <div className="flex justify-end mt-2">
                      <button 
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <ShieldCheck size={32} />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Connectez-vous avec votre compte administrateur Google pour gérer les classes et les utilisateurs.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 group"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    {mode === 'class' ? "Se connecter" : "Connexion Admin Google"}
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {mode === 'class' && (
                <div className="text-center mt-6">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Pas encore de compte ?{' '}
                    <button 
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-primary font-bold hover:underline"
                    >
                      S'inscrire
                    </button>
                  </p>
                </div>
              )}
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
