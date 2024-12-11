'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product } from '@/types/product'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageUpload } from '@/components/ui/image-upload'

interface ProductFormProps {
  initialData?: Product | null
  onSuccess: () => void
}

export function ProductForm({ initialData, onSuccess }: ProductFormProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Product>>(
    initialData || {
      name: '',
      code: '',
      price: 0,
      description: '',
      category: '',
      brand: '',
      sku: '',
      stock: 0,
      features: [],
      images: [],
    }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (initialData) {
        // Actualizar producto existente
        const { error } = await supabase
          .from('products')
          .update(formData)
          .eq('id', initialData.id)

        if (error) throw error
      } else {
        // Crear nuevo producto
        const { error } = await supabase
          .from('products')
          .insert([formData])

        if (error) throw error
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving product:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `product-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath)

      setFormData({
        ...formData,
        image: publicUrl,
        images: [...(formData.images || []), publicUrl],
      })
    } catch (error) {
      console.error('Error uploading image:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del Producto</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Código</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) =>
              setFormData({ ...formData, code: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Precio</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: parseFloat(e.target.value) })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stock">Stock</Label>
          <Input
            id="stock"
            type="number"
            min="0"
            value={formData.stock}
            onChange={(e) =>
              setFormData({ ...formData, stock: parseInt(e.target.value) })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Categoría</Label>
          <Select
            value={formData.category}
            onValueChange={(value) =>
              setFormData({ ...formData, category: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pinturas">Pinturas</SelectItem>
              <SelectItem value="herramientas">Herramientas</SelectItem>
              <SelectItem value="accesorios">Accesorios</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Marca</Label>
          <Select
            value={formData.brand}
            onValueChange={(value) =>
              setFormData({ ...formData, brand: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alba">Alba</SelectItem>
              <SelectItem value="sherwin-williams">Sherwin Williams</SelectItem>
              <SelectItem value="tersuave">Tersuave</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Imágenes</Label>
        <div className="grid gap-4 md:grid-cols-3">
          <ImageUpload
            value={formData.images}
            onChange={handleImageUpload}
            onRemove={(url) =>
              setFormData({
                ...formData,
                images: formData.images?.filter((image) => image !== url),
              })
            }
          />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear'}
      </Button>
    </form>
  )
}
