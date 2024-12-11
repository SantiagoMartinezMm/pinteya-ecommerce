'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VendorStatus } from '@/types/vendor'

interface VendorFiltersProps {
  filters: {
    search: string
    status: VendorStatus | ''
    businessType: string
    sortBy: 'rating' | 'sales' | 'created' | ''
  }
  onFiltersChange: (filters: VendorFiltersProps['filters']) => void
}

export function VendorFilters({ filters, onFiltersChange }: VendorFiltersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="search">Buscar</Label>
        <Input
          id="search"
          placeholder="Nombre del negocio, email..."
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Estado</Label>
        <Select
          value={filters.status}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, status: value as VendorStatus })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los estados</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="suspended">Suspendido</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Tipo de Negocio</Label>
        <Select
          value={filters.businessType}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, businessType: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los tipos</SelectItem>
            <SelectItem value="retail">Minorista</SelectItem>
            <SelectItem value="wholesale">Mayorista</SelectItem>
            <SelectItem value="manufacturer">Fabricante</SelectItem>
            <SelectItem value="distributor">Distribuidor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Ordenar por</Label>
        <Select
          value={filters.sortBy}
          onValueChange={(value: any) =>
            onFiltersChange({ ...filters, sortBy: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Sin ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sin ordenar</SelectItem>
            <SelectItem value="rating">Calificación</SelectItem>
            <SelectItem value="sales">Ventas</SelectItem>
            <SelectItem value="created">Más recientes</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
