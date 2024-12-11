import { useState, useCallback } from 'react'

interface RetryOptions {
  maxAttempts?: number
  delay?: number
  backoff?: boolean
}

export function useRetry(options: RetryOptions = {}) {
  const { maxAttempts = 3, delay = 1000, backoff = true } = options
  const [attempts, setAttempts] = useState(0)

  const retry = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    try {
      return await operation()
    } catch (error) {
      if (attempts >= maxAttempts) {
        throw error
      }

      const nextAttempt = attempts + 1
      setAttempts(nextAttempt)

      const waitTime = backoff ? delay * Math.pow(2, attempts) : delay
      await new Promise(resolve => setTimeout(resolve, waitTime))

      return retry(operation)
    }
  }, [attempts, maxAttempts, delay, backoff])

  const reset = useCallback(() => {
    setAttempts(0)
  }, [])

  return { retry, attempts, reset }
} 