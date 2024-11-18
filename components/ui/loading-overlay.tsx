import { LoadingState } from '@/types/dashboard';

interface LoadingOverlayProps {
  loadingState: LoadingState;
}

export function LoadingOverlay({ loadingState }: LoadingOverlayProps) {
  if (!loadingState.isLoading) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary rounded-full animate-spin border-t-transparent" />
          {loadingState.progress > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium">
                {Math.round(loadingState.progress)}%
              </span>
            </div>
          )}
        </div>
        {loadingState.stage && (
          <p className="text-sm text-muted-foreground">{loadingState.stage}</p>
        )}
      </div>
    </div>
  );
}