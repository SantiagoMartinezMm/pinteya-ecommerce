import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/hooks/useSession'
import { PostgrestError } from '@supabase/supabase-js'
import { useAudit } from './useAudit'

export type VendorStatus = 
  | 'pending'
  | 'active'
  | 'suspended'
  | 'inactive'
  | 'banned'

export type VendorTier = 
  | 'basic'
  | 'professional'
  | 'premium'
  | 'enterprise'

export type VendorCategory = 
  | 'individual'
  | 'business'
  | 'manufacturer'
  | 'distributor'
  | 'artisan'

export type VendorRating = {
  overall: number
  product_quality: number
  shipping_speed: number
  customer_service: number
  price_value: number
  review_count: number
}

export type VendorMetrics = {
  total_sales: number
  total_revenue: number
  average_order_value: number
  return_rate: number
  cancellation_rate: number
  fulfillment_rate: number
  customer_satisfaction: number
  response_time: number
  inventory_turnover: number
  last_updated: string
}

export type Vendor = {
  id: string
  user_id: string
  business_name: string
  legal_name: string
  tax_id: string
  category: VendorCategory
  status: VendorStatus
  tier: VendorTier
  description?: string
  logo_url?: string
  banner_url?: string
  contact_email: string
  contact_phone?: string
  website?: string
  social_media?: {
    facebook?: string
    instagram?: string
    twitter?: string
    linkedin?: string
  }
  address: {
    street: string
    city: string
    state: string
    postal_code: string
    country: string
  }
  business_hours?: {
    [key: string]: {
      open: string
      close: string
    }
  }
  shipping_methods: string[]
  payment_methods: string[]
  commission_rate: number
  rating: VendorRating
  metrics: VendorMetrics
  settings: {
    auto_accept_orders: boolean
    minimum_order_value?: number
    maximum_order_value?: number
    shipping_zones?: string[]
    excluded_categories?: string[]
    vacation_mode: boolean
    vacation_until?: string
    notification_preferences: {
      email: boolean
      sms: boolean
      push: boolean
    }
  }
  documents: {
    business_registration?: string
    tax_certificate?: string
    identity_proof?: string
    bank_details?: string
  }
  created_at: string
  updated_at: string
}

export type CreateVendorInput = Omit<
  Vendor,
  | 'id'
  | 'status'
  | 'tier'
  | 'rating'
  | 'metrics'
  | 'commission_rate'
  | 'created_at'
  | 'updated_at'
>

export type UpdateVendorInput = Partial<
  Omit<Vendor, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>

export type VendorProduct = {
  id: string
  vendor_id: string
  name: string
  description: string
  price: number
  stock_quantity: number
  category_id: string
  status: 'draft' | 'pending' | 'active' | 'inactive'
  images: string[]
  attributes: Record<string, any>
  created_at: string
  updated_at: string
}

export function useVendors() {
  const supabase = createClient()
  const { session } = useSession()
  const { logAction } = useAudit()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PostgrestError | null>(null)

  const getVendor = useCallback(async (vendorId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('vendors')
        .select(\`
          *,
          products:vendor_products(count),
          reviews:vendor_reviews(count)
        \`)
        .eq('id', vendorId)
        .single()

      if (error) throw error

      return data as Vendor & {
        products: number
        reviews: number
      }

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getVendorByUser = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!session?.user?.id) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error) throw error

      return data as Vendor

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  const createVendor = useCallback(async (input: CreateVendorInput) => {
    try {
      setLoading(true)
      setError(null)

      if (!session?.user?.id) {
        throw new Error('User not authenticated')
      }

      // Verificar si el usuario ya es vendedor
      const existing = await getVendorByUser()
      if (existing) {
        throw new Error('User is already a vendor')
      }

      // Crear vendedor
      const { data, error } = await supabase
        .from('vendors')
        .insert([{
          ...input,
          user_id: session.user.id,
          status: 'pending',
          tier: 'basic',
          commission_rate: 0.1, // 10% comisión inicial
          rating: {
            overall: 0,
            product_quality: 0,
            shipping_speed: 0,
            customer_service: 0,
            price_value: 0,
            review_count: 0
          },
          metrics: {
            total_sales: 0,
            total_revenue: 0,
            average_order_value: 0,
            return_rate: 0,
            cancellation_rate: 0,
            fulfillment_rate: 0,
            customer_satisfaction: 0,
            response_time: 0,
            inventory_turnover: 0,
            last_updated: new Date().toISOString()
          }
        }])
        .select()
        .single()

      if (error) throw error

      // Registrar en audit log
      await logAction(
        'create',
        'vendor',
        {
          vendor_id: data.id,
          business_name: input.business_name
        }
      )

      return data as Vendor

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, getVendorByUser, logAction])

  const updateVendor = useCallback(async (
    vendorId: string,
    updates: UpdateVendorInput
  ) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('vendors')
        .update(updates)
        .eq('id', vendorId)
        .select()
        .single()

      if (error) throw error

      // Registrar en audit log
      await logAction(
        'update',
        'vendor',
        {
          vendor_id: vendorId,
          updates
        }
      )

      return data as Vendor

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [logAction])

  const getVendorProducts = useCallback(async (
    vendorId: string,
    status?: 'draft' | 'pending' | 'active' | 'inactive'
  ) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('vendor_products')
        .select('*')
        .eq('vendor_id', vendorId)

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error

      return data as VendorProduct[]

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createVendorProduct = useCallback(async (
    vendorId: string,
    product: Omit<VendorProduct, 'id' | 'vendor_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('vendor_products')
        .insert([{
          ...product,
          vendor_id: vendorId,
          status: 'pending'
        }])
        .select()
        .single()

      if (error) throw error

      // Registrar en audit log
      await logAction(
        'create',
        'vendor_product',
        {
          vendor_id: vendorId,
          product_id: data.id,
          name: product.name
        }
      )

      return data as VendorProduct

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [logAction])

  const updateVendorMetrics = useCallback(async (vendorId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Calcular métricas
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', vendorId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (!orders?.length) return

      const metrics: VendorMetrics = {
        total_sales: orders.length,
        total_revenue: orders.reduce((sum, order) => sum + order.total_amount, 0),
        average_order_value: orders.reduce((sum, order) => sum + order.total_amount, 0) / orders.length,
        return_rate: orders.filter(o => o.status === 'returned').length / orders.length,
        cancellation_rate: orders.filter(o => o.status === 'cancelled').length / orders.length,
        fulfillment_rate: orders.filter(o => o.status === 'completed').length / orders.length,
        customer_satisfaction: calculateCustomerSatisfaction(orders),
        response_time: calculateAverageResponseTime(orders),
        inventory_turnover: await calculateInventoryTurnover(vendorId),
        last_updated: new Date().toISOString()
      }

      // Actualizar métricas
      const { error } = await supabase
        .from('vendors')
        .update({ metrics })
        .eq('id', vendorId)

      if (error) throw error

    } catch (error) {
      setError(error as PostgrestError)
    } finally {
      setLoading(false)
    }
  }, [])

  // Funciones auxiliares
  const calculateCustomerSatisfaction = (orders: any[]) => {
    const ratings = orders
      .filter(o => o.rating)
      .map(o => o.rating)

    return ratings.length
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : 0
  }

  const calculateAverageResponseTime = (orders: any[]) => {
    const responseTimes = orders
      .filter(o => o.first_response_at && o.created_at)
      .map(o => new Date(o.first_response_at).getTime() - new Date(o.created_at).getTime())

    return responseTimes.length
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / (1000 * 60) // en minutos
      : 0
  }

  const calculateInventoryTurnover = async (vendorId: string) => {
    const { data: products } = await supabase
      .from('vendor_products')
      .select('stock_quantity')
      .eq('vendor_id', vendorId)

    if (!products?.length) return 0

    const averageInventory = products.reduce((sum, p) => sum + p.stock_quantity, 0) / products.length

    const { data: sales } = await supabase
      .from('order_items')
      .select('quantity')
      .eq('vendor_id', vendorId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if (!sales?.length) return 0

    const totalSales = sales.reduce((sum, s) => sum + s.quantity, 0)

    return totalSales / averageInventory
  }

  return {
    loading,
    error,
    getVendor,
    getVendorByUser,
    createVendor,
    updateVendor,
    getVendorProducts,
    createVendorProduct,
    updateVendorMetrics
  }
}
