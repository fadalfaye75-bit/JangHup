import React, { useState } from 'react';
import { auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { 
  Loader2, 
  ArrowRight, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (user: any) => void;
}

export const Login: React.FC<LoginProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError("Erreur lors de la connexion avec Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.toLowerCase().trim();

    try {
      if (isSignUp) {
        if (password.length < 6) {
          throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
        }
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = err.message;
      
      if (msg.includes("auth/operation-not-allowed")) {
        msg = "La connexion par email n'est pas encore activée dans la console Firebase.";
      } else if (msg.includes("auth/invalid-credential") || msg.includes("auth/user-not-found") || msg.includes("auth/wrong-password")) {
        msg = "Identifiants incorrects.";
      } else if (msg.includes("auth/email-already-in-use")) {
        msg = "Cet email est déjà utilisé.";
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClassLogin = (classEmail: string) => {
    setEmail(classEmail);
    setPassword('passer25');
    setIsSignUp(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden relative z-10"
      >
        <div className="p-10 text-center relative">
          <div className="w-20 h-20 bg-primary text-white rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/30 relative group">
            <GraduationCap size={40} />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center">
              <Sparkles size={10} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">JangHup</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
            {isSignUp ? "Rejoignez la communauté" : "Votre plateforme d'apprentissage connectée"}
          </p>
        </div>

        <div className="px-10 pb-10">
          <form onSubmit={handleAuth} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-2xl text-xs font-bold flex items-center gap-3"
              >
                <AlertCircle size={18} className="shrink-0" /> 
                <span className="break-words">{error}</span>
              </motion.div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Identifiant Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="email" 
                    required
                    placeholder="votre@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-12"
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
                    className="input pl-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-4 rounded-2xl relative overflow-hidden group"
            >
              {loading && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
              )}
              <span className="flex items-center gap-3">
                {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? "Créer mon compte" : "Se connecter")}
                {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
              </span>
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
              <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Ou</span>
              <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="btn btn-secondary w-full py-3.5 rounded-2xl gap-3 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>

            <div className="text-center space-y-6 pt-4">
              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm font-bold text-primary hover:underline"
              >
                {isSignUp ? "Déjà membre ? Connexion" : "Nouveau ? Créer un compte"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
