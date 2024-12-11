import { useCallback, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { usePagination } from './usePagination'
import { z } from 'zod'
import { BaseError, ValidationError } from '@/types/errors'
import debounce from 'lodash/debounce'

// Esquemas de validación
const searchFiltersSchema = z.object({
  category: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  sortBy: z.enum(['relevance', 'price_asc', 'price_desc', 'newest']).optional(),
  inStock: z.boolean().optional(),
  rating: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).optional()
})

export type SearchFilters = z.infer<typeof searchFiltersSchema>

export interface SearchResult {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url: string
  rating: number
  stock: number
  tags: string[]
  relevance_score?: number
  created_at: string
}

export interface SearchError extends BaseError {
  code: 'SEARCH_ERROR'
  details: {
    type: 'INVALID_QUERY' | 'FILTER_ERROR' | 'SERVER_ERROR'
    field?: string
    originalError?: unknown
  }
}

export interface SearchState {
  results: SearchResult[]
  totalResults: number
  suggestions: string[]
  recentSearches: string[]
  popularSearches: string[]
}

export interface SearchHookReturn extends SearchState {
  search: (query: string, filters?: SearchFilters) => Promise<void>
  clearSearch: () => void
  clearRecentSearches: () => void
  getSuggestions: (partialQuery: string) => Promise<string[]>
  isLoading: boolean
  page: number
  totalPages: number
  nextPage: () => void
  prevPage: () => void
}

const MAX_RECENT_SEARCHES = 10
const DEBOUNCE_DELAY = 300
const CACHE_TTL = 1000 * 60 * 5 // 5 minutos

export function useSearch(): SearchHookReturn {
  const supabase = createClient()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry({
    maxAttempts: 2,
    delay: 500
  })

  // Paginación
  const { 
    page, 
    pageSize, 
    totalPages, 
    nextPage, 
    prevPage, 
    setTotalItems 
  } = usePagination({
    initialPage: 1,
    pageSize: 20
  })

  // Cache para resultados y búsquedas recientes
  const { 
    data: searchState, 
    setData: setSearchState 
  } = useCache<SearchState>({
    key: 'search-state',
    ttl: CACHE_TTL,
    initialData: {
      results: [],
      totalResults: 0,
      suggestions: [],
      recentSearches: [],
      popularSearches: []
    }
  })

  const handleSearchError = (error: unknown, type: SearchError['details']['type'], field?: string): never => {
    throw new BaseError('Error en búsqueda', {
      code: 'SEARCH_ERROR',
      details: {
        type,
        field,
        originalError: error
      }
    })
  }

  // Función principal de búsqueda
  const performSearch = useCallback(async (
    query: string,
    filters?: SearchFilters
  ): Promise<void> => {
    try {
      startLoading()

      // Validar filtros si existen
      if (filters) {
        searchFiltersSchema.parse(filters)
      }

      // Construir query base
      let searchQuery = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .textSearch('name,description', query)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      // Aplicar filtros
      if (filters) {
        if (filters.category) {
          searchQuery = searchQuery.eq('category', filters.category)
        }
        if (filters.minPrice !== undefined) {
          searchQuery = searchQuery.gte('price', filters.minPrice)
        }
        if (filters.maxPrice !== undefined) {
          searchQuery = searchQuery.lte('price', filters.maxPrice)
        }
        if (filters.inStock) {
          searchQuery = searchQuery.gt('stock', 0)
        }
        if (filters.rating) {
          searchQuery = searchQuery.gte('rating', filters.rating)
        }
        if (filters.tags?.length) {
          searchQuery = searchQuery.contains('tags', filters.tags)
        }

        // Aplicar ordenamiento
        switch (filters.sortBy) {
          case 'price_asc':
            searchQuery = searchQuery.order('price', { ascending: true })
            break
          case 'price_desc':
            searchQuery = searchQuery.order('price', { ascending: false })
            break
          case 'newest':
            searchQuery = searchQuery.order('created_at', { ascending: false })
            break
          default:
            // Por defecto ordenar por relevancia
            searchQuery = searchQuery.order('relevance_score', { ascending: false })
        }
      }

      const { data, error, count } = await searchQuery

      if (error) {
        handleSearchError(error, 'SERVER_ERROR')
      }

      // Actualizar estado
      setSearchState(prev => ({
        ...prev,
        results: data || [],
        totalResults: count || 0,
        recentSearches: updateRecentSearches(prev.recentSearches, query)
      }))

      setTotalItems(count || 0)

    } catch (err) {
      if (err instanceof z.ZodError) {
        handleSearchError(err, 'FILTER_ERROR')
      }
      throw err
    } finally {
      stopLoading()
    }
  }, [page, pageSize, startLoading, stopLoading])

  // Búsqueda con debounce
  const search = useMemo(
    () => debounce(performSearch, DEBOUNCE_DELAY),
    [performSearch]
  )

  // Obtener sugerencias de búsqueda
  const getSuggestions = useCallback(async (
    partialQuery: string
  ): Promise<string[]> => {
    try {
      if (partialQuery.length < 2) return []

      const { data, error } = await supabase
        .rpc('get_search_suggestions', {
          partial_query: partialQuery,
          limit: 5
        })

      if (error) {
        handleSearchError(error, 'SERVER_ERROR')
      }

      return data || []
    } catch (err) {
      throw new BaseError('Error al obtener sugerencias', { cause: err })
    }
  }, [])

  // Actualizar búsquedas recientes
  const updateRecentSearches = (
    currentSearches: string[],
    newSearch: string
  ): string[] => {
    const searches = new Set([newSearch, ...currentSearches])
    return Array.from(searches).slice(0, MAX_RECENT_SEARCHES)
  }

  // Limpiar búsqueda
  const clearSearch = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      results: [],
      totalResults: 0,
      suggestions: []
    }))
  }, [setSearchState])

  // Limpiar búsquedas recientes
  const clearRecentSearches = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      recentSearches: []
    }))
  }, [setSearchState])

  // Cargar búsquedas populares al montar
  useEffect(() => {
    const loadPopularSearches = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_popular_searches', { limit: 5 })

        if (error) throw error

        setSearchState(prev => ({
          ...prev,
          popularSearches: data || []
        }))
      } catch (err) {
        console.error('Error al cargar búsquedas populares:', err)
      }
    }

    loadPopularSearches()
  }, [])

  return {
    ...searchState,
    search,
    clearSearch,
    clearRecentSearches,
    getSuggestions,
    isLoading,
    page,
    totalPages,
    nextPage,
    prevPage
  }
}
