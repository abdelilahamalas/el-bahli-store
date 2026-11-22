import { Link } from "react-router-dom"
import { ShoppingBag, ArrowRight } from "lucide-react"
import type { Product } from "@/types/product"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  // Déterminer uniquement l'image réelle du produit (aucun visuel tiers ou temporaire)
  const mainImage =
    product.images?.find((img) => img.is_main)?.image_url ||
    product.image_url ||
    product.images?.[0]?.image_url ||
    null

  const numPrice = parseFloat(product.price)
  const numPromo = product.promotional_price ? parseFloat(product.promotional_price) : null
  const hasPromo = numPromo !== null && numPromo > 0 && numPromo < numPrice
  const isOutOfStock = product.total_stock <= 0

  // Extraction des tailles uniques disponibles
  const availableSizes = Array.from(
    new Set(
      product.variants
        ?.filter((v) => v.is_in_stock && v.is_active)
        .map((v) => v.size) ?? []
    )
  )

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block focus:outline-hidden"
    >
      <Card className="overflow-hidden border border-border/70 bg-card transition-colors duration-200 hover:border-brand-gold rounded-2xl flex flex-col h-full shadow-2xs hover:shadow-xs">
        {/* Conteneur d'image format moyen équilibré */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-brand-lightGray">
          {mainImage ? (
            <img
              src={mainImage}
              alt={product.name}
              className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-102"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-neutral-100 text-neutral-400 p-4 text-center">
              <ShoppingBag className="h-9 w-9 mb-1.5 opacity-30 text-neutral-600" />
              <span className="text-[11px] font-medium text-neutral-500">{product.name}</span>
            </div>
          )}

          {/* Badges en superposition */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10">
            {hasPromo && (
              <Badge variant="destructive" className="font-bold text-[9.5px] tracking-wider uppercase rounded-full px-2 py-0.5 shadow-xs">
                -{Math.round(((numPrice - (numPromo as number)) / numPrice) * 100)}%
              </Badge>
            )}
            {isOutOfStock ? (
              <Badge variant="secondary" className="bg-brand-black text-white text-[9.5px] uppercase rounded-full px-2 py-0.5">
                Épuisé
              </Badge>
            ) : (
              product.category_name && (
                <span className="px-2 py-0.5 rounded-full bg-brand-black/80 backdrop-blur-md text-brand-gold text-[9.5px] font-bold tracking-wider uppercase border border-brand-gold/20">
                  {product.category_name}
                </span>
              )
            )}
          </div>

          {/* Badge Paiement à la livraison */}
          <div className="absolute bottom-2 left-2 z-10">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-brand-black text-[9.5px] font-bold shadow-2xs border border-border/40">
              Paiement à la livraison
            </span>
          </div>
        </div>

        {/* Détails du produit format moyen */}
        <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-2.5">
          <div className="space-y-1">
            <h3 className="font-bold text-xs sm:text-sm text-foreground tracking-tight line-clamp-1 group-hover:text-brand-gold transition-colors">
              {product.name}
            </h3>

            {/* Tailles disponibles */}
            {availableSizes.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {availableSizes.slice(0, 4).map((size) => (
                  <span
                    key={size}
                    className="text-[9.5px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground font-semibold"
                  >
                    {size}
                  </span>
                ))}
                {availableSizes.length > 4 && (
                  <span className="text-[9.5px] text-muted-foreground font-semibold self-center">
                    +{availableSizes.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Prix */}
          <div className="pt-1.5 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              {hasPromo ? (
                <>
                  <span className="font-extrabold text-sm sm:text-base text-brand-black">
                    {numPromo} <span className="text-[11px] font-bold text-brand-gold">MAD</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground line-through">
                    {numPrice} MAD
                  </span>
                </>
              ) : (
                <span className="font-extrabold text-sm sm:text-base text-brand-black">
                  {numPrice} <span className="text-[11px] font-bold text-brand-gold">MAD</span>
                </span>
              )}
            </div>
          </div>

          {/* Bouton d'action Voir le produit */}
          <div className="pt-0.5">
            <div className="w-full py-2 px-3 rounded-xl bg-[#111111] text-white border border-[#222222] text-xs font-bold text-center transition-colors group-hover:bg-[#1C1C1C] group-hover:border-[#C9A227]/60 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
              <span>Voir le produit</span>
              <ArrowRight className="h-3 w-3 text-[#C9A227]" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
