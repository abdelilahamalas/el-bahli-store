import { useNavigate } from "react-router-dom"
import { ShoppingBag, Truck, ArrowRight } from "lucide-react"
import { useCart } from "@/hooks/useCart"
import { siteConfig } from "@/config/site"
import CartItemRow from "@/components/cart/CartItemRow"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export default function CartSheet() {
  const navigate = useNavigate()
  const {
    items,
    totalCount,
    subtotal,
    total,
    isCartSheetOpen,
    closeCart,
    updateQuantity,
    removeItem,
  } = useCart()

  const handleCheckout = () => {
    closeCart()
    navigate("/checkout")
  }

  const handleViewCart = () => {
    closeCart()
    navigate("/cart")
  }

  return (
    <Sheet open={isCartSheetOpen} onOpenChange={(open) => { if (!open) closeCart() }}>
      <SheetContent
        side="right"
        className="w-[90vw] sm:w-[420px] p-0 flex flex-col bg-background border-l shadow-2xl"
      >
        {/* En-tête du tiroir */}
        <SheetHeader className="p-5 border-b bg-brand-lightGray/30 text-left">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <ShoppingBag className="h-5 w-5 text-brand-gold" />
              <span>Mon Panier</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-black text-white ml-1">
                {totalCount}
              </span>
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Bannière livraison gratuite */}
        <div className="bg-brand-black text-white px-4 py-2 text-xs flex items-center justify-center gap-2">
          <Truck className="h-3.5 w-3.5 text-brand-gold shrink-0" />
          <span className="font-medium text-[11px] truncate">
            {siteConfig.announcement}
          </span>
        </div>

        {/* Corps du tiroir : Liste des articles */}
        <div className="flex-1 overflow-y-auto px-5 py-3 divide-y divide-border/40">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="h-16 w-16 rounded-full bg-brand-lightGray flex items-center justify-center text-muted-foreground/60">
                <ShoppingBag className="h-8 w-8 text-brand-gold" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">
                  Votre panier est vide
                </h4>
                <p className="text-xs text-muted-foreground">
                  Explorez nos collections et ajoutez vos articles favoris.
                </p>
              </div>
              <Button
                variant="gold"
                size="sm"
                onClick={() => {
                  closeCart()
                  navigate("/products")
                }}
                className="font-bold text-xs"
              >
                Découvrir le catalogue
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <CartItemRow
                key={`${item.productId}-${item.size}-${item.color}`}
                item={item}
                onUpdateQuantity={(q) =>
                  updateQuantity(item.productId, item.size, item.color, q)
                }
                onRemove={() =>
                  removeItem(item.productId, item.size, item.color)
                }
                compact
              />
            ))
          )}
        </div>

        {/* Pied du tiroir : Totaux & Actions */}
        {items.length > 0 && (
          <div className="p-5 border-t bg-muted/20 space-y-4">
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Sous-total</span>
                <span className="font-semibold text-foreground">
                  {subtotal.toFixed(2)} MAD
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-brand-gold" />
                  <span>Livraison partout au Maroc</span>
                </span>
                <span className="font-bold text-green-600">GRATUITE (0,00 DH)</span>
              </div>
              <div className="pt-2 border-t flex items-baseline justify-between text-base">
                <span className="font-bold text-foreground">Total à payer</span>
                <span className="font-black text-lg text-brand-black">
                  {total.toFixed(2)} <span className="text-xs font-semibold">MAD</span>
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                variant="gold"
                size="lg"
                onClick={handleCheckout}
                className="w-full h-11 text-xs font-bold gap-2 shadow-sm"
              >
                <span>Passer la commande</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewCart}
                  className="h-9 text-xs font-semibold"
                >
                  Voir mon panier
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeCart}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  Continuer achats
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
