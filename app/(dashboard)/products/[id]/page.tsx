'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { ProductForm } from '@/components/products/product-form'
import { Product } from '@/types/product'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface ProductPageProps {
  params: {
    id: string
  }
}

export default function ProductPage({ params }: ProductPageProps) {
  const router = useRouter()
  const supabase = createClient()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const isNew = params.id === 'new'

  useEffect(() => {
    if (!isNew) {
      const fetchProduct = async () => {
        try {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', params.id)
            .single()

          if (error) throw error
          setProduct(data)
        } catch (error) {
          console.error('Error fetching product:', error)
          router.push('/dashboard/products')
        } finally {
          setLoading(false)
        }
      }

      fetchProduct()
    } else {
      setLoading(false)
    }
  }, [params.id, isNew])

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <RoleGuard requiredPermissions={['can_manage_products']}>
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/products')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {isNew ? 'Nuevo Producto' : 'Editar Producto'}
            </h2>
            <p className="text-muted-foreground">
              {isNew
                ? 'Crea un nuevo producto para tu tienda'
                : 'Modifica los detalles del producto'}
            </p>
          </div>
        </div>

        <ProductForm
          initialData={product}
          onSuccess={() => router.push('/dashboard/products')}
        />
      </div>
    </RoleGuard>
  )
}
