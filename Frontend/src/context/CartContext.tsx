import { createContext, useState, useEffect, type ReactNode } from "react"
import { toast } from "sonner"
import type { CartItem } from "@/types/cart"

const CART_STORAGE_KEY = "el_bahli_cart"

interface CartContextType {
  items: CartItem[]
  totalCount: number
  subtotal: number
  deliveryFee: number
  total: number
  isCartSheetOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void
  updateQuantity: (
    productId: number,
    size: string,
    color: string,
    quantity: number
  ) => void
  removeItem: (productId: number, size: string, color: string) => void
  clearCart: () => void
}

export const CartContext = createContext<CartContextType | undefined>(undefined)

function loadInitialCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    // Validation des éléments
    return parsed.filter(
      (item): item is CartItem =>
        typeof item === "object" &&
        item !== null &&
        typeof item.productId === "number" &&
        typeof item.name === "string" &&
        typeof item.price === "number" &&
        typeof item.size === "string" &&
        typeof item.quantity === "number" &&
        item.quantity > 0
    )
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadInitialCart())
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false)

  // Sauvegarde automatique dans localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch (e) {
      console.warn("Impossible de sauvegarder le panier dans localStorage :", e)
    }
  }, [items])

  const openCart = () => setIsCartSheetOpen(true)
  const closeCart = () => setIsCartSheetOpen(false)
  const toggleCart = () => setIsCartSheetOpen((prev) => !prev)

  const addItem = (
    itemData: Omit<CartItem, "quantity">,
    qtyToAdd: number = 1
  ) => {
    const targetColor = itemData.color || "Standard"
    const validQty = Math.max(1, qtyToAdd)

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (i) =>
          i.productId === itemData.productId &&
          i.size === itemData.size &&
          (i.color || "Standard") === targetColor
      )

      if (existingIndex > -1) {
        const updated = [...prevItems]
        const currentItem = updated[existingIndex]
        const maxLimit = itemData.maxStock ? Math.min(10, itemData.maxStock) : 10
        const newQty = Math.min(maxLimit, currentItem.quantity + validQty)

        updated[existingIndex] = {
          ...currentItem,
          quantity: newQty,
        }
        return updated
      } else {
        const newItem: CartItem = {
          ...itemData,
          color: targetColor,
          quantity: validQty,
        }
        return [...prevItems, newItem]
      }
    })

    toast.success("Produit ajouté au panier", {
      description: `${itemData.name} · Taille ${itemData.size}${targetColor !== "Standard" ? ` · ${targetColor}` : ""}`,
    })

    // Ouverture automatique du tiroir pour fluidité
    setIsCartSheetOpen(true)
  }

  const updateQuantity = (
    productId: number,
    size: string,
    color: string,
    quantity: number
  ) => {
    const targetColor = color || "Standard"

    if (quantity <= 0) {
      removeItem(productId, size, targetColor)
      return
    }

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (
          item.productId === productId &&
          item.size === size &&
          (item.color || "Standard") === targetColor
        ) {
          const maxLimit = item.maxStock ? Math.min(10, item.maxStock) : 10
          if (quantity > maxLimit) {
            toast.warning("Stock insuffisant", {
              description: `Seulement ${maxLimit} unité(s) disponible(s) en stock pour cette taille.`,
            })
            return {
              ...item,
              quantity: maxLimit,
            }
          }
          return {
            ...item,
            quantity,
          }
        }
        return item
      })
    )
  }

  const removeItem = (productId: number, size: string, color: string) => {
    const targetColor = color || "Standard"
    setItems((prevItems) => {
      const removed = prevItems.find(
        (i) =>
          i.productId === productId &&
          i.size === size &&
          (i.color || "Standard") === targetColor
      )
      if (removed) {
        toast.info("Produit retiré du panier", {
          description: `« ${removed.name} » (${removed.size}) a été retiré de votre sélection.`,
        })
      }
      return prevItems.filter(
        (i) =>
          !(
            i.productId === productId &&
            i.size === size &&
            (i.color || "Standard") === targetColor
          )
      )
    })
  }

  const clearCart = () => {
    setItems([])
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch {
      // Ignorer
    }
  }

  // Calculs dérivés
  const totalCount = items.reduce((acc, item) => acc + item.quantity, 0)
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  )
  const deliveryFee = 0 // Toujours 0 MAD partout au Maroc
  const total = subtotal

  return (
    <CartContext.Provider
      value={{
        items,
        totalCount,
        subtotal,
        deliveryFee,
        total,
        isCartSheetOpen,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
