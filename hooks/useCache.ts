import { useState, useEffect } from 'react'

interface CacheOptions {
  key: string
  ttl?: number // Time to live en milisegundos
}

export function useCache<T>(options: CacheOptions) {
  const { key, ttl = 1000 * 60 * 5 } = options // 5 minutos por defecto

  const [data, setData] = useState<T | null>(() => {
    const cached = localStorage.getItem(key)
    if (cached) {
      const { value, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < ttl) {
        return value
      }
      localStorage.removeItem(key)
    }
    return null
  })

  useEffect(() => {
    if (data) {
      localStorage.setItem(key, JSON.stringify({
        value: data,
        timestamp: Date.now()
      }))
    }
  }, [data, key])

  return [data, setData] as const
} 