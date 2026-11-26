import { useState } from "react"
import { Search, SlidersHorizontal, X, ArrowDownUp } from "lucide-react"
import type { Category } from "@/types/category"
import type { ProductFilterParams } from "@/types/product"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface ProductFiltersProps {
  categories: Category[]
  filters: ProductFilterParams
  onFilterChange: (newFilters: Partial<ProductFilterParams>) => void
  onReset: () => void
  totalCount?: number
  hideCategoryPills?: boolean
  isCategoryPage?: boolean
}

export default function ProductFilters({
  categories,
  filters,
  onFilterChange,
  onReset,
  totalCount,
  hideCategoryPills = false,
  isCategoryPage = false,
}: ProductFiltersProps) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(filters.search || "")

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onFilterChange({ search: searchInput.trim() || undefined, page: 1 })
  }

  const handleClearSearch = () => {
    setSearchInput("")
    onFilterChange({ search: undefined, page: 1 })
  }

  // Ne pas compter category_slug comme un filtre actif si on est sur la page dédiée à une catégorie
  const activeFiltersCount = [
    !isCategoryPage && Boolean(filters.category_slug),
    Boolean(filters.search),
    Boolean(filters.min_price),
    Boolean(filters.max_price),
    Boolean(filters.sort && filters.sort !== "latest"),
  ].filter(Boolean).length

  return (
    <div className="space-y-4 mb-8">
      {/* Barre supérieure : Recherche + Tri + Déclencheur Filtres */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Recherche par nom */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1 max-w-md flex items-center"
        >
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher par nom de vêtement..."
            className="pl-9 pr-9 h-10 text-xs sm:text-sm rounded-xl"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-2 justify-between sm:justify-end">
          {/* Sélecteur de Tri */}
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4 text-muted-foreground hidden sm:inline-block" />
            <Select
              value={filters.sort || "latest"}
              onValueChange={(val) =>
                onFilterChange({
                  sort: val as ProductFilterParams["sort"],
                  page: 1,
                })
              }
            >
              <SelectTrigger className="w-[170px] h-10 text-xs font-semibold rounded-xl">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="latest">Nouveautés</SelectItem>
                <SelectItem value="price_asc">Prix croissant</SelectItem>
                <SelectItem value="price_desc">Prix décroissant</SelectItem>
                <SelectItem value="name_asc">Nom (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bouton Filtres Avancés */}
          <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-3.5 gap-2 text-xs font-semibold rounded-xl relative cursor-pointer"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filtres</span>
                {activeFiltersCount > 0 && (
                  <span className="h-4.5 w-4.5 rounded-full bg-brand-gold text-brand-black text-[10px] font-extrabold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85vw] sm:w-[380px] p-6 space-y-6"
            >
              <SheetHeader className="text-left pb-4 border-b">
                <SheetTitle className="text-base font-bold">
                  Filtrer les Produits
                </SheetTitle>
              </SheetHeader>

              {/* Filtre par Catégorie (masqué si page dédiée) */}
              {!isCategoryPage && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Catégorie
                  </label>
                  <Select
                    value={filters.category_slug || "all"}
                    onValueChange={(val) =>
                      onFilterChange({
                        category_slug: val === "all" ? undefined : val,
                        page: 1,
                      })
                    }
                  >
                    <SelectTrigger className="w-full text-xs rounded-xl">
                      <SelectValue placeholder="Toutes les catégories" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.slug}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtre par Prix (Min / Max) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fourchette de Prix (MAD)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min MAD"
                    value={filters.min_price || ""}
                    onChange={(e) =>
                      onFilterChange({
                        min_price: e.target.value ? Number(e.target.value) : undefined,
                        page: 1,
                      })
                    }
                    className="h-9 text-xs rounded-lg"
                  />
                  <Input
                    type="number"
                    placeholder="Max MAD"
                    value={filters.max_price || ""}
                    onChange={(e) =>
                      onFilterChange({
                        max_price: e.target.value ? Number(e.target.value) : undefined,
                        page: 1,
                      })
                    }
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>

              {/* Actions dans le panneau latéral */}
              <div className="pt-6 border-t flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onReset()
                    setSearchInput("")
                    setIsMobileFiltersOpen(false)
                  }}
                  className="w-1/2 text-xs rounded-full cursor-pointer"
                >
                  Réinitialiser
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="w-1/2 text-xs font-bold rounded-full cursor-pointer"
                >
                  Appliquer
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Barre de pilules des catégories (uniquement visible sur le catalogue global, masquée sur la page dédiée) */}
      {!hideCategoryPills && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          <button
            type="button"
            onClick={() => onFilterChange({ category_slug: undefined, page: 1 })}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${!filters.category_slug
              ? "bg-brand-black text-white shadow-xs"
              : "bg-brand-lightGray text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
          >
            Tous les articles
          </button>

          {categories.map((cat) => {
            const isSelected = filters.category_slug === cat.slug
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  onFilterChange({
                    category_slug: isSelected ? undefined : cat.slug,
                    page: 1,
                  })
                }
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${isSelected
                  ? "bg-brand-black text-white shadow-xs"
                  : "bg-brand-lightGray text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
              >
                {cat.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Indicateur de résultats et filtres actifs */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <span className="font-medium">
          {typeof totalCount === "number"
            ? `${totalCount} produit${totalCount > 1 ? "s" : ""}`
            : "Chargement des produits..."}
        </span>

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("")
              onReset()
            }}
            className="text-brand-gold hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Effacer tous les filtres ({activeFiltersCount})</span>
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}
