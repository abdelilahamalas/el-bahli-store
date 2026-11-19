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

import type { Category } from "./category"
import type { Product, ProductVariant } from "./product"

export type { Category, Product, ProductVariant }

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
