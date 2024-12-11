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
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { OrderStatus, PaymentStatus } from '@/types/order'

interface OrderFiltersProps {
  filters: {
    search: string
    status: OrderStatus | ''
    paymentStatus: PaymentStatus | ''
    dateRange: {
      from: Date | null
      to: Date | null
    }
  }
  onFiltersChange: (filters: OrderFiltersProps['filters']) => void
}

export function OrderFilters({ filters, onFiltersChange }: OrderFiltersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="search">Buscar</Label>
        <Input
          id="search"
          placeholder="Número de orden, dirección..."
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
            onFiltersChange({ ...filters, status: value as OrderStatus })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="processing">Procesando</SelectItem>
            <SelectItem value="shipped">Enviado</SelectItem>
            <SelectItem value="delivered">Entregado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Estado de Pago</Label>
        <Select
          value={filters.paymentStatus}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, paymentStatus: value as PaymentStatus })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="processing">Procesando</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="failed">Fallido</SelectItem>
            <SelectItem value="refunded">Reembolsado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Rango de Fechas</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`w-full justify-start text-left font-normal ${
                !filters.dateRange.from && 'text-muted-foreground'
              }`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateRange.from ? (
                filters.dateRange.to ? (
                  <>
                    {format(filters.dateRange.from, 'P', { locale: es })} -{' '}
                    {format(filters.dateRange.to, 'P', { locale: es })}
                  </>
                ) : (
                  format(filters.dateRange.from, 'P', { locale: es })
                )
              ) : (
                <span>Seleccionar fechas</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filters.dateRange.from || undefined}
              selected={{
                from: filters.dateRange.from || undefined,
                to: filters.dateRange.to || undefined,
              }}
              onSelect={(range: any) => {
                onFiltersChange({
                  ...filters,
                  dateRange: {
                    from: range?.from || null,
                    to: range?.to || null,
                  },
                })
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
