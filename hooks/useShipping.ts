import { useCallback, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/hooks/useSession'
import { PostgrestError } from '@supabase/supabase-js'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { usePagination } from './usePagination'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useAudit, type AuditAction, type AuditResource } from './useAudit'

export type ShippingMethod = 'standard' | 'express' | 'same_day' | 'pickup'

 
export type CarrierService = {
  id: string
  carrier_id: string
  name: string
  code: string
  shipping_method: ShippingMethod
  estimated_days: number
  tracking_url_template: string
  is_active: boolean
}

export type ShippingZone = {
  id: string
  name: string
  country_codes: string[]
  regions?: string[]
  postal_codes?: string[]
  is_active: boolean
}

export type ShippingRate = {
  id: string
  zone_id: string
  carrier_service_id: string
  min_weight?: number
  max_weight?: number
  min_order_amount?: number
  max_order_amount?: number
  base_cost: number
  per_kg_cost?: number
  free_shipping_threshold?: number
  estimated_days: number
  is_active: boolean
}

export type Address = {
  street: string
  number: string
  apartment?: string
  city: string
  state: string
  postal_code: string
  country: string
  reference?: string
}

export type Package = {
  weight: number
  width: number
  height: number
  length: number
  value: number
  items: Array<{
    product_id: string
    quantity: number
    weight: number
  }>
}

export type ShippingQuote = {
  carrier_service_id: string
  carrier_name: string
  service_name: string
  cost: number
  estimated_days: number
  shipping_method: ShippingMethod
}

export type Shipment = {
  id: string
  order_id: string
  carrier_service_id: string
  tracking_number?: string
  tracking_url?: string
  status: ShippingStatus
  shipping_address: Address
  package_info: Package
  label_url?: string
  estimated_delivery_date?: string
  actual_delivery_date?: string
  shipping_cost: number
  created_at: string
  updated_at: string
}

export type CreateShipmentInput = Omit<
  Shipment,
  'id' | 'status' | 'tracking_url' | 'label_url' | 'actual_delivery_date' | 'created_at' | 'updated_at'
>

export type ShippingStatus = 'PENDING' | 'PROCESSING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED'

// Configuración de métodos de envío
const SHIPPING_METHODS: Record<ShippingMethod, any> = {
  standard: {
    name: 'Envío Estándar',
    minDays: 3,
    maxDays: 7,
    maxWeight: 30,
    restrictions: []
  },
  express: {
    name: 'Envío Express',
    minDays: 1,
    maxDays: 3,
    maxWeight: 20,
    restrictions: ['no_weekends']
  },
  same_day: {
    name: 'Envío en el Día',
    minDays: 0,
    maxDays: 1,
    maxWeight: 10,
    restrictions: ['same_city', 'business_hours']
  },
  pickup: {
    name: 'Retiro en Tienda',
    minDays: 0,
    maxDays: 2,
    maxWeight: 50,
    restrictions: ['store_hours']
  }
}

export function useShipping() {
  const supabase = createClient()
  const { session } = useSession()
  const { logAction } = useAudit()
  const { loading, error, setLoading, setError, resetState } = useLoadingState<PostgrestError>()
  const { data: cachedShipping, setData: setCachedShipping } = useCache<Record<string, any>>('shipping')
  const { executeWithRetry } = useRetry()
  const { getPaginationQuery, getPaginatedResponse } = usePagination()
  const [activeSubscription, setActiveSubscription] = useState<RealtimeChannel | null>(null)

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (activeSubscription) {
        activeSubscription.unsubscribe()
      }
    }
  }, [activeSubscription])

  // Función auxiliar para generar claves de caché
  const getCacheKey = useCallback((key: string, params?: Record<string, any>) => {
    return params ? `${key}_${JSON.stringify(params)}` : key
  }, [])

  // Función auxiliar para invalidar caché relacionado
  const invalidateRelatedCache = useCallback((patterns: string[]) => {
    patterns.forEach(pattern => {
      const keys = Object.keys(cachedShipping || {}).filter(key => key.startsWith(pattern))
      keys.forEach(key => setCachedShipping(key, null))
    })
  }, [cachedShipping, setCachedShipping])

  // Función auxiliar para validar estado de envío
  const validateShippingStatus = useCallback((
    currentStatus: ShippingStatus,
    newStatus: ShippingStatus
  ): boolean => {
    const statusFlow = {
      PENDING: ['PROCESSING', 'FAILED'],
      PROCESSING: ['IN_TRANSIT', 'FAILED'],
      IN_TRANSIT: ['DELIVERED', 'FAILED'],
      DELIVERED: [],
      FAILED: []
    }
    return statusFlow[currentStatus].includes(newStatus)
  }, [])

  // Función auxiliar para validar restricciones de envío
  const validateShippingRestrictions = useCallback((
    method: ShippingMethod,
    package_info: Package,
    address: Address
  ): { valid: boolean; errors: string[] } => {
    const methodConfig = SHIPPING_METHODS[method]
    const errors: string[] = []

    // Validar peso
    if (package_info.weight > methodConfig.maxWeight) {
      errors.push(`El peso excede el máximo permitido de ${methodConfig.maxWeight}kg para este método`)
    }

    // Validar restricciones específicas
    methodConfig.restrictions.forEach((restriction: string) => {
      switch (restriction) {
        case 'same_city':
          // Implementar validación de misma ciudad
          break
        case 'business_hours':
          // Implementar validación de horario comercial
          break
        case 'no_weekends':
          if (new Date().getDay() % 6 === 0) {
            errors.push('Este método no está disponible los fines de semana')
          }
          break
        case 'store_hours':
          // Implementar validación de horario de tienda
          break
      }
    })

    return {
      valid: errors.length === 0,
      errors
    }
  }, [])

  // Función auxiliar para calcular costo de envío
  const calculateShippingCost = useCallback((
    rate: ShippingRate,
    package_info: Package
  ): number => {
    let cost = rate.base_cost

    // Agregar costo por peso si aplica
    if (rate.per_kg_cost && package_info.weight > 0) {
      cost += rate.per_kg_cost * package_info.weight
    }

    // Aplicar envío gratis si aplica
    if (rate.free_shipping_threshold && package_info.value >= rate.free_shipping_threshold) {
      cost = 0
    }

    return cost
  }, [])

  const getShippingZones = useCallback(async () => {
    try {
      setLoading(true)
      resetState()

      // Check cache first
      const cacheKey = 'shipping_zones'
      const cached = cachedShipping?.get(cacheKey)
      if (cached) {
        return cached
      }

      const { data, error: fetchError } = await executeWithRetry(async () => {
        return await supabase
        .from('shipping_zones')
        .select('*')
        .eq('is_active', true)
        .order('name')
      })

      if (fetchError) throw fetchError

      // Cache the results
      if (data) {
        setCachedShipping(cacheKey, data)
      }

      return data as ShippingZone[]
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, cachedShipping, setCachedShipping])

  const getZoneRates = useCallback(async (zoneId: string) => {
    try {
      setLoading(true)
      resetState()

      // Check cache first
      const cacheKey = getCacheKey('zone_rates', { zoneId })
      const cached = cachedShipping?.get(cacheKey)
      if (cached) {
        return cached
      }

      const { data, error: fetchError } = await executeWithRetry(async () => {
        return await supabase
        .from('shipping_rates')
        .select(\`
          *,
          carrier_services (*)
        \`)
        .eq('zone_id', zoneId)
        .eq('is_active', true)
      })

      if (fetchError) throw fetchError

      // Cache the results
      if (data) {
        setCachedShipping(cacheKey, data)
      }

      return data as (ShippingRate & { carrier_services: CarrierService })[]
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, cachedShipping, setCachedShipping, getCacheKey])

  const findApplicableZone = useCallback(async (address: Address): Promise<ShippingZone | null> => {
    try {
      setLoading(true)
      resetState()

      // Check cache first
      const cacheKey = getCacheKey('applicable_zone', address)
      const cached = cachedShipping?.get(cacheKey)
      if (cached) {
        return cached
      }

      const { data, error: fetchError } = await executeWithRetry(async () => {
        const zones = await getShippingZones()
        if (!zones) return { data: null }

        // Encontrar zona más específica que aplique
        const applicableZone = zones.find(zone => {
          // Validar país
          if (!zone.country_codes.includes(address.country)) return false

          // Validar región si está especificada
          if (zone.regions && !zone.regions.includes(address.state)) return false

          // Validar código postal si está especificado
          if (zone.postal_codes) {
            const postalCodeMatch = zone.postal_codes.some(pattern => {
              if (pattern.includes('*')) {
                const regex = new RegExp('^' + pattern.replace('*', '.*') + '$')
                return regex.test(address.postal_code)
              }
              return pattern === address.postal_code
            })
            if (!postalCodeMatch) return false
          }

          return true
        })

        return { data: applicableZone || null }
      })

      if (fetchError) throw fetchError

      // Cache the result
      if (data) {
        setCachedShipping(cacheKey, data)
      }

      return data as ShippingZone
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, getShippingZones, cachedShipping, setCachedShipping, getCacheKey])

  const getShippingQuotes = useCallback(async (
    address: Address,
    package_info: Package
  ): Promise<ShippingQuote[]> => {
    try {
      setLoading(true)
      resetState()

      // Check cache first
      const cacheKey = getCacheKey('shipping_quotes', { address, package_info })
      const cached = cachedShipping?.get(cacheKey)
      if (cached) {
        return cached
      }

      const { data: quotes, error: quotesError } = await executeWithRetry(async () => {
        // Encontrar zona aplicable
        const zone = await findApplicableZone(address)
        if (!zone) return { data: [] }

        // Obtener tarifas para la zona
        const rates = await getZoneRates(zone.id)
        if (!rates) return { data: [] }

        // Calcular costos para cada tarifa aplicable
        const validQuotes: ShippingQuote[] = []

        for (const rate of rates) {
          // Verificar restricciones de peso y monto
          if (
            (rate.min_weight && package_info.weight < rate.min_weight) ||
            (rate.max_weight && package_info.weight > rate.max_weight) ||
            (rate.min_order_amount && package_info.value < rate.min_order_amount) ||
            (rate.max_order_amount && package_info.value > rate.max_order_amount)
          ) {
            continue
          }

          // Validar restricciones del método
          const { valid, errors } = validateShippingRestrictions(
            rate.carrier_services.shipping_method,
            package_info,
            address
          )
          if (!valid) continue

          // Calcular costo
          const cost = calculateShippingCost(rate, package_info)

          validQuotes.push({
            carrier_service_id: rate.carrier_service_id,
            carrier_name: rate.carrier_services.name,
            service_name: rate.carrier_services.name,
            cost,
            estimated_days: rate.estimated_days,
            shipping_method: rate.carrier_services.shipping_method
          })
        }

        return { data: validQuotes }
      })

      if (quotesError) throw quotesError

      // Cache the results
      if (quotes) {
        setCachedShipping(cacheKey, quotes)
      }

      return quotes
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [
    supabase,
    setLoading,
    setError,
    resetState,
    executeWithRetry,
    findApplicableZone,
    getZoneRates,
    validateShippingRestrictions,
    calculateShippingCost,
    cachedShipping,
    setCachedShipping,
    getCacheKey
  ])

  const createShipment = useCallback(async (shipmentData: CreateShipmentInput): Promise<Shipment> => {
    try {
      setLoading(true)
      resetState()

      const { data, error: createError } = await executeWithRetry(async () => {
        // Validar restricciones del método de envío
        const { data: service } = await supabase
          .from('carrier_services')
          .select('shipping_method')
          .eq('id', shipmentData.carrier_service_id)
          .single()

        if (!service) throw new Error('Servicio de envío no encontrado')

        const { valid, errors } = validateShippingRestrictions(
          service.shipping_method,
          shipmentData.package_info,
          shipmentData.shipping_address
        )

        if (!valid) {
          throw new Error(`Restricciones de envío no cumplidas: ${errors.join(', ')}`)
        }

        // Crear envío
        const result = await supabase
        .from('shipments')
        .insert([{
          ...shipmentData,
            status: 'PENDING',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }])
        .select()
        .single()

        if (result.data) {
          await logAction(
            'shipping.create' as AuditAction,
            'shipping' as AuditResource,
            {
              shipment_id: result.data.id,
              order_id: shipmentData.order_id,
              carrier_service_id: shipmentData.carrier_service_id
            }
          )

          // Invalidate related caches
          invalidateRelatedCache(['shipping_quotes', 'shipment'])
        }

        return result
      })

      if (createError) throw createError

      return data as Shipment
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [
    supabase,
    setLoading,
    setError,
    resetState,
    executeWithRetry,
    validateShippingRestrictions,
    logAction,
    invalidateRelatedCache
  ])

  const updateShipmentStatus = useCallback(async (
    shipmentId: string,
    status: ShippingStatus,
    trackingInfo?: { tracking_number: string; tracking_url: string }
  ): Promise<Shipment> => {
    try {
      setLoading(true)
      resetState()

      const { data, error: updateError } = await executeWithRetry(async () => {
        // Get current shipment
        const { data: currentShipment } = await supabase
          .from('shipments')
          .select('status')
          .eq('id', shipmentId)
          .single()

        if (!currentShipment) throw new Error('Envío no encontrado')

        // Validate status change
        if (!validateShippingStatus(currentShipment.status, status)) {
          throw new Error('Cambio de estado inválido')
        }

        // Update shipment
        const result = await supabase
        .from('shipments')
          .update({
            status,
            ...(trackingInfo || {}),
            updated_at: new Date().toISOString()
          })
        .eq('id', shipmentId)
        .select()
        .single()

        if (result.data) {
          await logAction(
            'shipping.update_status' as AuditAction,
            'shipping' as AuditResource,
            {
              shipment_id: shipmentId,
              status,
              tracking_info: trackingInfo
            }
          )

          // Invalidate related caches
          invalidateRelatedCache(['shipment'])
        }

        return result
      })

      if (updateError) throw updateError

      return data as Shipment
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [
    supabase,
    setLoading,
    setError,
    resetState,
    executeWithRetry,
    validateShippingStatus,
    logAction,
    invalidateRelatedCache
  ])

  return {
    loading,
    error,
    getShippingZones,
    getZoneRates,
    getShippingQuotes,
    createShipment,
    updateShipmentStatus
  }
}
