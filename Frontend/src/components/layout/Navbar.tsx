import { useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Search, ShoppingBag, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCart } from "@/hooks/useCart"
import type { Category } from "@/types/category"
import { storeLogo, getCategoryImage } from "@/utils/categoryImages"
import SocialLinks from "@/components/common/SocialLinks"
import MobileMenu from "@/components/layout/MobileMenu"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface NavbarProps {
  categories: Category[]
  isLoading?: boolean
}

interface NavGroupConfig {
  label: string
  slugs: string[]
  mainSlug?: string
}

const NAV_GROUPS: NavGroupConfig[] = [
  {
    label: "Capuches",
    slugs: ["capuches", "capuches-zippe"],
    mainSlug: "capuches",
  },
  {
    label: "Hauts",
    slugs: ["sweat-shirt", "polo", "t-shirts", "jackets", "ensembles"],
    mainSlug: "t-shirts",
  },
  {
    label: "Bas",
    slugs: ["jeans", "pantalons-classe", "tenu-montone"],
    mainSlug: "jeans",
  },
  {
    label: "Accessoires",
    slugs: ["casquettes", "chaussures"],
    mainSlug: "casquettes",
  },
]

export default function Navbar({ categories, isLoading }: NavbarProps) {
  const navigate = useNavigate()
  const { totalCount, openCart } = useCart()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Gestion de l'ouverture fluide au survol et au clic pour les groupes de catégories
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = (label: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setOpenDropdown(label)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null)
    }, 200)
  }

  const handleToggle = (label: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setOpenDropdown((prev) => (prev === label ? null : label))
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Catégories correspondantes en temps réel dans le modal de recherche
  const matchingCategories = searchQuery.trim()
    ? categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        cat.slug.toLowerCase().includes(searchQuery.toLowerCase().trim())
    )
    : []

  const handleCategorySelect = (slug: string) => {
    setIsSearchOpen(false)
    setSearchQuery("")
    navigate(`/categories/${slug}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    // Vérifier si la saisie correspond exactement ou étroitement à une catégorie
    const matchedCategory = categories.find(
      (c) =>
        c.name.toLowerCase() === query.toLowerCase() ||
        c.slug.toLowerCase() === query.toLowerCase()
    )

    setIsSearchOpen(false)
    setSearchQuery("")

    if (matchedCategory) {
      navigate(`/categories/${matchedCategory.slug}`)
    } else {
      navigate(`/products?search=${encodeURIComponent(query)}`)
    }
  }

  // Obtenir les catégories correspondant à un groupe
  const getCategoriesForGroup = (groupSlugs: string[]) => {
    return categories.filter((cat) => groupSlugs.includes(cat.slug))
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-md border-b border-border/80 shadow-xs transition-all">
        <div className="container mx-auto px-4">
          <div className="flex h-18 sm:h-20 items-center justify-between">
            {/* 1. GAUCHE : Menu Mobile (Mobile) ou Navigation Catégories (Desktop) */}
            <div className="flex items-center gap-2 lg:w-1/3">
              <div className="lg:hidden">
                <MobileMenu categories={categories} isLoading={isLoading} />
              </div>

              {/* Navigation Desktop inspirée du style épuré demandé */}
              <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-6 w-16 bg-muted rounded animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    {NAV_GROUPS.map((group) => {
                      const groupCategories = getCategoriesForGroup(group.slugs)
                      if (groupCategories.length === 0) return null

                      return (
                        <DropdownMenu
                          key={group.label}
                          open={openDropdown === group.label}
                          onOpenChange={(open) => {
                            if (!open) {
                              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                              setOpenDropdown(null)
                            } else {
                              setOpenDropdown(group.label)
                            }
                          }}
                        >
                          <div
                            className="inline-flex"
                            onMouseEnter={() => handleMouseEnter(group.label)}
                            onMouseLeave={handleMouseLeave}
                          >
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleToggle(group.label)}
                                aria-expanded={openDropdown === group.label}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs xl:text-sm font-medium text-foreground/90 hover:text-brand-gold transition-colors focus:outline-hidden cursor-pointer"
                              >
                                <span>{group.label}</span>
                                <ChevronDown
                                  className={cn(
                                    "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                                    openDropdown === group.label && "rotate-180 text-brand-gold"
                                  )}
                                />
                              </button>
                            </DropdownMenuTrigger>
                          </div>
                          <DropdownMenuContent
                            align="start"
                            sideOffset={4}
                            onMouseEnter={() => handleMouseEnter(group.label)}
                            onMouseLeave={handleMouseLeave}
                            className="w-56 p-2 bg-background border border-border shadow-xl rounded-xl z-50 animate-in fade-in-80"
                          >
                            <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                              Rayon {group.label}
                            </div>
                            {groupCategories.map((cat) => {
                              const img = getCategoryImage(cat.slug, cat.image_url || cat.image)
                              return (
                                <DropdownMenuItem key={cat.id} asChild>
                                  <Link
                                    to={`/categories/${cat.slug}`}
                                    onClick={() => {
                                      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                                      setOpenDropdown(null)
                                    }}
                                    className="flex items-center gap-2.5 p-2 text-xs font-medium cursor-pointer rounded-lg hover:bg-muted focus:bg-muted"
                                  >
                                    {img && (
                                      <img
                                        src={img}
                                        alt={cat.name}
                                        className="h-7 w-7 rounded-md object-cover border border-border/60 shrink-0"
                                      />
                                    )}
                                    <span className="text-foreground font-medium">
                                      {cat.name}
                                    </span>
                                  </Link>
                                </DropdownMenuItem>
                              )
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )
                    })}

                    <Link
                      to="/products"
                      className="px-2.5 py-1.5 text-xs xl:text-sm font-medium text-foreground/90 hover:text-brand-gold transition-colors cursor-pointer"
                    >
                      Tout voir
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {/* 2. CENTRE : Logo Officiel Circulaire + Nom Officiel El Bahli Store */}
            <div className="flex items-center justify-center lg:w-1/3">
              <Link
                to="/"
                className="flex items-center gap-2.5 sm:gap-3 group focus:outline-hidden"
              >
                <img
                  src={storeLogo}
                  alt="El Bahli Store Logo"
                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-contain bg-white p-0.5 border border-border shadow-xs group-hover:border-brand-gold transition-all duration-300"
                />
                <div className="flex flex-col text-left">
                  <span className="font-extrabold text-base sm:text-xl tracking-tight text-foreground leading-none">
                    El Bahli <span className="text-brand-gold">Store</span>
                  </span>
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-0.5">
                    Maroc
                  </span>
                </div>
              </Link>
            </div>

            {/* 3. DROITE : Réseaux Sociaux + Recherche & Panier */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-3 lg:w-1/3">
              {/* Icônes Réseaux Sociaux officiels (Desktop) */}
              <div className="hidden lg:flex items-center border-r border-border/80 pr-3 mr-1">
                <SocialLinks iconClassName="h-4 w-4" />
              </div>

              {/* Bouton Recherche */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Rechercher un produit ou une catégorie"
                className="p-2 sm:p-2.5 text-foreground/80 hover:text-brand-gold hover:bg-muted/60 rounded-full transition-colors cursor-pointer"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Bouton Panier avec compteur badge circulaire or très visible */}
              <button
                type="button"
                onClick={openCart}
                aria-label={`Accéder au panier (${totalCount} articles)`}
                className="relative p-2 sm:p-2.5 text-foreground/85 hover:text-brand-gold hover:bg-muted/60 rounded-full transition-colors cursor-pointer flex items-center justify-center"
              >
                <ShoppingBag className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
                {totalCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-[#C9A227] text-[#111111] text-[11px] font-black shadow-sm border-2 border-background select-none pointer-events-none animate-in zoom-in-75 duration-200">
                    {totalCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modal de recherche intelligente avec support direct des catégories */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recherche dans la boutique</DialogTitle>
            <DialogDescription>
              Trouvez rapidement une catégorie ou un modèle de vêtement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSearchSubmit} className="py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Rechercher un produit..."
                className="pl-9 pr-4 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Résultats de catégories en direct selon la frappe */}
            {matchingCategories.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Catégories correspondantes ({matchingCategories.length}) :
                </span>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {matchingCategories.map((cat) => {
                    const img = getCategoryImage(cat.slug)
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategorySelect(cat.slug)}
                        className="flex items-center gap-2.5 p-2 rounded-xl border border-border/80 hover:border-brand-gold bg-muted/30 hover:bg-muted transition-all text-left group cursor-pointer"
                      >
                        {img && (
                          <img
                            src={img}
                            alt={cat.name}
                            className="h-8 w-8 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <span className="text-xs font-semibold group-hover:text-brand-gold truncate">
                          {cat.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Suggestions rapides si aucun terme n'est encore saisi */}
            {!searchQuery.trim() && categories.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Accès direct par catégorie :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {categories.slice(0, 6).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.slug)}
                      className="px-3 py-1 text-xs font-semibold rounded-full bg-muted hover:bg-brand-black hover:text-white transition-all cursor-pointer"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSearchOpen(false)}
                className="rounded-full"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="gold"
                size="sm"
                className="font-semibold rounded-full"
              >
                Rechercher
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
