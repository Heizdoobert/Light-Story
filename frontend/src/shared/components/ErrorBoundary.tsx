import React, { ReactNode } from 'react';
import { StatusErrorPage } from './StatusErrorPage';

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

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <StatusErrorPage
        statusCode={500}
        title="Internal Server Error"
        message={this.state.error?.message || 'An unexpected runtime error occurred. Please reload and try again.'}
        actionLabel="Return Home"
        actionHref="/"
        showReload
      />
    );
  }
}
