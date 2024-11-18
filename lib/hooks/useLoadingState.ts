import { useState, useCallback } from 'react';
import { LoadingState } from '@/types/dashboard';

export function useLoadingState(initialState: Partial<LoadingState> = {}) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    stage: undefined,
    ...initialState
  });

  const startLoading = useCallback((stage?: string) => {
    setLoadingState({
      isLoading: true,
      progress: 0,
      stage
    });
  }, []);

  const updateProgress = useCallback((progress: number, stage?: string) => {
    setLoadingState(prev => ({
      ...prev,
      progress,
      stage: stage || prev.stage
    }));
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingState({
      isLoading: false,
      progress: 100,
      stage: undefined
    });
  }, []);

  return {
    loadingState,
    startLoading,
    updateProgress,
    stopLoading
  };
}