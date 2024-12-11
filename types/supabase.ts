export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string | null
          email: string
          image_url: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          email: string
          image_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string
          image_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string
          code: string
          images: string[]
          price: number
          original_price: number | null
          description: string
          category_id: string
          brand: string
          sku: string
          stock: number
          features: string[]
          status: string
          views: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          code: string
          images: string[]
          price: number
          original_price?: number | null
          description: string
          category_id: string
          brand: string
          sku: string
          stock: number
          features: string[]
          status?: string
          views?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          code?: string
          images?: string[]
          price?: number
          original_price?: number | null
          description?: string
          category_id?: string
          brand?: string
          sku?: string
          stock?: number
          features?: string[]
          status?: string
          views?: number
          created_at?: string
          updated_at?: string
        }
      }
      shipping_zones: {
        Row: {
          id: string
          name: string
          provider: string
          delivery_time: string | null
          price: number
          active: boolean
        }
        Insert: {
          id?: string
          name: string
          provider: string
          delivery_time?: string | null
          price: number
          active?: boolean
        }
        Update: {
          id?: string
          name?: string
          provider?: string
          delivery_time?: string | null
          price?: number
          active?: boolean
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          status: string
          shipping_address: Json
          shipping_method: string | null
          total_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status: string
          shipping_address: Json
          shipping_method?: string | null
          total_amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          status?: string
          shipping_address?: Json
          shipping_method?: string | null
          total_amount?: number
          created_at?: string
          updated_at?: string
        }
      }
      loyalty_points: {
        Row: {
          id: string
          user_id: string
          points: number
          level: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          points?: number
          level?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          points?: number
          level?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
