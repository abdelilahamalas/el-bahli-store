import { AlertCircle, RefreshCw, ShoppingBag } from "lucide-react"
import type { Product } from "@/types/product"
import ProductCard from "@/components/products/ProductCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

interface ProductGridProps {
  products: Product[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyMessage?: string
  onResetFilters?: () => void
}

export default function ProductGrid({
  products,
  isLoading,
  error,
  onRetry,
  emptyMessage = "Aucun produit n'est disponible pour le moment dans cette sélection.",
  onResetFilters,
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-border flex flex-col space-y-3 p-3"
          >
            <Skeleton className="aspect-3/4 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="pt-2 flex justify-between items-center">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center max-w-lg mx-auto space-y-4 my-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-1">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          Impossible de charger le catalogue
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {error}
        </p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Réessayer</span>
          </Button>
        )}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center max-w-xl mx-auto space-y-4 my-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-lightGray text-muted-foreground mb-1">
          <ShoppingBag className="h-6 w-6 text-brand-gold" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          Aucun produit disponible
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {emptyMessage}
        </p>
        {onResetFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="font-medium"
          >
            Réinitialiser les filtres
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
