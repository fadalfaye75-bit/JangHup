import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowRight, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  GraduationCap,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui';
import { authService } from '../services/authService';
import { Register } from './Register';

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-10 text-center">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-14 h-14 bg-blue-500 text-white rounded-xl flex items-center justify-center mx-auto mb-6 shadow-md"
            >
              <GraduationCap size={28} />
            </motion.div>

            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight mb-1">JàngHub</h1>
            <p className="text-[14px] text-gray-500 dark:text-gray-400">
              {mode === 'register' ? "Inscription" : mode === 'class' ? "Espace Étudiant" : "Administration"}
            </p>
          </div>

          <div className="px-10 pb-10">
            {mode !== 'register' && (
              <div className="flex bg-gray-50 dark:bg-gray-900 p-1 rounded-lg mb-8 border border-gray-200 dark:border-gray-800">
                <button 
                  onClick={() => setMode('class')}
                  className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-all duration-200 ${mode === 'class' ? 'bg-white dark:bg-gray-800 text-blue-500 shadow-sm border border-gray-200 dark:border-gray-700' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  Étudiant
                </button>
                <button 
                  onClick={() => setMode('admin')}
                  className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-all duration-200 ${mode === 'admin' ? 'bg-white dark:bg-gray-800 text-blue-500 shadow-sm border border-gray-200 dark:border-gray-700' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
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
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/20 rounded-lg text-[12px] font-medium flex items-center gap-3 overflow-hidden"
                    >
                      <AlertCircle size={14} className="shrink-0"/> 
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {resetEmailSent && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20 rounded-lg text-[12px] font-medium flex items-center gap-3 overflow-hidden"
                    >
                      <CheckCircle2 size={14} className="shrink-0"/> 
                      <span>Lien de réinitialisation envoyé !</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {mode === 'class' ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Email</label>
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                          <Mail size={16} />
                        </div>
                        <input 
                          type="email"
                          required
                          placeholder="votre@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg pl-10 pr-4 py-2 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Mot de passe</label>
                      <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                          <Lock size={16} />
                        </div>
                        <input 
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg pl-10 pr-10 py-2 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <div className="flex justify-end">
                        <button 
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-4">
                    <div className="w-14 h-14 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center mx-auto text-blue-500 border border-gray-200 dark:border-gray-800 shadow-inner">
                      <ShieldCheck size={28} />
                    </div>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed px-4">
                      Accès restreint. Authentification Google requise pour le terminal d'administration.
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  isLoading={loading}
                  className="w-full py-2.5 flex items-center justify-center gap-2 group"
                >
                  <span className="text-[13px] font-medium">
                    {mode === 'class' ? "Se connecter" : "Connexion Google Admin"}
                  </span>
                  {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>}
                </Button>

                {mode === 'class' && (
                  <div className="text-center pt-2">
                    <p className="text-[13px] text-gray-500 dark:text-gray-400">
                      Pas encore de compte ?{' '}
                      <button 
                        type="button"
                        onClick={() => setMode('register')}
                        className="text-blue-500 font-semibold hover:underline ml-1"
                      >
                        S'inscrire
                      </button>
                    </p>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
