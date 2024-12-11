'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { VendorForm } from '@/components/vendors/vendor-form'
import { VendorProfile } from '@/types/vendor'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface VendorPageProps {
  params: {
    id: string
  }
}

export default function VendorPage({ params }: VendorPageProps) {
  const router = useRouter()
  const supabase = createClient()
  const [vendor, setVendor] = useState<VendorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const isNew = params.id === 'new'

  useEffect(() => {
    if (!isNew) {
      const fetchVendor = async () => {
        try {
          const { data, error } = await supabase
            .from('vendor_profiles')
            .select('*')
            .eq('id', params.id)
            .single()

          if (error) throw error
          setVendor(data)
        } catch (error) {
          console.error('Error fetching vendor:', error)
          router.push('/dashboard/vendors')
        } finally {
          setLoading(false)
        }
      }

      fetchVendor()
    } else {
      setLoading(false)
    }
  }, [params.id, isNew])

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <RoleGuard requiredPermissions={['can_manage_vendors']}>
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/vendors')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {isNew ? 'Nuevo Vendedor' : 'Editar Vendedor'}
            </h2>
            <p className="text-muted-foreground">
              {isNew
                ? 'Registra un nuevo vendedor en la plataforma'
                : 'Modifica los detalles del vendedor'}
            </p>
          </div>
        </div>

        <VendorForm
          initialData={vendor}
          onSuccess={() => router.push('/dashboard/vendors')}
        />
      </div>
    </RoleGuard>
  )
}
