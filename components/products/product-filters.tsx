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
import { Switch } from '@/components/ui/switch'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ProductFiltersProps {
  filters: {
    search: string
    category: string
    brand: string
    inStock: boolean
  }
  onFiltersChange: (filters: ProductFiltersProps['filters']) => void
}

export function ProductFilters({ filters, onFiltersChange }: ProductFiltersProps) {
  const supabase = createClient()
  const [categories, setCategories] = useState<string[]>([])
  const [brands, setBrands] = useState<string[]>([])

  useEffect(() => {
    const fetchOptions = async () => {
      // Obtener categorías únicas
      const { data: categoriesData } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null)

      if (categoriesData) {
        const uniqueCategories = [...new Set(categoriesData.map(item => item.category))]
        setCategories(uniqueCategories)
      }

      // Obtener marcas únicas
      const { data: brandsData } = await supabase
        .from('products')
        .select('brand')
        .not('brand', 'is', null)

      if (brandsData) {
        const uniqueBrands = [...new Set(brandsData.map(item => item.brand))]
        setBrands(uniqueBrands)
      }
    }

    fetchOptions()
  }, [])

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="search">Buscar</Label>
        <Input
          id="search"
          placeholder="Buscar productos..."
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Categoría</Label>
        <Select
          value={filters.category}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, category: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las categorías</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Marca</Label>
        <Select
          value={filters.brand}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, brand: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas las marcas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las marcas</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand} value={brand}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end gap-2">
        <Label className="flex items-center gap-2">
          <Switch
            checked={filters.inStock}
            onCheckedChange={(checked) =>
              onFiltersChange({ ...filters, inStock: checked })
            }
          />
          Solo productos en stock
        </Label>
      </div>
    </div>
  )
}
