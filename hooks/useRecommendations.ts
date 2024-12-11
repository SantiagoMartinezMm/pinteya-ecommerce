import { useCallback, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { PostgrestError } from '@supabase/supabase-js'
import { useAudit } from './useAudit'

export type RecommendationType = 
  | 'similar_products'
  | 'frequently_bought_together'
  | 'based_on_history'
  | 'trending'
  | 'personalized'
  | 'category_based'
  | 'price_range'

export type RecommendationSource = 
  | 'purchase_history'
  | 'view_history'
  | 'cart_history'
  | 'wishlist'
  | 'search_history'
  | 'similar_users'

export type BehaviorType = 'purchase' | 'view' | 'cart_add' | 'wishlist_add' | 'search'

export interface RecommendationScore {
  product_id: string
  score: number
  confidence: number
  factors: string[]
  last_updated: string
}

export interface ProductSimilarity {
  product_id: string
  similar_product_id: string
  similarity_score: number
  common_attributes: string[]
  updated_at: string
}

export interface UserBehavior {
  user_id: string
  product_id: string
  behavior_type: BehaviorType
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface PriceRange {
  min: number
  max: number
}

export interface RecommendationConfig {
  max_items: number
  min_confidence: number
  include_out_of_stock?: boolean
  price_range?: PriceRange
  excluded_categories?: string[]
  excluded_products?: string[]
  recency_weight?: number
  diversity_weight?: number
}

export interface Product {
  id: string
  name: string
  price: number
  stock_quantity: number
  category_id: string
  attributes?: Record<string, unknown>
  tags?: string[]
}

export interface ProductWithScore extends Product {
  similarity_score?: number
  common_attributes?: string[]
  recommendation_score?: number
  recommendation_factors?: string[]
  frequency?: number
  confidence?: number
  trend_score?: number
}

const BEHAVIOR_WEIGHTS: Record<BehaviorType, number> = {
  purchase: 1.0,
  view: 0.2,
  cart_add: 0.5,
  wishlist_add: 0.4,
  search: 0.3
}

export function useRecommendations() {
  const supabase = createClient()
  const { user } = useAuth()
  const { logAction } = useAudit()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PostgrestError | null>(null)

  const calculateProductSimilarity = (product1: Product, product2: Product) => {
    let score = 0
    const commonAttributes: string[] = []

    // Misma categoría
    if (product1.category_id === product2.category_id) {
      score += 0.3
      commonAttributes.push('category')
    }

    // Atributos comunes
    if (product1.attributes && product2.attributes) {
      Object.entries(product1.attributes).forEach(([key, value]) => {
        if (product2.attributes?.[key] === value) {
          score += 0.1
          commonAttributes.push(key)
        }
      })
    }

    // Tags comunes
    if (product1.tags && product2.tags) {
      const tags1 = new Set(product1.tags)
      const tags2 = new Set(product2.tags)
      tags1.forEach(tag => {
        if (tags2.has(tag)) {
          score += 0.1
          commonAttributes.push(`tag:${tag}`)
        }
      })
    }

    return {
      score: Math.min(score, 1),
      common_attributes: commonAttributes
    }
  }

  const updateProductSimilarities = useCallback(async () => {
    try {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, category_id, attributes, tags')

      if (productsError) throw productsError
      if (!products?.length) return

      const similarities: ProductSimilarity[] = []

      // Calcular similitudes
      for (const product of products) {
        for (const other of products) {
          if (product.id === other.id) continue

          const similarity = calculateProductSimilarity(
            product as Product,
            other as Product
          )

          if (similarity.score > 0) {
            similarities.push({
              product_id: product.id,
              similar_product_id: other.id,
              similarity_score: similarity.score,
              common_attributes: similarity.common_attributes,
              updated_at: new Date().toISOString()
            })
          }
        }
      }

      // Actualizar en lotes para mejor rendimiento
      if (similarities.length > 0) {
        const { error: updateError } = await supabase
          .from('product_similarities')
          .upsert(similarities)

        if (updateError) throw updateError

        await logAction(
          'recommendation.update_similarities' as any,
          'recommendation',
          {
            products_processed: products.length,
            similarities_generated: similarities.length
          }
        )
      }
    } catch (error) {
      console.error('Error updating product similarities:', error)
    }
  }, [supabase, logAction])

  // Actualizar similitudes de productos periódicamente
  useEffect(() => {
    if (!user) return

    const updateInterval = setInterval(async () => {
      await updateProductSimilarities()
    }, 24 * 60 * 60 * 1000) // Actualizar cada 24 horas

    return () => clearInterval(updateInterval)
  }, [user, updateProductSimilarities])

  const getUserBehavior = useCallback(async (userId: string): Promise<UserBehavior[]> => {
    const { data, error } = await supabase
      .from('user_behaviors')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100)

    if (error) throw error
    return data || []
  }, [supabase])

  const calculateRecencyFactor = (timestamp: string, weight: number): number => {
    const age = Date.now() - new Date(timestamp).getTime()
    const days = age / (1000 * 60 * 60 * 24)
    return Math.exp(-days * weight)
  }

  const calculateProductScores = useCallback(async (
    behaviors: UserBehavior[],
    config: RecommendationConfig
  ): Promise<RecommendationScore[]> => {
    const scores: Record<string, {
      score: number
      factors: string[]
      timestamp: string
    }> = {}

    // Calcular scores basados en comportamiento
    behaviors.forEach(behavior => {
      const recencyFactor = calculateRecencyFactor(
        behavior.timestamp,
        config.recency_weight || 0.5
      )

      const weight = BEHAVIOR_WEIGHTS[behavior.behavior_type] || 0.1
      const score = weight * recencyFactor

      if (!scores[behavior.product_id]) {
        scores[behavior.product_id] = {
          score: 0,
          factors: [],
          timestamp: behavior.timestamp
        }
      }

      scores[behavior.product_id].score += score
      scores[behavior.product_id].factors.push(behavior.behavior_type)
    })

    // Convertir a array y normalizar scores
    const maxScore = Math.max(...Object.values(scores).map(s => s.score))
    return Object.entries(scores).map(([product_id, data]) => ({
      product_id,
      score: data.score / maxScore,
      confidence: 0.5 + (data.score / maxScore) * 0.5,
      factors: [...new Set(data.factors)],
      last_updated: data.timestamp
    }))
  }, [])

  const filterRecommendations = <T extends ProductWithScore>(
    products: T[],
    config: RecommendationConfig
  ): T[] => {
    return products.filter(product => {
      if (!config.include_out_of_stock && product.stock_quantity <= 0) {
        return false
      }
      if (config.excluded_categories?.includes(product.category_id)) {
        return false
      }
      if (config.excluded_products?.includes(product.id)) {
        return false
      }
      if (config.price_range) {
        if (product.price < config.price_range.min || 
            product.price > config.price_range.max) {
          return false
        }
      }
      return true
    })
  }

  const getSimilarProducts = useCallback(async (
    productId: string,
    config: RecommendationConfig = { max_items: 10, min_confidence: 0.5 }
  ): Promise<ProductWithScore[]> => {
    try {
      setLoading(true)
      setError(null)

      const { data: similarities, error: similarityError } = await supabase
        .from('product_similarities')
        .select(`
          similar_product_id,
          similarity_score,
          common_attributes,
          products:similar_product_id (
            id,
            name,
            price,
            stock_quantity,
            category_id,
            attributes
          )
        `)
        .eq('product_id', productId)
        .gte('similarity_score', config.min_confidence)
        .order('similarity_score', { ascending: false })
        .limit(config.max_items)

      if (similarityError) throw similarityError

      const recommendations = similarities?.map(s => ({
        ...s.products,
        similarity_score: s.similarity_score,
        common_attributes: s.common_attributes
      })) || []

      await logAction(
        'recommendation.get_similar' as any,
        'recommendation',
        {
          product_id: productId,
          recommendations_count: recommendations.length,
          config
        }
      )

      return filterRecommendations(recommendations, config)

    } catch (error) {
      setError(error as PostgrestError)
      return []
    } finally {
      setLoading(false)
    }
  }, [supabase, logAction])

  const getPersonalizedRecommendations = useCallback(async (
    config: RecommendationConfig = { max_items: 20, min_confidence: 0.3 }
  ): Promise<ProductWithScore[]> => {
    try {
      setLoading(true)
      setError(null)

      if (!user?.id) {
        throw new Error('Usuario no autenticado')
      }

      const behaviors = await getUserBehavior(user.id)
      const scores = await calculateProductScores(behaviors, config)

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', scores.map(s => s.product_id))

      if (productsError) throw productsError

      const recommendations = products?.map(product => ({
        ...product,
        recommendation_score: scores.find(s => s.product_id === product.id)?.score || 0,
        recommendation_factors: scores.find(s => s.product_id === product.id)?.factors || []
      })) || []

      const filtered = filterRecommendations(recommendations, config)
        .sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0))
        .slice(0, config.max_items)

      await logAction(
        'recommendation.get_personalized' as any,
        'recommendation',
        {
          user_id: user.id,
          recommendations_count: filtered.length,
          config
        }
      )

      return filtered

    } catch (error) {
      setError(error as PostgrestError)
      return []
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase, getUserBehavior, calculateProductScores, logAction])

  const getFrequentlyBoughtTogether = useCallback(async (
    productId: string,
    config: RecommendationConfig = { max_items: 5, min_confidence: 0.1 }
  ): Promise<ProductWithScore[]> => {
    try {
      setLoading(true)
      setError(null)

      const { data: combinations, error: combinationsError } = await supabase
        .from('product_combinations')
        .select(`
          product_b_id,
          frequency,
          confidence,
          products:product_b_id (
            id,
            name,
            price,
            stock_quantity,
            category_id
          )
        `)
        .eq('product_a_id', productId)
        .gte('confidence', config.min_confidence)
        .order('confidence', { ascending: false })
        .limit(config.max_items)

      if (combinationsError) throw combinationsError

      const recommendations = combinations?.map(c => ({
        ...c.products,
        frequency: c.frequency,
        confidence: c.confidence
      })) || []

      await logAction(
        'recommendation.get_frequently_bought' as any,
        'recommendation',
        {
          product_id: productId,
          recommendations_count: recommendations.length,
          config
        }
      )

      return filterRecommendations(recommendations, config)

    } catch (error) {
      setError(error as PostgrestError)
      return []
    } finally {
      setLoading(false)
    }
  }, [supabase, logAction])

  const getTrendingProducts = useCallback(async (
    config: RecommendationConfig = { max_items: 10, min_confidence: 0 }
  ): Promise<ProductWithScore[]> => {
    try {
      setLoading(true)
      setError(null)

      const { data: trending, error: trendingError } = await supabase
        .from('product_trends')
        .select(`
          product_id,
          trend_score,
          products:product_id (
            id,
            name,
            price,
            stock_quantity,
            category_id
          )
        `)
        .gte('trend_score', config.min_confidence)
        .gte('calculated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('trend_score', { ascending: false })
        .limit(config.max_items)

      if (trendingError) throw trendingError

      const recommendations = trending?.map(t => ({
        ...t.products,
        trend_score: t.trend_score
      })) || []

      await logAction(
        'recommendation.get_trending' as any,
        'recommendation',
        {
          recommendations_count: recommendations.length,
          config
        }
      )

      return filterRecommendations(recommendations, config)

    } catch (error) {
      setError(error as PostgrestError)
      return []
    } finally {
      setLoading(false)
    }
  }, [supabase, logAction])

  return {
    loading,
    error,
    getSimilarProducts,
    getPersonalizedRecommendations,
    getFrequentlyBoughtTogether,
    getTrendingProducts
  }
}
