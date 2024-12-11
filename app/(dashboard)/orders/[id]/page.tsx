'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types/order'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface OrderPageProps {
  params: {
    id: string
  }
}

export default function OrderPage({ params }: OrderPageProps) {
  const router = useRouter()
  const supabase = createClient()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .eq('id', params.id)
          .single()

        if (error) throw error
        setOrder(data)
      } catch (error) {
        console.error('Error fetching order:', error)
        router.push('/dashboard/orders')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [params.id])

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!order) {
    return <div>Orden no encontrada</div>
  }

  return (
    <RoleGuard requiredPermissions={['can_manage_orders']}>
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/orders')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Orden #{order.order_number}
            </h2>
            <p className="text-muted-foreground">
              Creada el {format(new Date(order.created_at), 'PPp', { locale: es })}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Orden</CardTitle>
              <CardDescription>Información general de la orden</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant="secondary">{order.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado de Pago:</span>
                <Badge variant="secondary">{order.payment_status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Método de Pago:</span>
                <span>{order.payment_method}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dirección de Envío</CardTitle>
              <CardDescription>Detalles de entrega</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                {order.shipping_address.street} {order.shipping_address.number}
              </p>
              <p>
                {order.shipping_address.city}, {order.shipping_address.state}
              </p>
              <p>{order.shipping_address.zip_code}</p>
              {order.shipping_address.additional_info && (
                <p className="text-muted-foreground">
                  {order.shipping_address.additional_info}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
            <CardDescription>Detalle de los productos ordenados</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio Unitario</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product.name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      ${item.total_price.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    Subtotal
                  </TableCell>
                  <TableCell className="text-right">
                    ${order.subtotal.toFixed(2)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    Envío
                  </TableCell>
                  <TableCell className="text-right">
                    ${order.shipping_cost.toFixed(2)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    Impuestos
                  </TableCell>
                  <TableCell className="text-right">
                    ${order.tax.toFixed(2)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    ${order.total.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {order.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{order.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  )
}
