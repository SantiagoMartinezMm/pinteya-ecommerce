'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { VendorProfile, VendorStatus } from '@/types/vendor'
import { createClient } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, Edit2, Store } from 'lucide-react'

interface VendorListProps {
  filters: {
    search: string
    status: VendorStatus | ''
    businessType: string
    sortBy: 'rating' | 'sales' | 'created' | ''
  }
}

const statusColors = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
  inactive: 'bg-gray-100 text-gray-800',
}

export function VendorList({ filters }: VendorListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [vendors, setVendors] = useState<VendorProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true)
        let query = supabase
          .from('vendor_profiles')
          .select('*')

        if (filters.search) {
          query = query.or(
            `business_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`
          )
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.businessType) {
          query = query.eq('business_type', filters.businessType)
        }

        // Aplicar ordenamiento
        switch (filters.sortBy) {
          case 'rating':
            query = query.order('rating', { ascending: false })
            break
          case 'sales':
            query = query.order('total_sales', { ascending: false })
            break
          case 'created':
            query = query.order('created_at', { ascending: false })
            break
        }

        const { data, error } = await query

        if (error) throw error
        setVendors(data)
      } catch (error) {
        console.error('Error fetching vendors:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVendors()
  }, [filters])

  if (loading) {
    return <div>Cargando vendedores...</div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Negocio</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Calificación</TableHead>
            <TableHead>Ventas Totales</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((vendor) => (
            <TableRow key={vendor.id}>
              <TableCell className="font-medium">
                {vendor.business_name}
              </TableCell>
              <TableCell>{vendor.business_type}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{vendor.contact_email}</span>
                  <span className="text-sm text-muted-foreground">
                    {vendor.contact_phone}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  className={statusColors[vendor.status]}
                  variant="secondary"
                >
                  {vendor.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Star className="mr-1 h-4 w-4 fill-primary text-primary" />
                  {vendor.rating.toFixed(1)}
                </div>
              </TableCell>
              <TableCell>${vendor.total_sales.toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(`/dashboard/vendors/${vendor.id}/store`)}
                >
                  <Store className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(`/dashboard/vendors/${vendor.id}`)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
