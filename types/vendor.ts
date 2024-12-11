export type VendorStatus = 'active' | 'pending' | 'suspended' | 'inactive'

export interface VendorProfile {
  id: string
  user_id: string
  business_name: string
  business_type: string
  tax_id: string
  contact_email: string
  contact_phone: string
  status: VendorStatus
  rating: number
  total_sales: number
  commission_rate: number
  payment_info: {
    bank_name?: string
    account_number?: string
    account_type?: string
    holder_name?: string
  }
  address: {
    street: string
    number: string
    city: string
    state: string
    zip_code: string
    country: string
  }
  created_at: string
  updated_at: string
}

export interface VendorStats {
  total_products: number
  active_products: number
  total_orders: number
  total_revenue: number
  commission_earned: number
  average_rating: number
  sales_by_month: {
    month: string
    sales: number
    revenue: number
  }[]
}

export interface VendorStore {
  id: string
  vendor_id: string
  name: string
  description: string
  logo_url?: string
  banner_url?: string
  theme_color?: string
  social_media?: {
    facebook?: string
    instagram?: string
    twitter?: string
  }
  business_hours?: {
    monday?: string
    tuesday?: string
    wednesday?: string
    thursday?: string
    friday?: string
    saturday?: string
    sunday?: string
  }
  settings: {
    show_ratings: boolean
    allow_reviews: boolean
    minimum_order?: number
    shipping_methods: string[]
    payment_methods: string[]
  }
}
