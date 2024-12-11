'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error en la autenticación:', error.message)
        router.push('/login?error=auth')
        return
      }

      // Redirigir al dashboard después de una autenticación exitosa
      router.push('/dashboard')
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-lg text-muted-foreground">Autenticando...</p>
      </div>
    </div>
  )
}
