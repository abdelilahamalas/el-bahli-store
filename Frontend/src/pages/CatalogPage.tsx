import { useState, useEffect } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { ChevronRight, ChevronLeft } from "lucide-react"
import type { Product, ProductFilterParams, PaginationMeta } from "@/types/product"
import type { Category } from "@/types/category"
import productService from "@/services/productService"
import categoryService from "@/services/categoryService"
import AnnouncementBar from "@/components/layout/AnnouncementBar"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import ProductFilters from "@/components/products/ProductFilters"
import ProductGrid from "@/components/products/ProductGrid"
import { Button } from "@/components/ui/button"

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 12,
    total: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Lecture des filtres depuis l'URL
  const filters: ProductFilterParams = {
    page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
    category_slug: searchParams.get("category") || undefined,
    search: searchParams.get("search") || undefined,
    min_price: searchParams.get("min_price") ? Number(searchParams.get("min_price")) : undefined,
    max_price: searchParams.get("max_price") ? Number(searchParams.get("max_price")) : undefined,
    sort: (searchParams.get("sort") as ProductFilterParams["sort"]) || "latest",
  }

  // Chargement des catégories pour les filtres
  useEffect(() => {
    let isMounted = true
    categoryService
      .getCategories()
      .then((data) => {
        if (isMounted) setCategories(data)
      })
      .catch((err) => console.error("Erreur chargement catégories :", err))

    return () => {
      isMounted = false
    }
  }, [])

  // Chargement des produits selon les filtres
  const reloadProducts = () => {
    setIsLoading(true)
    setError(null)
    productService
      .getProducts(filters)
      .then((res) => {
        setProducts(res.products)
        setPagination(res.pagination)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : "Impossible de charger les produits du catalogue."
        setError(msg)
        setIsLoading(false)
      })
  }

  // Chargement des produits selon les paramètres d'URL
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const currentFilters: ProductFilterParams = {
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      category_slug: searchParams.get("category") || undefined,
      search: searchParams.get("search") || undefined,
      min_price: searchParams.get("min_price") ? Number(searchParams.get("min_price")) : undefined,
      max_price: searchParams.get("max_price") ? Number(searchParams.get("max_price")) : undefined,
      sort: (searchParams.get("sort") as ProductFilterParams["sort"]) || "latest",
    }

    productService
      .getProducts(currentFilters, controller.signal)
      .then((res) => {
        if (isMounted) {
          setProducts(res.products)
          setPagination(res.pagination)
          setIsLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (isMounted && !(err && typeof err === "object" && "name" in err && (err as { name: string }).name === "CanceledError")) {
          const msg =
            err instanceof Error
              ? err.message
              : "Impossible de charger les produits du catalogue."
          setError(msg)
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [searchParams])

  // Mise à jour des filtres dans l'URL
  const handleFilterChange = (newFilters: Partial<ProductFilterParams>) => {
    const updated = { ...filters, ...newFilters }
    const params = new URLSearchParams()

    if (updated.page && updated.page > 1) params.set("page", String(updated.page))
    if (updated.category_slug) params.set("category", updated.category_slug)
    if (updated.search) params.set("search", updated.search)
    if (updated.min_price) params.set("min_price", String(updated.min_price))
    if (updated.max_price) params.set("max_price", String(updated.max_price))
    if (updated.sort && updated.sort !== "latest") params.set("sort", updated.sort)

    setSearchParams(params)
  }

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams())
  }

  const handlePageChange = (newPage: number) => {
    handleFilterChange({ page: newPage })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-brand-gold/30">
      <AnnouncementBar />
      <Navbar categories={categories} />

      <main className="flex-1 py-8 sm:py-12">
        <div className="container mx-auto px-4 space-y-8">
          {/* Fil d'Ariane */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-brand-gold transition-colors">
              Accueil
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">Catalogue</span>
          </nav>

          {/* En-tête de la page */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Catalogue El Bahli Store
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Toutes nos collections de vêtements masculins, costumes, pièces décontractées
              et accessoires. Livraison gratuite partout au Maroc.
            </p>
          </div>

          {/* Barre de filtres et recherche */}
          <ProductFilters
            categories={categories}
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            totalCount={pagination.total}
          />

          {/* Grille des produits */}
          <ProductGrid
            products={products}
            isLoading={isLoading}
            error={error}
            onRetry={reloadProducts}
            onResetFilters={handleResetFilters}
            emptyMessage={
              filters.search || filters.category_slug || filters.min_price || filters.max_price
                ? "Aucun produit ne correspond à vos critères de recherche actuels."
                : "Notre catalogue est en cours d'approvisionnement. Les articles seront disponibles très prochainement !"
            }
          />

          {/* Pagination si plusieurs pages */}
          {pagination.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 pt-8 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current_page <= 1}
                onClick={() => handlePageChange(pagination.current_page - 1)}
                className="gap-1 text-xs"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Précédent</span>
              </Button>

              <span className="text-xs text-muted-foreground px-3">
                Page {pagination.current_page} sur {pagination.last_page}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => handlePageChange(pagination.current_page + 1)}
                className="gap-1 text-xs"
              >
                <span>Suivant</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer categories={categories} />
    </div>
  )
}
