// ============================================================================
// Types de l'API El Bahli Store
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data: T
  meta?: PaginationMeta
  errors?: Record<string, string[]>
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number
  to?: number
}

export interface Category {
  id: number
  name: string
  slug: string
  description?: string | null
  image?: string | null
  order?: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface ProductVariant {
  id: number
  product_id: number
  sku: string
  size: string
  color?: string | null
  color_code?: string | null
  stock: number
  price_override?: number | null
  is_active: boolean
}

export interface Product {
  id: number
  category_id: number
  name: string
  slug: string
  description: string
  price: number
  compare_price?: number | null
  images: string[]
  is_active: boolean
  featured: boolean
  category?: Category
  variants?: ProductVariant[]
  total_stock?: number
  created_at?: string
  updated_at?: string
}

export interface User {
  id: number
  name: string
  email: string
  role?: string
  created_at?: string
}

export interface AuthResponse {
  user: User
  token: string
}
