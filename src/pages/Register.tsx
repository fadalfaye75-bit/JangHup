import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowRight, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  User,
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui';

export const Register: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { registerUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [classCode, setClassCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      setLoading(false);
      return;
    }

    try {
      await registerUser(email.toLowerCase().trim(), password, name, classCode);
    } catch (err: any) {
      console.error("Registration error:", err);
      let msg = "Erreur lors de l'inscription.";
      if (err.code === 'auth/email-already-in-use') {
        msg = "Cet email est déjà utilisé.";
      } else if (err.code === 'auth/invalid-email') {
        msg = "Email invalide.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-primary transition-all font-bold text-[10px] uppercase tracking-wider mb-4 group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform"/> 
        Retour
      </button>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">Nouveau Profil</h2>
        <p className="text-[var(--text-secondary)] font-medium text-xs mt-1">Créez votre compte étudiant</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
        </AnimatePresence>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Nom Complet</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text"
                required
                placeholder="Prénom Nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-standard pl-12"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-primary transition-colors" size={18} />
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
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Code d'Inscription</label>
            <div className="relative group">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text"
                required
                placeholder="Code fourni par votre délégué"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                className="input-standard pl-12"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Mot de passe</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-primary transition-colors" size={18} />
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
          </div>
        </div>

        <Button
          type="submit"
          isLoading={loading}
          className="w-full py-3.5 flex items-center justify-center gap-2 group mt-4"
        >
          <span className="font-bold uppercase tracking-wider text-xs">Finaliser l'inscription</span>
          {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>}
        </Button>
      </form>
    </motion.div>
  );
};
