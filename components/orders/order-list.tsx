'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Order, OrderStatus, PaymentStatus } from '@/types/order'
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
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface OrderListProps {
  filters: {
    search: string
    status: OrderStatus | ''
    paymentStatus: PaymentStatus | ''
    dateRange: {
      from: Date | null
      to: Date | null
    }
  }
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const paymentStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
}

export function OrderList({ filters }: OrderListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        let query = supabase
          .from('orders')
          .select('*, items:order_items(*)')

        // Aplicar filtros
        if (filters.search) {
          query = query.or(`order_number.ilike.%${filters.search}%,shipping_address->street.ilike.%${filters.search}%`)
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.paymentStatus) {
          query = query.eq('payment_status', filters.paymentStatus)
        }
        if (filters.dateRange.from) {
          query = query.gte('created_at', filters.dateRange.from.toISOString())
        }
        if (filters.dateRange.to) {
          query = query.lte('created_at', filters.dateRange.to.toISOString())
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) throw error
        setOrders(data)
      } catch (error) {
        console.error('Error fetching orders:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [filters])

  if (loading) {
    return <div>Cargando órdenes...</div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número de Orden</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead>Total</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                {order.order_number}
              </TableCell>
              <TableCell>
                {format(new Date(order.created_at), 'PPp', { locale: es })}
              </TableCell>
              <TableCell>
                {order.shipping_address.street} {order.shipping_address.number}
              </TableCell>
              <TableCell>
                <Badge
                  className={statusColors[order.status]}
                  variant="secondary"
                >
                  {order.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  className={paymentStatusColors[order.payment_status]}
                  variant="secondary"
                >
                  {order.payment_status}
                </Badge>
              </TableCell>
              <TableCell>${order.total.toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                >
                  Ver detalles
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
