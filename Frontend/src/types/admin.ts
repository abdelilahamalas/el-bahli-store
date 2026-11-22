// ============================================================================
// Types Administrateur — El Bahli Store (Phase 25)
// ============================================================================

export interface AdminUser {
  id: number
  name: string
  email: string
  is_admin: boolean
  created_at?: string
}

export interface AdminLoginResponse {
  token: string
  token_type: string
  user: AdminUser
}

// ----------------------------------------------------------------------------
// Dashboard & Statistiques
// ----------------------------------------------------------------------------

export interface StatusCountItem {
  label: string
  count: number
  percentage?: number
}

export interface DayActivity {
  date: string
  orders_count: number
  revenue: string
}

export interface TopProductItem {
  product_id: number
  product_name: string
  category_name?: string
  image_url?: string | null
  units_sold: number
  revenue: string
}

export interface TopCategoryItem {
  id?: number
  name: string
  category_id?: number
  category_name?: string
  units_sold: number
  revenue: string
}

export interface LowStockAlertItem {
  variant_id: number
  product_id: number
  product_name: string
  image_url?: string | null
  size: string
  color: string
  stock: number
  status?: "out_of_stock" | "low_stock"
}

export interface DashboardKpis {
  total_orders: number
  pending_orders: number
  confirmed_orders: number
  processing_orders: number
  shipped_orders: number
  delivered_orders: number
  cancelled_orders: number
  return_requested_orders?: number
  return_received_orders?: number
  returned_orders?: number
  revenue: string
  amount_to_collect: string
  collected_revenue: string
  payment_method: string
  is_delivery_free: boolean
  currency: string
  total_products: number
  active_products: number
  active_categories: number
  total_categories?: number
  total_variants: number
  available_variants: number
  total_stock: number
  out_of_stock_variants: number
  low_stock_variants: number
  low_stock_threshold: number
}

export interface CategorySaleItem {
  id: number
  name: string
  slug: string
  units_sold: number
  revenue: string
}

export interface AdminDashboardData {
  period: {
    type: string
    start_date?: string
    end_date?: string
  }
  kpis: DashboardKpis
  orders_count: number
  orders_by_status: Record<string, StatusCountItem>
  revenue: string
  activity_7_days: DayActivity[]
  category_sales?: CategorySaleItem[]
  charts: {
    activity_evolution: DayActivity[]
    status_distribution: Record<string, StatusCountItem>
    top_products: TopProductItem[]
    top_categories: TopCategoryItem[]
    category_sales?: CategorySaleItem[]
  }
  stock_alerts: LowStockAlertItem[]
  category_stock?: { id: number; name: string; stock: number }[]
  product_stock?: { id: number; name: string; category_name: string; stock: number; image_url?: string | null }[]
  stock_by_size?: { size: string; total_stock: number; variants_count: number }[]
  stock_by_color?: { color: string; total_stock: number; variants_count: number }[]
  recent_movements?: {
    id: number
    product_name: string
    size?: string
    color?: string
    type: string
    quantity_before: number
    quantity_delta: number
    quantity_after: number
    reason?: string | null
    admin_name?: string | null
    created_at: string
  }[]
  recent_orders: AdminOrder[]
  inventory: InventoryStats
}

// ----------------------------------------------------------------------------
// Produits & Variantes
// ----------------------------------------------------------------------------

export interface AdminProductImage {
  id: number
  product_id: number
  image_url: string
  is_main: boolean
  sort_order: number
}

export interface AdminProductVariant {
  id: number
  product_id: number
  size: string
  color: string
  stock: number
  is_active: boolean
  is_in_stock?: boolean
}

export interface AdminProduct {
  id: number
  category_id: number
  category_name?: string
  name: string
  slug: string
  description: string | null
  price: string
  promotional_price: string | null
  is_active: boolean
  total_stock: number
  created_at: string
  updated_at?: string
  images: AdminProductImage[]
  sizes: AdminProductVariant[]
  variants?: AdminProductVariant[]
  category?: {
    id: number
    name: string
    slug: string
  }
}

export interface CreateProductPayload {
  name: string
  category_id: number
  description?: string
  price: number | string
  promotional_price?: number | string | null
  is_active?: boolean
  sizes: {
    size: string
    color: string
    stock: number
    is_active?: boolean
  }[]
}

export interface UpdateProductPayload {
  name?: string
  category_id?: number
  description?: string | null
  price?: number | string
  promotional_price?: number | string | null
  is_active?: boolean
  sizes?: {
    size: string
    color: string
    stock: number
    is_active?: boolean
  }[]
}

// ----------------------------------------------------------------------------
// Commandes
// ----------------------------------------------------------------------------

export type OrderStatusValue =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "return_requested"
  | "return_received"
  | "returned"

export type PaymentStatusValue = "pending" | "paid" | "refunded"

export interface AdminOrderItem {
  id: number
  order_id: number
  product_id: number
  product_size_id: number
  product_name: string
  product_image?: string | null
  product_slug?: string | null
  size: string
  color: string
  unit_price: string
  quantity: number
  line_total: string
  product?: {
    id: number
    name: string
    slug: string
    images?: { image_url: string; is_main: boolean }[]
  }
}

export interface AdminOrderStatusHistory {
  id: number
  order_id: number
  from_status: string | null
  to_status: string
  reason: string | null
  created_at: string
  user?: {
    id: number
    name: string
  }
}

export interface AdminOrder {
  id: number
  reference: string
  customer_name: string
  customer_phone: string
  city?: string
  customer_city?: string
  address?: string
  customer_address?: string
  note?: string | null
  delivery_notes?: string | null
  admin_notes: string | null
  total: string
  subtotal: string
  delivery_fee: string
  status: OrderStatusValue
  status_label: string
  payment_method: string
  payment_status: PaymentStatusValue
  items_count?: number
  confirmed_at?: string | null
  processing_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  cancelled_at?: string | null
  return_requested_at?: string | null
  return_received_at?: string | null
  returned_at?: string | null
  created_at: string
  updated_at?: string
  items?: AdminOrderItem[]
  status_history?: AdminOrderStatusHistory[]
  status_histories?: AdminOrderStatusHistory[]
  statusHistories?: AdminOrderStatusHistory[]
}

export interface AllowedTransition {
  value: OrderStatusValue
  label: string
}

export interface AdminOrderDetailResponse {
  order: AdminOrder
  allowed_transitions: AllowedTransition[]
}

// ----------------------------------------------------------------------------
// Catégories Administrateur
// ----------------------------------------------------------------------------

export interface AdminCategory {
  id: number
  name: string
  slug: string
  is_active: boolean
  sort_order: number
  products_count?: number
  created_at?: string
  updated_at?: string
}

// ----------------------------------------------------------------------------
// Inventaire & Mouvements
// ----------------------------------------------------------------------------

export interface InventoryVariantItem {
  id: number
  size: string
  color: string
  stock: number
  is_active: boolean
  is_low_stock: boolean
  is_out_of_stock: boolean
}

export interface InventoryItem {
  id: number
  name: string
  slug: string
  category_id: number
  category_name?: string
  price: string
  is_active: boolean
  image_url: string | null
  thumbnail_url: string | null
  total_stock: number
  stock_status: "disponible" | "stock_faible" | "rupture" | "out_of_stock" | "low_stock" | "in_stock"
  stock_status_label: string
  variants: InventoryVariantItem[]
}

export interface InventoryStats {
  total_units: number
  total_stock: number
  total_products: number
  total_variants: number
  in_stock_count: number
  low_stock_count: number
  out_of_stock_count: number
  products_out_of_stock: number
  products_low_stock: number
  estimated_stock_value?: string
  pending_orders?: number
  confirmed_orders?: number
}

export interface StockMovementItem {
  id: number
  variant_id: number
  product_name: string
  size: string
  color: string
  type: string
  quantity_before: number
  quantity_delta: number
  quantity_after: number
  reason: string | null
  admin_name: string | null
  order_reference: string | null
  created_at: string
}

// ----------------------------------------------------------------------------
// Paramètres de la boutique
// ----------------------------------------------------------------------------

export interface StoreSettings {
  store_name: string
  store_phone: string
  store_email: string
  store_logo: string | null
  store_logo_url: string | null
  instagram_url: string
  tiktok_url: string
  whatsapp_number: string
  whatsapp_link: string
  delivery_fee: string
  is_delivery_free: boolean
  payment_method: string
  low_stock_threshold: number
  currency: string
  language: string
  store_city: string
  store_address: string
}
