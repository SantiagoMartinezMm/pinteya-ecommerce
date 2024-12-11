import { useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { usePagination } from './usePagination'
import { z } from 'zod'
import { BaseError } from '@/types/errors'

// Esquemas de validación
const reviewSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  product_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  title: z.string().min(3).max(100),
  content: z.string().min(10).max(1000),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  images: z.array(z.string().url()).optional(),
  is_verified_purchase: z.boolean(),
  helpful_votes: z.number(),
  reported_count: z.number(),
  status: z.enum(['pending', 'approved', 'rejected']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: z.record(z.unknown()).optional()
})

const reviewResponseSchema = z.object({
  id: z.string().uuid(),
  review_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string().min(10).max(500),
  is_official: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export type Review = z.infer<typeof reviewSchema>
export type ReviewResponse = z.infer<typeof reviewResponseSchema>

export interface ReviewError extends BaseError {
  code: 'REVIEW_ERROR'
  details: {
    type: 'VALIDATION' | 'NOT_FOUND' | 'PERMISSION' | 'SERVER_ERROR'
    review_id?: string
    product_id?: string
    originalError?: unknown
  }
}

export interface ReviewStats {
  average_rating: number
  total_reviews: number
  rating_distribution: Record<number, number>
  verified_purchase_count: number
  with_images_count: number
}

export interface ReviewFilters {
  rating?: number
  verified_only?: boolean
  with_images?: boolean
  sort_by?: 'recent' | 'helpful' | 'rating_high' | 'rating_low'
}

export interface ReviewsHookReturn {
  reviews: Review[]
  reviewResponses: Record<string, ReviewResponse[]>
  reviewStats: Record<string, ReviewStats>
  isLoading: boolean
  currentPage: number
  totalPages: number
  filters: ReviewFilters
  getProductReviews: (productId: string, filters?: ReviewFilters) => Promise<void>
  getUserReviews: () => Promise<Review[]>
  addReview: (productId: string, review: Omit<Review, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Review>
  updateReview: (reviewId: string, updates: Partial<Review>) => Promise<Review>
  deleteReview: (reviewId: string) => Promise<void>
  addResponse: (reviewId: string, content: string) => Promise<ReviewResponse>
  updateResponse: (responseId: string, content: string) => Promise<ReviewResponse>
  deleteResponse: (responseId: string) => Promise<void>
  voteHelpful: (reviewId: string) => Promise<void>
  reportReview: (reviewId: string, reason: string) => Promise<void>
  setFilters: (filters: ReviewFilters) => void
  nextPage: () => void
  previousPage: () => void
  refreshReviews: () => Promise<void>
}

const CACHE_TTL = 1000 * 60 * 5 // 5 minutos
const ITEMS_PER_PAGE = 10

export function useReviews(): ReviewsHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry()
  const { 
    currentPage,
    totalPages,
    setTotalItems,
    nextPage,
    previousPage
  } = usePagination({
    itemsPerPage: ITEMS_PER_PAGE
  })

  // Cache para reviews y estadísticas
  const {
    data: reviewsState,
    setData: setReviewsState
  } = useCache<{
    reviews: Review[]
    responses: Record<string, ReviewResponse[]>
    stats: Record<string, ReviewStats>
    filters: ReviewFilters
  }>({
    key: 'reviews-state',
    ttl: CACHE_TTL,
    initialData: {
      reviews: [],
      responses: {},
      stats: {},
      filters: {}
    }
  })

  const handleReviewError = (
    error: unknown,
    type: ReviewError['details']['type'],
    review_id?: string,
    product_id?: string
  ): never => {
    throw new BaseError('Error en reseñas', {
      code: 'REVIEW_ERROR',
      details: {
        type,
        review_id,
        product_id,
        originalError: error
      }
    })
  }

  // Calcular estadísticas de reseñas
  const calculateReviewStats = (reviews: Review[]): ReviewStats => {
    const stats: ReviewStats = {
      average_rating: 0,
      total_reviews: reviews.length,
      rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      verified_purchase_count: 0,
      with_images_count: 0
    }

    if (reviews.length === 0) return stats

    reviews.forEach(review => {
      stats.rating_distribution[review.rating]++
      if (review.is_verified_purchase) stats.verified_purchase_count++
      if (review.images?.length) stats.with_images_count++
    })

    stats.average_rating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length

    return stats
  }

  // Obtener reseñas de un producto
  const getProductReviews = useCallback(async (
    productId: string,
    filters: ReviewFilters = {}
  ): Promise<void> => {
    try {
      startLoading()

      let query = supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('status', 'approved')

      // Aplicar filtros
      if (filters.rating) {
        query = query.eq('rating', filters.rating)
      }
      if (filters.verified_only) {
        query = query.eq('is_verified_purchase', true)
      }
      if (filters.with_images) {
        query = query.not('images', 'is', null)
      }

      // Ordenamiento
      switch (filters.sort_by) {
        case 'helpful':
          query = query.order('helpful_votes', { ascending: false })
          break
        case 'rating_high':
          query = query.order('rating', { ascending: false })
          break
        case 'rating_low':
          query = query.order('rating', { ascending: true })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      // Paginación
      query = query
        .range(
          currentPage * ITEMS_PER_PAGE,
          (currentPage + 1) * ITEMS_PER_PAGE - 1
        )

      const { data: reviews, error, count } = await executeWithRetry(() => 
        query.returns<Review[]>()
      )

      if (error) {
        handleReviewError(error, 'SERVER_ERROR', undefined, productId)
      }

      // Cargar respuestas para las reseñas
      const reviewIds = reviews.map(r => r.id)
      const { data: responses, error: responsesError } = await executeWithRetry(() =>
        supabase
          .from('review_responses')
          .select('*')
          .in('review_id', reviewIds)
      )

      if (responsesError) {
        handleReviewError(responsesError, 'SERVER_ERROR')
      }

      // Agrupar respuestas por review_id
      const groupedResponses = responses?.reduce((acc, response) => ({
        ...acc,
        [response.review_id]: [...(acc[response.review_id] || []), response]
      }), {} as Record<string, ReviewResponse[]>)

      setTotalItems(count || 0)
      setReviewsState(prev => ({
        ...prev,
        reviews: reviews || [],
        responses: groupedResponses || {},
        stats: {
          ...prev.stats,
          [productId]: calculateReviewStats(reviews || [])
        },
        filters
      }))
    } catch (err) {
      throw new BaseError('Error al obtener reseñas', { cause: err })
    } finally {
      stopLoading()
    }
  }, [currentPage, executeWithRetry, startLoading, stopLoading])

  // Obtener reseñas del usuario actual
  const getUserReviews = useCallback(async (): Promise<Review[]> => {
    if (!user) {
      handleReviewError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: reviews, error } = await executeWithRetry(() =>
        supabase
          .from('reviews')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      )

      if (error) {
        handleReviewError(error, 'SERVER_ERROR')
      }

      return reviews || []
    } catch (err) {
      throw new BaseError('Error al obtener reseñas del usuario', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Agregar una nueva reseña
  const addReview = useCallback(async (
    productId: string,
    review: Omit<Review, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<Review> => {
    if (!user) {
      handleReviewError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const newReview = {
        ...review,
        product_id: productId,
        user_id: user.id,
        status: 'pending',
        helpful_votes: 0,
        reported_count: 0
      }

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('reviews')
          .insert([newReview])
          .select()
          .single()
      )

      if (error) {
        handleReviewError(error, 'SERVER_ERROR', undefined, productId)
      }

      // Actualizar cache
      setReviewsState(prev => ({
        ...prev,
        reviews: [...prev.reviews, data],
        stats: {
          ...prev.stats,
          [productId]: calculateReviewStats([...prev.reviews, data])
        }
      }))

      return data
    } catch (err) {
      throw new BaseError('Error al agregar reseña', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Actualizar una reseña
  const updateReview = useCallback(async (
    reviewId: string,
    updates: Partial<Review>
  ): Promise<Review> => {
    if (!user) {
      handleReviewError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: existingReview } = await executeWithRetry(() =>
        supabase
          .from('reviews')
          .select('*')
          .eq('id', reviewId)
          .single()
      )

      if (existingReview.user_id !== user.id) {
        handleReviewError(
          new Error('No autorizado para editar esta reseña'),
          'PERMISSION',
          reviewId
        )
      }

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('reviews')
          .update(updates)
          .eq('id', reviewId)
          .select()
          .single()
      )

      if (error) {
        handleReviewError(error, 'SERVER_ERROR', reviewId)
      }

      // Actualizar cache
      setReviewsState(prev => ({
        ...prev,
        reviews: prev.reviews.map(r => 
          r.id === reviewId ? { ...r, ...data } : r
        ),
        stats: {
          ...prev.stats,
          [data.product_id]: calculateReviewStats(
            prev.reviews.map(r => r.id === reviewId ? { ...r, ...data } : r)
          )
        }
      }))

      return data
    } catch (err) {
      throw new BaseError('Error al actualizar reseña', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Eliminar una reseña
  const deleteReview = useCallback(async (reviewId: string): Promise<void> => {
    if (!user) {
      handleReviewError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: existingReview } = await executeWithRetry(() =>
        supabase
          .from('reviews')
          .select('*')
          .eq('id', reviewId)
          .single()
      )

      if (existingReview.user_id !== user.id) {
        handleReviewError(
          new Error('No autorizado para eliminar esta reseña'),
          'PERMISSION',
          reviewId
        )
      }

      const { error } = await executeWithRetry(() =>
        supabase
          .from('reviews')
          .delete()
          .eq('id', reviewId)
      )

      if (error) {
        handleReviewError(error, 'SERVER_ERROR', reviewId)
      }

      // Actualizar cache
      setReviewsState(prev => {
        const updatedReviews = prev.reviews.filter(r => r.id !== reviewId)
        return {
          ...prev,
          reviews: updatedReviews,
          responses: {
            ...prev.responses,
            [reviewId]: undefined
          },
          stats: {
            ...prev.stats,
            [existingReview.product_id]: calculateReviewStats(updatedReviews)
          }
        }
      })
    } catch (err) {
      throw new BaseError('Error al eliminar reseña', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Agregar respuesta a una reseña
  const addResponse = useCallback(async (
    reviewId: string,
    content: string
  ): Promise<ReviewResponse> => {
    if (!user) {
      handleReviewError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const newResponse = {
        review_id: reviewId,
        user_id: user.id,
        content,
        is_official: false // TODO: Verificar si el usuario es staff
      }

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('review_responses')
          .insert([newResponse])
          .select()
          .single()
      )

      if (error) {
        handleReviewError(error, 'SERVER_ERROR', reviewId)
      }

      // Actualizar cache
      setReviewsState(prev => ({
        ...prev,
        responses: {
          ...prev.responses,
          [reviewId]: [...(prev.responses[reviewId] || []), data]
        }
      }))

      return data
    } catch (err) {
      throw new BaseError('Error al agregar respuesta', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Actualizar respuesta
  const updateResponse = useCallback(async (
    responseId: string,
    content: string
  ): Promise<ReviewResponse> => {
    if (!user) {
      handleReviewError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: existingResponse } = await executeWithRetry(() =>
        supabase
          .from('review_responses')
          .select('*')
          .eq('id', responseId)
          .single()
      )

      if (existingResponse.user_id !== user.id) {
        handleReviewError(
          new Error('No autorizado para editar esta respuesta'),
          'PERMISSION'
        )
      }

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('review_responses')
          .update({ content })
          .eq('id', responseId)
          .select()
          .single()
      )

      if (error) {
        handleReviewError(error, 'SERVER_ERROR')
      }

      // Actualizar cache
      setReviewsState(prev => ({
        ...prev,
        responses: {
          ...prev.responses,
          [data.review_id]: prev.responses[data.review_id].map(r =>
            r.id === responseId ? data : r
          )
        }
      }))

      return data
    } catch (err) {
      throw new BaseError('Error al actualizar respuesta', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Eliminar respuesta
  const deleteResponse = useCallback(async (responseId: string): Promise<void> => {
    if (!user) {
      handleReviewError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: existingResponse } = await executeWithRetry(() =>
        supabase
          .from('review_responses')
          .select('*')
          .eq('id', responseId)
          .single()
      )

      if (existingResponse.user_id !== user.id) {
        handleReviewError(
          new Error('No autorizado para eliminar esta respuesta'),
          'PERMISSION'
        )
      }

      const { error } = await executeWithRetry(() =>
        supabase
          .from('review_responses')
          .delete()
          .eq('id', responseId)
      )

      if (error) {
        handleReviewError(error, 'SERVER_ERROR')
      }

      // Actualizar cache
      setReviewsState(prev => ({
        ...prev,
        responses: {
          ...prev.responses,
          [existingResponse.review_id]: prev.responses[existingResponse.review_id]
            .filter(r => r.id !== responseId)
        }
      }))
    } catch (err) {
      throw new BaseError('Error al eliminar respuesta', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Votar una reseña como útil
  const voteHelpful = useCallback(async (reviewId: string): Promise<void> => {
    if (!user) {
      handleReviewError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      // Verificar si el usuario ya votó
      const { data: existingVote } = await executeWithRetry(() =>
        supabase
          .from('review_votes')
          .select('*')
          .eq('review_id', reviewId)
          .eq('user_id', user.id)
          .single()
      )

      if (existingVote) {
        return // Usuario ya votó
      }

      // Registrar voto
      const { error: voteError } = await executeWithRetry(() =>
        supabase
          .from('review_votes')
          .insert([{
            review_id: reviewId,
            user_id: user.id
          }])
      )

      if (voteError) {
        handleReviewError(voteError, 'SERVER_ERROR', reviewId)
      }

      // Incrementar contador
      const { data, error: updateError } = await executeWithRetry(() =>
        supabase
          .from('reviews')
          .update({ helpful_votes: supabase.sql`helpful_votes + 1` })
          .eq('id', reviewId)
          .select()
          .single()
      )

      if (updateError) {
        handleReviewError(updateError, 'SERVER_ERROR', reviewId)
      }

      // Actualizar cache
      setReviewsState(prev => ({
        ...prev,
        reviews: prev.reviews.map(r =>
          r.id === reviewId ? { ...r, helpful_votes: data.helpful_votes } : r
        )
      }))
    } catch (err) {
      throw new BaseError('Error al votar reseña', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Reportar una reseña
  const reportReview = useCallback(async (
    reviewId: string,
    reason: string
  ): Promise<void> => {
    if (!user) {
      handleReviewError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      // Verificar si el usuario ya reportó
      const { data: existingReport } = await executeWithRetry(() =>
        supabase
          .from('review_reports')
          .select('*')
          .eq('review_id', reviewId)
          .eq('user_id', user.id)
          .single()
      )

      if (existingReport) {
        return // Usuario ya reportó
      }

      // Registrar reporte
      const { error: reportError } = await executeWithRetry(() =>
        supabase
          .from('review_reports')
          .insert([{
            review_id: reviewId,
            user_id: user.id,
            reason
          }])
      )

      if (reportError) {
        handleReviewError(reportError, 'SERVER_ERROR', reviewId)
      }

      // Incrementar contador
      const { data, error: updateError } = await executeWithRetry(() =>
        supabase
          .from('reviews')
          .update({ reported_count: supabase.sql`reported_count + 1` })
          .eq('id', reviewId)
          .select()
          .single()
      )

      if (updateError) {
        handleReviewError(updateError, 'SERVER_ERROR', reviewId)
      }

      // Actualizar cache
      setReviewsState(prev => ({
        ...prev,
        reviews: prev.reviews.map(r =>
          r.id === reviewId ? { ...r, reported_count: data.reported_count } : r
        )
      }))
    } catch (err) {
      throw new BaseError('Error al reportar reseña', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Actualizar filtros
  const setFilters = useCallback((filters: ReviewFilters): void => {
    setReviewsState(prev => ({
      ...prev,
      filters
    }))
  }, [])

  // Refrescar reseñas
  const refreshReviews = useCallback(async (): Promise<void> => {
    if (reviewsState?.reviews.length > 0) {
      const productId = reviewsState.reviews[0].product_id
      await getProductReviews(productId, reviewsState.filters)
    }
  }, [reviewsState?.reviews, reviewsState?.filters, getProductReviews])

  return {
    reviews: reviewsState?.reviews || [],
    reviewResponses: reviewsState?.responses || {},
    reviewStats: reviewsState?.stats || {},
    isLoading,
    currentPage,
    totalPages,
    filters: reviewsState?.filters || {},
    getProductReviews,
    getUserReviews,
    addReview,
    updateReview,
    deleteReview,
    addResponse,
    updateResponse,
    deleteResponse,
    voteHelpful,
    reportReview,
    setFilters,
    nextPage,
    previousPage,
    refreshReviews
  }
}
