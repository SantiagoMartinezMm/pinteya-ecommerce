import { useState, useCallback } from 'react'
import { BaseHookState } from '@/types/hooks'

export function useLoadingState<E = Error>(): BaseHookState & {
  startLoading: () => void
  stopLoading: (error?: E) => void
  resetState: () => void
} {
  const [state, setState] = useState<BaseHookState>({
    loading: false,
    error: null
  })

  const startLoading = useCallback(() => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }))
  }, [])

  const stopLoading = useCallback((error?: E) => {
    setState(prev => ({
      ...prev,
      loading: false,
      error: error || null
    }))
  }, [])

  const resetState = useCallback(() => {
    setState({
      loading: false,
      error: null
    })
  }, [])

  return {
    ...state,
    startLoading,
    stopLoading,
    resetState
  }
} 