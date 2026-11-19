import { Link } from "react-router-dom"
import { ShoppingBag, ArrowRight } from "lucide-react"
import type { Product } from "@/types/product"
import { getCategoryImage } from "@/utils/categoryImages"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  // Déterminer l'image principale
  const mainImage =
    product.images?.find((img) => img.is_main)?.image_url ||
    product.image_url ||
    product.images?.[0]?.image_url ||
    (product.category_name ? getCategoryImage(product.category_name) : null)

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
      <Card className="overflow-hidden border border-border/70 bg-card transition-all duration-300 hover:border-brand-gold hover:shadow-xl rounded-2xl flex flex-col h-full">
        {/* Conteneur d'image */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-brand-lightGray">
          {mainImage ? (
            <img
              src={mainImage}
              alt={product.name}
              className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-106"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-4 text-center">
              <ShoppingBag className="h-10 w-10 mb-2 opacity-30 text-brand-gold" />
              <span className="text-xs font-semibold">{product.name}</span>
            </div>
          )}

          {/* Badges en superposition */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-10">
            {hasPromo && (
              <Badge variant="destructive" className="font-bold text-[10px] tracking-wider uppercase rounded-full px-2.5 py-0.5 shadow-xs">
                -{Math.round(((numPrice - (numPromo as number)) / numPrice) * 100)}%
              </Badge>
            )}
            {isOutOfStock ? (
              <Badge variant="secondary" className="bg-brand-black text-white text-[10px] uppercase rounded-full px-2.5 py-0.5">
                Épuisé
              </Badge>
            ) : (
              product.category_name && (
                <span className="px-2.5 py-0.5 rounded-full bg-brand-black/75 backdrop-blur-md text-brand-gold text-[10px] font-bold tracking-wider uppercase border border-brand-gold/20">
                  {product.category_name}
                </span>
              )
            )}
          </div>

          {/* Badge Paiement à la livraison comme dans l'exemple de référence */}
          <div className="absolute bottom-2.5 left-2.5 z-10">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-brand-black text-[10px] font-bold shadow-xs border border-border/40">
              Paiement à la livraison
            </span>
          </div>
        </div>

        {/* Détails du produit */}
        <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
          <div className="space-y-1.5">
            <h3 className="font-bold text-sm sm:text-base text-foreground tracking-tight line-clamp-1 group-hover:text-brand-gold transition-colors">
              {product.name}
            </h3>

            {/* Tailles disponibles */}
            {availableSizes.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {availableSizes.slice(0, 4).map((size) => (
                  <span
                    key={size}
                    className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground font-semibold"
                  >
                    {size}
                  </span>
                ))}
                {availableSizes.length > 4 && (
                  <span className="text-[10px] text-muted-foreground font-semibold self-center">
                    +{availableSizes.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Prix */}
          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              {hasPromo ? (
                <>
                  <span className="font-extrabold text-base sm:text-lg text-brand-black">
                    {numPromo} <span className="text-xs font-bold text-brand-gold">MAD</span>
                  </span>
                  <span className="text-xs text-muted-foreground line-through">
                    {numPrice} MAD
                  </span>
                </>
              ) : (
                <span className="font-extrabold text-base sm:text-lg text-brand-black">
                  {numPrice} <span className="text-xs font-bold text-brand-gold">MAD</span>
                </span>
              )}
            </div>
          </div>

          {/* Bouton d'action Voir le produit style boutique streetwear */}
          <div className="pt-1">
            <div className="w-full py-2.5 px-4 rounded-xl bg-brand-black text-white text-xs font-bold text-center transition-all duration-300 group-hover:bg-brand-gold group-hover:text-brand-black group-hover:shadow-md flex items-center justify-center gap-1.5 cursor-pointer">
              <span>Voir le produit</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
