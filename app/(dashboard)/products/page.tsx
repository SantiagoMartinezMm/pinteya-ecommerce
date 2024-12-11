'use client'

import { useState } from 'react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { ProductList } from '@/components/products/product-list'
import { ProductFilters } from '@/components/products/product-filters'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ProductsPage() {
  const router = useRouter()
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    brand: '',
    inStock: false,
  })

  return (
    <RoleGuard requiredPermissions={['can_manage_products']}>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Productos</h2>
            <p className="text-muted-foreground">
              Gestiona el catálogo de productos de tu tienda
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/products/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>

        <ProductFilters filters={filters} onFiltersChange={setFilters} />
        <ProductList filters={filters} />
      </div>
    </RoleGuard>
  )
}
