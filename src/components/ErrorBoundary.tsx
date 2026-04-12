import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Btn } from '../../components/ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔥 Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="max-w-md w-full bg-white dark:bg-white/5 rounded-[2.5rem] p-10 border border-slate-200 dark:border-white/10 shadow-2xl text-center">
            <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <AlertTriangle size={40} className="text-rose-500" />
            </div>
            
            <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">
              Oups ! Quelque chose s'est mal passé.
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Une erreur inattendue est survenue. Nos ingénieurs ont été notifiés (enfin, ils le seront bientôt).
            </p>

            <div className="bg-slate-50 dark:bg-black/20 rounded-2xl p-4 mb-8 text-left overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Détails techniques</p>
              <p className="text-xs font-mono text-rose-500 break-all">
                {this.state.error?.message || 'Erreur inconnue'}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Btn onClick={() => window.location.reload()} className="w-full flex items-center justify-center gap-2">
                <RefreshCw size={18} /> Réessayer
              </Btn>
              <Btn variant="secondary" onClick={this.handleReset} className="w-full flex items-center justify-center gap-2">
                <Home size={18} /> Retour à l'accueil
              </Btn>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
