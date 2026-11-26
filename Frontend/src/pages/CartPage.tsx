import { Link, useNavigate } from "react-router-dom"
import { ShoppingBag, ArrowRight, ArrowLeft, Trash2 } from "lucide-react"
import { useCart } from "@/hooks/useCart"
import AnnouncementBar from "@/components/layout/AnnouncementBar"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import CartItemRow from "@/components/cart/CartItemRow"
import CartSummary from "@/components/cart/CartSummary"
import { Button } from "@/components/ui/button"

export default function CartPage() {
  const navigate = useNavigate()
  const {
    items,
    totalCount,
    subtotal,
    deliveryFee,
    total,
    updateQuantity,
    removeItem,
    clearCart,
    closeCart,
  } = useCart()

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-brand-gold/30">
      <AnnouncementBar />
      <Navbar categories={[]} />

      <main className="flex-1 py-8 sm:py-12">
        <div className="container mx-auto px-4 space-y-8">
          {/* Fil d'Ariane */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-brand-gold transition-colors">
              Accueil
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Mon Panier</span>
          </nav>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Mon Panier
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {totalCount > 0
                  ? `Vous avez ${totalCount} article${totalCount > 1 ? "s" : ""} dans votre sélection.`
                  : "Votre panier est actuellement vide."}
              </p>
            </div>

            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Vider le panier</span>
              </Button>
            )}
          </div>

          {items.length === 0 ? (
            /* Panier vide */
            <div className="rounded-2xl border border-dashed border-border p-12 sm:p-16 text-center max-w-lg mx-auto space-y-4 my-8">
              <div className="h-16 w-16 rounded-full bg-brand-lightGray flex items-center justify-center text-muted-foreground/60 mx-auto">
                <ShoppingBag className="h-8 w-8 text-brand-gold" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-foreground">
                  Votre panier est actuellement vide
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Vous n'avez pas encore ajouté d'articles. Découvrez notre sélection exclusive de prêt-à-porter masculin.
                </p>
              </div>
              <div className="pt-2">
                <Link to="/products">
                  <Button variant="gold" size="lg" className="font-bold text-xs gap-2">
                    <span>Découvrir nos collections</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Panier avec articles */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Colonne Gauche : Liste des articles */}
              <div className="lg:col-span-8 rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="divide-y divide-border/60">
                  {items.map((item) => (
                    <CartItemRow
                      key={`${item.productId}-${item.size}-${item.color}`}
                      item={item}
                      onUpdateQuantity={(q) =>
                        updateQuantity(item.productId, item.size, item.color, q)
                      }
                      onRemove={() =>
                        removeItem(item.productId, item.size, item.color)
                      }
                    />
                  ))}
                </div>

                <div className="pt-6 border-t mt-6 flex justify-between items-center">
                  <Link to="/products">
                    <Button variant="ghost" size="sm" className="gap-2 text-xs">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Continuer mes achats</span>
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Colonne Droite : Récapitulatif et validation */}
              <div className="lg:col-span-4 space-y-4">
                <CartSummary
                  subtotal={subtotal}
                  deliveryFee={deliveryFee}
                  total={total}
                  totalCount={totalCount}
                />

                <Button
                  variant="gold"
                  size="lg"
                  onClick={() => {
                    closeCart()
                    navigate("/checkout")
                  }}
                  className="w-full h-12 text-sm font-bold gap-2 shadow-md"
                >
                  <span>Valider ma commande</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer categories={[]} />
    </div>
  )
}
