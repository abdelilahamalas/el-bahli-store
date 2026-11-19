import api from "@/services/api"
import type {
  CartItem,
  CustomerCheckoutData,
  CreateOrderApiResponse,
  OrderConfirmationApiResponse,
  PublicOrderData,
} from "@/types/cart"

function generateIdempotencyToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "idem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11)
}

export const orderService = {
  /**
   * Crée une nouvelle commande publique via l'API REST Laravel.
   */
  async createOrder(
    customerData: CustomerCheckoutData,
    cartItems: CartItem[]
  ): Promise<CreateOrderApiResponse["data"]> {
    try {
      const payload = {
        customer_name: customerData.customer_name.trim(),
        customer_phone: customerData.customer_phone.trim(),
        city: customerData.city.trim(),
        address: customerData.address.trim(),
        note: customerData.note ? customerData.note.trim() : null,
        idempotency_token: generateIdempotencyToken(),
        website: "", // Honeypot anti-robot vide
        items: cartItems.map((item) => ({
          product_id: item.productId,
          size: item.size,
          color: item.color || "Standard",
          quantity: item.quantity,
        })),
      }

      const response = await api.post<CreateOrderApiResponse>("/orders", payload)
      return response.data.data
    } catch (error) {
      console.error("Erreur lors de la création de la commande :", error)
      throw error
    }
  },

  /**
   * Récupère le récapitulatif public de la commande pour la page de confirmation.
   */
  async getOrderConfirmation(token: string): Promise<PublicOrderData> {
    try {
      const response = await api.get<OrderConfirmationApiResponse>(
        `/orders/confirmation/${token}`
      )
      return response.data.data
    } catch (error) {
      console.error(`Erreur lors de la récupération de la commande ${token} :`, error)
      throw error
    }
  },
}

export default orderService
