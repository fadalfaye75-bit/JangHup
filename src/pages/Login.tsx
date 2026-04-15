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
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[32px] shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="p-10 text-center">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <GraduationCap size={32} />
            </motion.div>

            <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight mb-1">JàngHub</h1>
            <p className="text-[var(--text-secondary)] font-medium text-sm">
              {mode === 'register' ? "Inscription" : mode === 'class' ? "Espace Étudiant" : "Administration"}
            </p>
          </div>

          <div className="px-10 pb-10">
            {mode !== 'register' && (
              <div className="flex bg-[var(--bg-main)] p-1 rounded-xl mb-8 border border-[var(--border-main)]">
                <button 
                  onClick={() => setMode('class')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${mode === 'class' ? 'bg-[var(--bg-card)] text-primary shadow-sm border border-[var(--border-main)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'}`}
                >
                  Étudiant
                </button>
                <button 
                  onClick={() => setMode('admin')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${mode === 'admin' ? 'bg-[var(--bg-card)] text-primary shadow-sm border border-[var(--border-main)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'}`}
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
                      className="p-4 bg-danger/5 text-danger border border-danger/10 rounded-xl text-xs font-medium flex items-center gap-3 overflow-hidden"
                    >
                      <AlertCircle size={16} className="shrink-0"/> 
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {resetEmailSent && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-success/5 text-success border border-success/10 rounded-xl text-xs font-medium flex items-center gap-3 overflow-hidden"
                    >
                      <CheckCircle2 size={16} className="shrink-0"/> 
                      <span>Lien de réinitialisation envoyé !</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {mode === 'class' ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Email</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-primary transition-colors">
                          <Mail size={18} />
                        </div>
                        <input 
                          type="email"
                          required
                          placeholder="votre@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="input-standard pl-12"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Mot de passe</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-primary transition-colors">
                          <Lock size={18} />
                        </div>
                        <input 
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="input-standard pl-12 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <div className="flex justify-end">
                        <button 
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-[10px] font-bold text-primary uppercase tracking-wider hover:text-[var(--text-main)] transition-colors"
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-[var(--bg-main)] rounded-2xl flex items-center justify-center mx-auto text-primary border border-[var(--border-main)] shadow-inner">
                      <ShieldCheck size={32} />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed px-4">
                      Accès restreint. Authentification Google requise pour le terminal d'administration.
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  isLoading={loading}
                  className="w-full py-3.5 flex items-center justify-center gap-2 group"
                >
                  <span className="font-bold uppercase tracking-wider text-xs">
                    {mode === 'class' ? "Se connecter" : "Connexion Google Admin"}
                  </span>
                  {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>}
                </Button>

                {mode === 'class' && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-[var(--text-secondary)] font-medium">
                      Pas encore de compte ?{' '}
                      <button 
                        type="button"
                        onClick={() => setMode('register')}
                        className="text-primary font-bold hover:underline ml-1"
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
