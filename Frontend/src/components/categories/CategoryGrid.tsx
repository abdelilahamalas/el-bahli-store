import { AlertCircle, RefreshCw } from "lucide-react"
import type { Category } from "@/types/category"
import CategoryCard from "@/components/categories/CategoryCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

interface CategoryGridProps {
  categories: Category[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
}

export default function CategoryGrid({
  categories,
  isLoading,
  error,
  onRetry,
}: CategoryGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-border"
          >
            <Skeleton className="aspect-3/4 w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center max-w-lg mx-auto space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-1">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          Impossible de charger les catégories
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

  if (categories.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Aucune catégorie disponible pour le moment.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  )
}
