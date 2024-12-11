'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { VendorProfile } from '@/types/vendor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface VendorFormProps {
  initialData?: VendorProfile | null
  onSuccess: () => void
}

export function VendorForm({ initialData, onSuccess }: VendorFormProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<VendorProfile>>(
    initialData || {
      business_name: '',
      business_type: '',
      tax_id: '',
      contact_email: '',
      contact_phone: '',
      status: 'pending',
      commission_rate: 10,
      payment_info: {},
      address: {
        street: '',
        number: '',
        city: '',
        state: '',
        zip_code: '',
        country: '',
      },
    }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (initialData) {
        // Actualizar vendedor existente
        const { error } = await supabase
          .from('vendor_profiles')
          .update(formData)
          .eq('id', initialData.id)

        if (error) throw error
      } else {
        // Crear nuevo vendedor
        const { error } = await supabase
          .from('vendor_profiles')
          .insert([formData])

        if (error) throw error
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving vendor:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Información del Negocio</CardTitle>
          <CardDescription>
            Datos principales del vendedor
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business_name">Nombre del Negocio</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) =>
                  setFormData({ ...formData, business_name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Negocio</Label>
              <Select
                value={formData.business_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, business_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Minorista</SelectItem>
                  <SelectItem value="wholesale">Mayorista</SelectItem>
                  <SelectItem value="manufacturer">Fabricante</SelectItem>
                  <SelectItem value="distributor">Distribuidor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_id">ID Fiscal</Label>
              <Input
                id="tax_id"
                value={formData.tax_id}
                onChange={(e) =>
                  setFormData({ ...formData, tax_id: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="suspended">Suspendido</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información de Contacto</CardTitle>
          <CardDescription>
            Datos de contacto del vendedor
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Email de Contacto</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) =>
                  setFormData({ ...formData, contact_email: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">Teléfono de Contacto</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) =>
                  setFormData({ ...formData, contact_phone: e.target.value })
                }
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dirección</CardTitle>
          <CardDescription>
            Ubicación física del negocio
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="street">Calle</Label>
              <Input
                id="street"
                value={formData.address?.street}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address!, street: e.target.value },
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="number">Número</Label>
              <Input
                id="number"
                value={formData.address?.number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address!, number: e.target.value },
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={formData.address?.city}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address!, city: e.target.value },
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado/Provincia</Label>
              <Input
                id="state"
                value={formData.address?.state}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address!, state: e.target.value },
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip_code">Código Postal</Label>
              <Input
                id="zip_code"
                value={formData.address?.zip_code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address!, zip_code: e.target.value },
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={formData.address?.country}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: { ...formData.address!, country: e.target.value },
                  })
                }
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información de Pago</CardTitle>
          <CardDescription>
            Datos bancarios para pagos
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Nombre del Banco</Label>
              <Input
                id="bank_name"
                value={formData.payment_info?.bank_name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payment_info: {
                      ...formData.payment_info!,
                      bank_name: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Número de Cuenta</Label>
              <Input
                id="account_number"
                value={formData.payment_info?.account_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payment_info: {
                      ...formData.payment_info!,
                      account_number: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="holder_name">Nombre del Titular</Label>
              <Input
                id="holder_name"
                value={formData.payment_info?.holder_name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payment_info: {
                      ...formData.payment_info!,
                      holder_name: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Cuenta</Label>
              <Select
                value={formData.payment_info?.account_type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    payment_info: {
                      ...formData.payment_info!,
                      account_type: value,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Cuenta Corriente</SelectItem>
                  <SelectItem value="savings">Caja de Ahorro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  )
}
