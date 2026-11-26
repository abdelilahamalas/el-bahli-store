import { Trash2, ShoppingBag } from "lucide-react"
import type { CartItem } from "@/types/cart"
import { Button } from "@/components/ui/button"

interface CartItemRowProps {
  item: CartItem
  onUpdateQuantity: (quantity: number) => void
  onRemove: () => void
  compact?: boolean
}

export default function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  compact = false,
}: CartItemRowProps) {
  const lineTotal = item.price * item.quantity

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-b-0">
      {/* Photo miniature */}
      <div className={`${compact ? "h-16 w-14" : "h-20 w-16"} shrink-0 overflow-hidden rounded-lg bg-brand-lightGray border border-border`}>
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground/40">
            <ShoppingBag className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Détails du produit */}
      <div className="flex-1 min-w-0 space-y-1">
        <h4 className="font-semibold text-xs sm:text-sm text-foreground truncate">
          {item.name}
        </h4>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="px-1.5 py-0.5 rounded bg-muted font-mono">
            {item.size}
          </span>
          {item.color && item.color !== "Standard" && (
            <span>• {item.color}</span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          {/* Contrôle de quantité */}
          <div className="flex items-center border rounded-md overflow-hidden bg-background">
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              className="h-6 w-6 flex items-center justify-center text-xs font-bold hover:bg-muted"
              aria-label="Diminuer la quantité"
            >
              -
            </button>
            <span className="h-6 px-2 flex items-center justify-center text-xs font-semibold">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              disabled={item.maxStock !== undefined ? item.quantity >= item.maxStock : item.quantity >= 10}
              className="h-6 w-6 flex items-center justify-center text-xs font-bold hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none transition-colors"
              aria-label="Augmenter la quantité"
            >
              +
            </button>
          </div>

          {/* Prix total de la ligne */}
          <div className="text-right">
            <span className="font-bold text-xs sm:text-sm text-foreground">
              {lineTotal.toFixed(2)} MAD
            </span>
            {item.quantity > 1 && (
              <span className="block text-[10px] text-muted-foreground">
                ({item.price.toFixed(2)} MAD / u)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bouton de suppression */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
        aria-label={`Supprimer ${item.name} du panier`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
