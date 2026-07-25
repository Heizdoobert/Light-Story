import { Component, ReactNode } from 'react';
import { StatusErrorPage } from './StatusErrorPage';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: Readonly<ErrorBoundaryProps>;

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

    const isDevelopment = process.env.NODE_ENV !== 'production';

    return (
      <StatusErrorPage
        statusCode={500}
        title="Internal Server Error"
        message={
          isDevelopment && this.state.error?.message
            ? this.state.error.message
            : 'An unexpected runtime error occurred. Please reload and try again.'
        }
        actionLabel="Return Home"
        actionHref="/"
        showReload
      />
    );
  }
}
