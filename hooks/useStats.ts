import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostgrestError } from '@supabase/supabase-js'
import { OrderStatus } from './useOrders'

export type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all'

export type SalesStats = {
  total_sales: number
  total_orders: number
  average_order_value: number
  orders_by_status: Record<OrderStatus, number>
}

export type ProductStats = {
  total_products: number
  out_of_stock: number
  low_stock: number
  top_viewed: Array<{
    id: string
    name: string
    views: number
  }>
  top_selling: Array<{
    id: string
    name: string
    total_sold: number
  }>
}

export type UserStats = {
  total_users: number
  new_users: number
  active_users: number
  users_by_role: Record<string, number>
}

export type CategoryStats = {
  total_categories: number
  categories_by_products: Array<{
    id: string
    name: string
    product_count: number
  }>
}

export function useStats() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PostgrestError | null>(null)

  const getDateRange = (range: TimeRange) => {
    const now = new Date()
    switch (range) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate())
      case 'week':
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        return weekAgo
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1)
      case 'year':
        return new Date(now.getFullYear(), 0, 1)
      default:
        return null
    }
  }

  const getSalesStats = useCallback(async (range: TimeRange = 'month') => {
    try {
      setLoading(true)
      setError(null)

      const startDate = getDateRange(range)
      let query = supabase.from('orders')

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString())
      }

      const { data: orders, error: ordersError } = await query.select('*')
      if (ordersError) throw ordersError

      // Calcular estadísticas de ventas
      const stats: SalesStats = {
        total_sales: 0,
        total_orders: orders.length,
        average_order_value: 0,
        orders_by_status: {
          'PENDING': 0,
          'PROCESSING': 0,
          'SHIPPED': 0,
          'DELIVERED': 0,
          'CANCELLED': 0
        }
      }

      orders.forEach(order => {
        stats.total_sales += order.total
        stats.orders_by_status[order.status as OrderStatus]++
      })

      stats.average_order_value = stats.total_orders > 0 
        ? stats.total_sales / stats.total_orders 
        : 0

      return stats
    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getProductStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener estadísticas básicas de productos
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
      if (productsError) throw productsError

      // Obtener productos más vistos
      const { data: topViewed, error: viewedError } = await supabase
        .from('products')
        .select('id, name, views')
        .order('views', { ascending: false })
        .limit(10)
      if (viewedError) throw viewedError

      // Obtener productos más vendidos
      const { data: topSelling, error: sellingError } = await supabase
        .from('order_items')
        .select(\`
          product_id,
          products (name),
          total_sold:count(*)
        \`)
        .group('product_id, products.name')
        .order('total_sold', { ascending: false })
        .limit(10)
      if (sellingError) throw sellingError

      const stats: ProductStats = {
        total_products: products.length,
        out_of_stock: products.filter(p => p.stock === 0).length,
        low_stock: products.filter(p => p.stock > 0 && p.stock <= 5).length,
        top_viewed: topViewed.map(p => ({
          id: p.id,
          name: p.name,
          views: p.views || 0
        })),
        top_selling: topSelling.map(p => ({
          id: p.product_id,
          name: p.products?.name || '',
          total_sold: parseInt(p.total_sold)
        }))
      }

      return stats
    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getUserStats = useCallback(async (range: TimeRange = 'month') => {
    try {
      setLoading(true)
      setError(null)

      const startDate = getDateRange(range)
      let query = supabase.from('users')

      // Obtener usuarios totales
      const { data: users, error: usersError } = await query.select('*')
      if (usersError) throw usersError

      // Obtener nuevos usuarios en el rango
      let newUsersQuery = query
      if (startDate) {
        newUsersQuery = newUsersQuery.gte('created_at', startDate.toISOString())
      }
      const { data: newUsers, error: newUsersError } = await newUsersQuery.select('*')
      if (newUsersError) throw newUsersError

      // Contar usuarios por rol
      const usersByRole: Record<string, number> = {}
      users.forEach(user => {
        usersByRole[user.role] = (usersByRole[user.role] || 0) + 1
      })

      const stats: UserStats = {
        total_users: users.length,
        new_users: newUsers.length,
        active_users: users.filter(u => u.is_active).length,
        users_by_role: usersByRole
      }

      return stats
    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getCategoryStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('categories')
        .select(\`
          id,
          name,
          product_count:products(count)
        \`)
        .order('name')

      if (error) throw error

      const stats: CategoryStats = {
        total_categories: data.length,
        categories_by_products: data.map(category => ({
          id: category.id,
          name: category.name,
          product_count: category.product_count?.[0]?.count || 0
        }))
      }

      return stats
    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getDashboardStats = useCallback(async (range: TimeRange = 'month') => {
    try {
      setLoading(true)
      setError(null)

      const [sales, products, users, categories] = await Promise.all([
        getSalesStats(range),
        getProductStats(),
        getUserStats(range),
        getCategoryStats()
      ])

      return {
        sales,
        products,
        users,
        categories
      }
    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getSalesStats,
    getProductStats,
    getUserStats,
    getCategoryStats,
    getDashboardStats
  }
}
