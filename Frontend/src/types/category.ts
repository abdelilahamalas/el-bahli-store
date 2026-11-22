// ============================================================================
// Types des Catégories — El Bahli Store
// ============================================================================

export interface Category {
  id: number
  name: string
  slug: string
  is_active: boolean
  sort_order?: number
  description?: string | null
  image?: string | null
  image_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface CategoriesApiResponse {
  success: boolean
  message?: string
  data: Category[]
}
