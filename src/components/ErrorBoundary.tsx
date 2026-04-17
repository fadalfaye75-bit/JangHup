import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center animate-pulse">
            <AlertTriangle size={32} />
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Oups ! Quelque chose s'est mal passé</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">
              Nous avons rencontré une erreur inattendue. Nos ingénieurs ont été notifiés.
            </p>
          </div>
          <Button 
            onClick={this.handleReset}
            className="flex items-center gap-2"
          >
            <RefreshCcw size={18} />
            <span>Réessayer l'application</span>
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left overflow-auto max-w-2xl max-h-40">
              <code className="text-xs text-red-500">{this.state.error?.toString()}</code>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
