import React, { Component, ComponentType } from 'react';
import { ErrorState, LoadingState } from '@/types/dashboard';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

interface WithErrorBoundaryProps {
  errorState: ErrorState;
  loadingState: LoadingState;
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>
) {
  return class ErrorBoundary extends Component<P & WithErrorBoundaryProps> {
    state = {
      hasError: false,
      error: null as Error | null
    };

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    render() {
      const { errorState, loadingState, ...props } = this.props;

      if (this.state.hasError || errorState.hasError) {
        return (
          <Alert variant="destructive">
            <h4>Error</h4>
            <p>{this.state.error?.message || errorState.message}</p>
          </Alert>
        );
      }

      if (loadingState.isLoading) {
        return (
          <div className="flex items-center justify-center p-4">
            <Spinner />
            {loadingState.stage && (
              <p className="ml-2 text-sm text-muted-foreground">
                {loadingState.stage}
              </p>
            )}
          </div>
        );
      }

      return <WrappedComponent {...props as P} />;
    }
  };
}