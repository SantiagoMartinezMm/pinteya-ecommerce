import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostgrestError } from '@supabase/supabase-js'
import { ShippingProvider } from './useOrders'

export type ShippingZone = {
  id: string
  name: string
  country: string
  state: string
  city?: string
  zip_codes?: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  shipping_rates: ShippingRate[]
}

export type ShippingRate = {
  id: string
  zone_id: string
  provider: ShippingProvider
  min_weight?: number
  max_weight?: number
  min_order_amount?: number
  max_order_amount?: number
  base_cost: number
  per_kg_cost?: number
  estimated_days_min: number
  estimated_days_max: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CreateShippingZoneInput = Omit<ShippingZone, 'id' | 'created_at' | 'updated_at' | 'shipping_rates'> & {
  shipping_rates: Array<Omit<ShippingRate, 'id' | 'zone_id' | 'created_at' | 'updated_at'>>
}

export type UpdateShippingRateInput = Omit<ShippingRate, 'id' | 'zone_id' | 'created_at' | 'updated_at'>

export function useShippingZones() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PostgrestError | null>(null)

  const getShippingZones = useCallback(async (includeInactive = false) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('shipping_zones')
        .select(`
          *,
          shipping_rates(*)
        `)
        .order('created_at', { ascending: false })

      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw error

      return data as ShippingZone[]
    } catch (error) {
      setError(error as PostgrestError)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getShippingZoneById = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('shipping_zones')
        .select(`
          *,
          shipping_rates(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      return data as ShippingZone
    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createShippingZone = useCallback(async (zoneData: CreateShippingZoneInput) => {
    try {
      setLoading(true)
      setError(null)

      // Crear la zona de envío
      const { data: zone, error: zoneError } = await supabase
        .from('shipping_zones')
        .insert([{
          name: zoneData.name,
          country: zoneData.country,
          state: zoneData.state,
          city: zoneData.city,
          zip_codes: zoneData.zip_codes,
          is_active: zoneData.is_active
        }])
        .select()
        .single()

      if (zoneError) throw zoneError

      // Crear las tarifas de envío
      const shippingRates = zoneData.shipping_rates.map(rate => ({
        ...rate,
        zone_id: zone.id
      }))

      const { error: ratesError } = await supabase
        .from('shipping_rates')
        .insert(shippingRates)

      if (ratesError) throw ratesError

      return await getShippingZoneById(zone.id)
    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateShippingZone = useCallback(async (id: string, updates: Partial<ShippingZone>) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('shipping_zones')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return data as ShippingZone
    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteShippingZone = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      // Eliminar primero las tarifas asociadas
      const { error: ratesError } = await supabase
        .from('shipping_rates')
        .delete()
        .eq('zone_id', id)

      if (ratesError) throw ratesError

      // Eliminar la zona
      const { error } = await supabase
        .from('shipping_zones')
        .delete()
        .eq('id', id)

      if (error) throw error

      return true
    } catch (error) {
      setError(error as PostgrestError)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const addShippingRate = useCallback(async (zoneId: string, rateData: UpdateShippingRateInput) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('shipping_rates')
        .insert([{
          ...rateData,
          zone_id: zoneId
        }])
        .select()
        .single()

      if (error) throw error

      return data as ShippingRate
    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateShippingRate = useCallback(async (rateId: string, updates: Partial<UpdateShippingRateInput>) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('shipping_rates')
        .update(updates)
        .eq('id', rateId)
        .select()
        .single()

      if (error) throw error

      return data as ShippingRate
    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteShippingRate = useCallback(async (rateId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('shipping_rates')
        .delete()
        .eq('id', rateId)

      if (error) throw error

      return true
    } catch (error) {
      setError(error as PostgrestError)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const calculateShipping = useCallback(async (
    address: {
      country: string
      state: string
      city?: string
      zip_code?: string
    },
    orderDetails: {
      total_amount: number
      total_weight?: number
    }
  ) => {
    try {
      setLoading(true)
      setError(null)

      // Buscar zona de envío que coincida con la dirección
      let query = supabase
        .from('shipping_zones')
        .select(`
          *,
          shipping_rates(*)
        `)
        .eq('country', address.country)
        .eq('state', address.state)
        .eq('is_active', true)

      if (address.city) {
        query = query.eq('city', address.city)
      }

      const { data: zones, error } = await query

      if (error) throw error

      if (!zones || zones.length === 0) {
        throw new Error('No shipping zones available for this location')
      }

      // Filtrar tarifas aplicables según peso y monto
      const applicableRates = zones.flatMap(zone => 
        zone.shipping_rates.filter(rate => {
          if (!rate.is_active) return false
          
          const weightInRange = !orderDetails.total_weight || 
            (!rate.min_weight || orderDetails.total_weight >= rate.min_weight) &&
            (!rate.max_weight || orderDetails.total_weight <= rate.max_weight)

          const amountInRange = 
            (!rate.min_order_amount || orderDetails.total_amount >= rate.min_order_amount) &&
            (!rate.max_order_amount || orderDetails.total_amount <= rate.max_order_amount)

          return weightInRange && amountInRange
        })
      )

      if (applicableRates.length === 0) {
        throw new Error('No applicable shipping rates found')
      }

      // Calcular costo para cada tarifa aplicable
      return applicableRates.map(rate => ({
        provider: rate.provider,
        base_cost: rate.base_cost,
        additional_cost: orderDetails.total_weight && rate.per_kg_cost 
          ? rate.per_kg_cost * orderDetails.total_weight 
          : 0,
        total_cost: rate.base_cost + (
          orderDetails.total_weight && rate.per_kg_cost 
            ? rate.per_kg_cost * orderDetails.total_weight 
            : 0
        ),
        estimated_days_min: rate.estimated_days_min,
        estimated_days_max: rate.estimated_days_max
      }))
    } catch (error) {
      setError(error as PostgrestError)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getShippingZones,
    getShippingZoneById,
    createShippingZone,
    updateShippingZone,
    deleteShippingZone,
    addShippingRate,
    updateShippingRate,
    deleteShippingRate,
    calculateShipping
  }
}
