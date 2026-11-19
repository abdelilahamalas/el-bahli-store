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
      <Card className="overflow-hidden border border-border bg-card transition-all duration-300 hover:border-brand-gold hover:shadow-md rounded-xl flex flex-col h-full">
        {/* Conteneur d'image */}
        <div className="relative aspect-3/4 w-full overflow-hidden bg-brand-lightGray">
          {mainImage ? (
            <img
              src={mainImage}
              alt={product.name}
              className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-4 text-center">
              <ShoppingBag className="h-10 w-10 mb-2 opacity-30 text-brand-gold" />
              <span className="text-xs font-semibold">{product.name}</span>
            </div>
          )}

          {/* Badges en superposition */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start z-10">
            {hasPromo && (
              <Badge variant="destructive" className="font-bold text-[10px] tracking-wider uppercase">
                Promo -{Math.round(((numPrice - (numPromo as number)) / numPrice) * 100)}%
              </Badge>
            )}
            {isOutOfStock ? (
              <Badge variant="secondary" className="bg-brand-black text-white text-[10px] uppercase">
                Épuisé
              </Badge>
            ) : (
              product.category_name && (
                <span className="px-2 py-0.5 rounded-full bg-brand-black/70 backdrop-blur-xs text-brand-gold text-[10px] font-semibold tracking-wider uppercase">
                  {product.category_name}
                </span>
              )
            )}
          </div>
        </div>

        {/* Détails du produit */}
        <div className="p-4 flex flex-col flex-1 justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm sm:text-base text-foreground tracking-tight line-clamp-1 group-hover:text-brand-gold transition-colors">
              {product.name}
            </h3>

            {/* Tailles disponibles */}
            {availableSizes.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {availableSizes.slice(0, 4).map((size) => (
                  <span
                    key={size}
                    className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-mono"
                  >
                    {size}
                  </span>
                ))}
                {availableSizes.length > 4 && (
                  <span className="text-[10px] text-muted-foreground self-center">
                    +{availableSizes.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Prix et action */}
          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              {hasPromo ? (
                <>
                  <span className="font-bold text-base text-brand-black">
                    {numPromo} <span className="text-xs">MAD</span>
                  </span>
                  <span className="text-xs text-muted-foreground line-through">
                    {numPrice} MAD
                  </span>
                </>
              ) : (
                <span className="font-bold text-base text-brand-black">
                  {numPrice} <span className="text-xs">MAD</span>
                </span>
              )}
            </div>

            <span className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-brand-gold group-hover:text-brand-black transition-colors">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
