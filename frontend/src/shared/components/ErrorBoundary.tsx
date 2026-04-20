import React, { ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error): void {
    console.error('ErrorBoundary caught an error:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-center p-6">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-3xl font-black mb-4">Something went wrong</h1>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          The application encountered an unexpected render error. Please reload and try again.
        </p>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl mb-8 w-full max-w-lg overflow-auto">
          <code className="text-xs text-red-600 dark:text-red-400 font-mono break-all">
            {this.state.error?.message || 'Unknown error'}
          </code>
        </div>
        <button
          onClick={this.handleReload}
          className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          Reload Application
        </button>
      </div>
    );
  }
}
