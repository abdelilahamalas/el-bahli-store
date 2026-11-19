// ============================================================================
// Types des Produits et Variantes — El Bahli Store
// ============================================================================

export interface ProductVariant {
  id: number
  size: string
  color: string
  stock: number
  is_in_stock: boolean
  is_active: boolean
}

export interface ProductImage {
  id: number
  image_url: string
  thumbnail_url?: string | null
  is_main: boolean
  sort_order: number
  alt_text?: string | null
}

export interface Product {
  id: number
  category_id: number
  category_name?: string | null
  name: string
  slug: string
  description: string
  price: string
  promotional_price?: string | null
  image_url?: string | null
  thumbnail_url?: string | null
  is_active: boolean
  variants: ProductVariant[]
  sizes?: ProductVariant[]
  images: ProductImage[]
  total_stock: number
  created_at?: string
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface ProductFilterParams {
  page?: number
  per_page?: number
  category_id?: number
  category_slug?: string
  search?: string
  min_price?: number
  max_price?: number
  sort?: "latest" | "price_asc" | "price_desc" | "name_asc"
  size?: string
  color?: string
}

export interface ProductsApiResponse {
  success: boolean
  message?: string
  data: {
    data: Product[]
    pagination: PaginationMeta
  }
}

export interface ProductDetailApiResponse {
  success: boolean
  message?: string
  data: Product
}

export interface CategoryProductsApiResponse {
  success: boolean
  message?: string
  data: {
    category: {
      id: number
      name: string
      slug: string
      is_active: boolean
      sort_order?: number
    }
    products: {
      data: Product[]
      pagination: PaginationMeta
    }
  }
}
