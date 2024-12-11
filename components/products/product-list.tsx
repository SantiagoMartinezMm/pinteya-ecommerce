'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Product } from '@/types/product'
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
import { Edit2, Trash2 } from 'lucide-react'
import Image from 'next/image'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ProductListProps {
  filters: {
    search: string
    category: string
    brand: string
    inStock: boolean
  }
}

export function ProductList({ filters }: ProductListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('products')
        .select('*')

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }
      if (filters.category) {
        query = query.eq('category', filters.category)
      }
      if (filters.brand) {
        query = query.eq('brand', filters.brand)
      }
      if (filters.inStock) {
        query = query.gt('stock', 0)
      }

      const { data, error } = await query

      if (error) throw error
      setProducts(data)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteProductId) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteProductId)

      if (error) throw error

      setProducts(products.filter(p => p.id !== deleteProductId))
      setDeleteProductId(null)
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  if (loading) {
    return <div>Cargando productos...</div>
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    {product.image && (
                      <Image
                        src={product.image}
                        alt={product.name}
                        width={40}
                        height={40}
                        className="rounded-md object-cover"
                      />
                    )}
                    <span>{product.name}</span>
                  </div>
                </TableCell>
                <TableCell>{product.code}</TableCell>
                <TableCell>${product.price.toFixed(2)}</TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>{product.brand}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/dashboard/products/${product.id}`)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteProductId(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
