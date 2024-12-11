import { Product } from './product'

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'

export interface OrderItem {
  id: string
  product_id: string
  product: Product
  quantity: number
  unit_price: number
  total_price: number
}

export interface ShippingAddress {
  street: string
  number: string
  city: string
  state: string
  zip_code: string
  country: string
  additional_info?: string
}

export interface Order {
  id: string
  user_id: string
  order_number: string
  items: OrderItem[]
  subtotal: number
  shipping_cost: number
  tax: number
  total: number
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: string
  shipping_address: ShippingAddress
  billing_address: ShippingAddress
  notes?: string
  created_at: string
  updated_at: string
}

export type OrderSummary = {
  total_orders: number
  total_revenue: number
  average_order_value: number
  orders_by_status: Record<OrderStatus, number>
}
