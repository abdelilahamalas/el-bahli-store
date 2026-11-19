// ============================================================================
// Types du Panier et des Commandes — El Bahli Store
// ============================================================================

export interface CartItem {
  productId: number
  variantId: number
  name: string
  slug: string
  image?: string | null
  price: number
  size: string
  color: string
  quantity: number
  maxStock?: number
}

export interface CustomerCheckoutData {
  customer_name: string
  customer_phone: string
  city: string
  address: string
  note?: string
}

export interface OrderItemDetail {
  product_name: string
  size: string
  color: string
  quantity: number
  unit_price: string
  line_total: string
}

export interface PublicOrderData {
  reference: string
  status: string
  status_label: string
  payment_method: string
  payment_method_label: string
  payment_status: string
  payment_status_label: string
  subtotal: string
  delivery_fee: string
  is_delivery_free: boolean
  total: string
  created_at: string
  items: OrderItemDetail[]
}

export interface CreateOrderApiResponse {
  success: boolean
  message: string
  data: {
    reference: string
    confirmation_token: string
    confirmation_url: string
    order: PublicOrderData
  }
}

export interface OrderConfirmationApiResponse {
  success: boolean
  message: string
  data: PublicOrderData
}
