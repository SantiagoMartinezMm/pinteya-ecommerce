'use client'

import { useState } from 'react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { VendorList } from '@/components/vendors/vendor-list'
import { VendorFilters } from '@/components/vendors/vendor-filters'
import { VendorStats } from '@/components/vendors/vendor-stats'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { VendorStatus } from '@/types/vendor'

interface VendorFilters {
  search: string
  status: VendorStatus | ''
  businessType: string
  sortBy: 'rating' | 'sales' | 'created' | ''
}

export default function VendorsPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<VendorFilters>({
    search: '',
    status: '',
    businessType: '',
    sortBy: '',
  })

  return (
    <RoleGuard requiredPermissions={['can_manage_vendors']}>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Vendedores</h2>
            <p className="text-muted-foreground">
              Gestiona los vendedores y sus tiendas
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/vendors/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Vendedor
          </Button>
        </div>

        <VendorStats />
        <VendorFilters filters={filters} onFiltersChange={setFilters} />
        <VendorList filters={filters} />
      </div>
    </RoleGuard>
  )
}
