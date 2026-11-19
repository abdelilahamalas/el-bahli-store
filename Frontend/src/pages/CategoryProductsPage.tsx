import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { ChevronRight, ArrowLeft, Truck, Banknote, Phone } from "lucide-react"
import type { Product, PaginationMeta, ProductFilterParams } from "@/types/product"
import type { Category } from "@/types/category"
import productService from "@/services/productService"
import categoryService from "@/services/categoryService"
import { getCategoryImage } from "@/utils/categoryImages"
import { siteConfig } from "@/config/site"
import AnnouncementBar from "@/components/layout/AnnouncementBar"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import ProductGrid from "@/components/products/ProductGrid"
import ProductFilters from "@/components/products/ProductFilters"
import { Button } from "@/components/ui/button"

export default function CategoryProductsPage() {
  const { slug } = useParams<{ slug: string }>()

  const [categories, setCategories] = useState<Category[]>([])
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 12,
    total: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<ProductFilterParams>({
    page: 1,
    sort: "latest",
  })

  // Chargement des catégories
  useEffect(() => {
    let isMounted = true
    categoryService
      .getCategories()
      .then((data) => {
        if (isMounted) {
          setCategories(data)
          if (slug) {
            const found = data.find((c) => c.slug.toLowerCase() === slug.toLowerCase())
            if (found) setCurrentCategory(found)
          }
        }
      })
      .catch((err) => console.error("Erreur chargement catégories :", err))

    return () => {
      isMounted = false
    }
  }, [slug])

  // Chargement des produits pour cette catégorie
  const reloadCategoryProducts = () => {
    if (!slug) return

    setIsLoading(true)
    setError(null)

    productService
      .getProducts({
        ...filters,
        category_slug: slug,
      })
      .then((res) => {
        setProducts(res.products)
        setPagination(res.pagination)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : "Impossible de charger les produits de cette catégorie."
        setError(msg)
        setIsLoading(false)
      })
  }

  useEffect(() => {
    if (!slug) return
    let isMounted = true

    productService
      .getProducts({
        ...filters,
        category_slug: slug,
      })
      .then((res) => {
        if (isMounted) {
          setProducts(res.products)
          setPagination(res.pagination)
          setIsLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg =
            err instanceof Error
              ? err.message
              : "Impossible de charger les produits de cette catégorie."
          setError(msg)
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [slug, filters])

  const categoryImage = slug ? getCategoryImage(slug) : null

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-brand-gold/30">
      <AnnouncementBar />
      <Navbar categories={categories} />

      <main className="flex-1 pb-16">
        {/* Bannière de la catégorie avec image réelle */}
        <div className="relative bg-brand-black text-white py-12 sm:py-16 overflow-hidden border-b border-border/10">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#C9A227_1px,transparent_1px)] [background-size:20px_20px]" />

          <div className="container relative mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-3 text-center md:text-left max-w-xl">
                {/* Fil d'Ariane */}
                <nav className="flex items-center justify-center md:justify-start gap-2 text-xs text-brand-gray mb-2">
                  <Link to="/" className="hover:text-brand-gold transition-colors">
                    Accueil
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <Link to="/products" className="hover:text-brand-gold transition-colors">
                    Catalogue
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-brand-gold font-medium">
                    {currentCategory?.name || slug}
                  </span>
                </nav>

                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                  Collection <span className="text-brand-gold">{currentCategory?.name || slug}</span>
                </h1>
                <p className="text-xs sm:text-sm text-brand-gray leading-relaxed">
                  {currentCategory?.description ||
                    `Découvrez l'ensemble de nos modèles ${currentCategory?.name || slug}. Finitions soignées et confort garanti.`}
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-brand-gold">
                  <span className="inline-flex items-center gap-1.5">
                    <Truck className="h-4 w-4" /> Livraison gratuite
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Banknote className="h-4 w-4" /> Paiement à la réception
                  </span>
                </div>
              </div>

              {/* Photo officielle de la catégorie */}
              {categoryImage && (
                <div className="shrink-0">
                  <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-2xl overflow-hidden border-2 border-brand-gold/40 shadow-xl bg-card">
                    <img
                      src={categoryImage}
                      alt={currentCategory?.name || "Catégorie"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section Grille des Produits & Filtres */}
        <div className="container mx-auto px-4 pt-10 space-y-8">
          <ProductFilters
            categories={categories}
            filters={{ ...filters, category_slug: slug }}
            onFilterChange={(newF) => setFilters((prev) => ({ ...prev, ...newF }))}
            onReset={() => setFilters({ page: 1, sort: "latest" })}
            totalCount={pagination.total}
          />

          <ProductGrid
            products={products}
            isLoading={isLoading}
            error={error}
            onRetry={reloadCategoryProducts}
            emptyMessage={`Aucun article disponible pour le moment dans la collection ${
              currentCategory?.name || slug
            }. Les nouveaux arrivages arrivent très bientôt !`}
          />

          <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link to="/products">
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Voir toutes les autres catégories</span>
              </Button>
            </Link>

            <a
              href={`${siteConfig.whatsappUrl}?text=${encodeURIComponent(
                `Bonjour El Bahli Store, je souhaite des informations sur la catégorie ${
                  currentCategory?.name || slug
                }.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold text-brand-black hover:text-brand-gold transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-brand-gold" />
              <span>Demander des arrivages sur WhatsApp</span>
            </a>
          </div>
        </div>
      </main>

      <Footer categories={categories} />
    </div>
  )
}
