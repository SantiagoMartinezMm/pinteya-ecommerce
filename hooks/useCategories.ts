import { useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError, ValidationError } from '@/types/errors'

// Esquemas de validación
const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  slug: z.string(),
  description: z.string().optional(),
  parent_id: z.string().uuid().nullable(),
  image_url: z.string().url().optional(),
  meta: z.object({
    icon: z.string().optional(),
    color: z.string().optional(),
    featured: z.boolean().optional(),
    order: z.number().optional()
  }).optional(),
  product_count: z.number().default(0),
  created_at: z.string(),
  updated_at: z.string()
})

export type Category = z.infer<typeof categorySchema>

export interface CategoryTree extends Category {
  children: CategoryTree[]
}

export interface CategoryError extends BaseError {
  code: 'CATEGORY_ERROR'
  details: {
    type: 'NOT_FOUND' | 'VALIDATION' | 'UPDATE_FAILED' | 'HIERARCHY_ERROR'
    field?: string
    originalError?: unknown
  }
}

export interface CategoryStats {
  totalCategories: number
  maxDepth: number
  featuredCount: number
  categoriesWithProducts: number
}

export interface CategoriesHookReturn {
  categories: Category[]
  categoryTree: CategoryTree[]
  stats: CategoryStats
  isLoading: boolean
  getCategory: (id: string) => Category | null
  getCategoryBySlug: (slug: string) => Category | null
  getFeaturedCategories: () => Category[]
  getBreadcrumb: (categoryId: string) => Category[]
  refreshCategories: () => Promise<void>
}

export function useCategories(): CategoriesHookReturn {
  const supabase = createClient()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry({
    maxAttempts: 3,
    delay: 1000
  })

  // Cache para categorías
  const { 
    data: categoriesState, 
    setData: setCategoriesState 
  } = useCache<{
    categories: Category[]
    tree: CategoryTree[]
    stats: CategoryStats
  }>({
    key: 'categories-state',
    ttl: 1000 * 60 * 15 // 15 minutos
  })

  const handleCategoryError = (
    error: unknown, 
    type: CategoryError['details']['type'], 
    field?: string
  ): never => {
    throw new BaseError('Error en categorías', {
      code: 'CATEGORY_ERROR',
      details: {
        type,
        field,
        originalError: error
      }
    })
  }

  // Cargar categorías
  const fetchCategories = useCallback(async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from('categories')
      .select(`
        *,
        product_count:products(count)
      `)
      .order('name')

    if (error) {
      handleCategoryError(error, 'NOT_FOUND')
    }

    return data?.map(category => categorySchema.parse(category)) || []
  }, [])

  // Construir árbol de categorías
  const buildCategoryTree = useCallback((
    categories: Category[],
    parentId: string | null = null
  ): CategoryTree[] => {
    return categories
      .filter(category => category.parent_id === parentId)
      .map(category => ({
        ...category,
        children: buildCategoryTree(categories, category.id)
      }))
  }, [])

  // Calcular estadísticas
  const calculateStats = useCallback((
    categories: Category[],
    tree: CategoryTree[]
  ): CategoryStats => {
    const getTreeDepth = (node: CategoryTree): number => {
      if (!node.children.length) return 1
      return 1 + Math.max(...node.children.map(getTreeDepth))
    }

    return {
      totalCategories: categories.length,
      maxDepth: Math.max(...tree.map(getTreeDepth)),
      featuredCount: categories.filter(c => c.meta?.featured).length,
      categoriesWithProducts: categories.filter(c => c.product_count > 0).length
    }
  }, [])

  // Refrescar categorías
  const refreshCategories = useCallback(async (): Promise<void> => {
    try {
      startLoading()

      const categories = await executeWithRetry(fetchCategories)
      const tree = buildCategoryTree(categories)
      const stats = calculateStats(categories, tree)

      setCategoriesState({
        categories,
        tree,
        stats
      })
    } catch (err) {
      throw new BaseError('Error al refrescar categorías', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, executeWithRetry, fetchCategories])

  // Cargar categorías inicialmente
  useEffect(() => {
    refreshCategories()
  }, [])

  // Obtener categoría por ID
  const getCategory = useCallback((id: string): Category | null => {
    return categoriesState?.categories.find(c => c.id === id) || null
  }, [categoriesState?.categories])

  // Obtener categoría por slug
  const getCategoryBySlug = useCallback((slug: string): Category | null => {
    return categoriesState?.categories.find(c => c.slug === slug) || null
  }, [categoriesState?.categories])

  // Obtener categorías destacadas
  const getFeaturedCategories = useCallback((): Category[] => {
    return categoriesState?.categories.filter(c => c.meta?.featured) || []
  }, [categoriesState?.categories])

  // Obtener ruta de migas de pan
  const getBreadcrumb = useCallback((categoryId: string): Category[] => {
    const breadcrumb: Category[] = []
    let currentCategory = getCategory(categoryId)

    while (currentCategory) {
      breadcrumb.unshift(currentCategory)
      currentCategory = currentCategory.parent_id 
        ? getCategory(currentCategory.parent_id)
        : null
    }

    return breadcrumb
  }, [getCategory])

  return {
    categories: categoriesState?.categories || [],
    categoryTree: categoriesState?.tree || [],
    stats: categoriesState?.stats || {
      totalCategories: 0,
      maxDepth: 0,
      featuredCount: 0,
      categoriesWithProducts: 0
    },
    isLoading,
    getCategory,
    getCategoryBySlug,
    getFeaturedCategories,
    getBreadcrumb,
    refreshCategories
  }
}
