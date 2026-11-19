import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Search, ShoppingBag, ChevronDown } from "lucide-react"
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

export default function Navbar({ categories, isLoading }: NavbarProps) {
  const navigate = useNavigate()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setIsSearchOpen(false)
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  // On affiche les 6 premières en raccourci direct et le reste sous le menu déroulant
  const mainCategories = categories.slice(0, 6)
  const extraCategories = categories.slice(6)

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-background/98 backdrop-blur-md border-b shadow-xs transition-all">
        <div className="container mx-auto px-4">
          {/* Ligne principale du Header */}
          <div className="flex h-20 items-center justify-between gap-4">
            {/* Partie Gauche : Mobile menu + Logo officiel + Réseaux sociaux */}
            <div className="flex items-center gap-4">
              <MobileMenu categories={categories} isLoading={isLoading} />

              <Link
                to="/"
                className="flex items-center gap-3 group focus:outline-hidden"
              >
                <img
                  src={storeLogo}
                  alt="El Bahli Store Logo"
                  className="h-12 w-12 rounded-lg object-contain bg-white p-0.5 border border-border shadow-xs group-hover:border-brand-gold transition-colors"
                />
                <div className="flex flex-col">
                  <span className="font-extrabold text-lg sm:text-xl tracking-tight text-foreground leading-tight">
                    EL BAHLI <span className="text-brand-gold">STORE</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    Maroc
                  </span>
                </div>
              </Link>

              {/* Réseaux sociaux officiels (Desktop) */}
              <div className="hidden lg:flex items-center border-l pl-4 ml-2">
                <SocialLinks iconClassName="h-4 w-4" />
              </div>
            </div>

            {/* Partie Centrale (Desktop) : Navigation Catégories Dynamiques */}
            <nav className="hidden xl:flex items-center gap-1">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-7 w-20 bg-muted rounded-md animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <>
                  <Link
                    to="/products"
                    className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground hover:text-brand-gold hover:bg-brand-lightGray rounded-md transition-colors"
                  >
                    Catalogue
                  </Link>

                  {mainCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/categories/${cat.slug}`}
                      className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-brand-gold hover:bg-brand-lightGray rounded-md transition-colors"
                    >
                      {cat.name}
                    </Link>
                  ))}

                  {extraCategories.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-brand-gold gap-1"
                        >
                          <span>Plus</span>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56 p-2 bg-background border shadow-lg"
                      >
                        {extraCategories.map((cat) => {
                          const img = getCategoryImage(cat.slug)
                          return (
                            <DropdownMenuItem key={cat.id} asChild>
                              <Link
                                to={`/categories/${cat.slug}`}
                                className="flex items-center gap-2.5 p-2 text-xs font-medium cursor-pointer rounded-md hover:bg-muted"
                              >
                                {img && (
                                  <img
                                    src={img}
                                    alt={cat.name}
                                    className="h-6 w-6 rounded-sm object-cover border"
                                  />
                                )}
                                <span>{cat.name}</span>
                              </Link>
                            </DropdownMenuItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              )}
            </nav>

            {/* Partie Droite : Recherche & Panier */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Recherche */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Rechercher un produit ou une catégorie"
                className="h-10 w-10 text-muted-foreground hover:text-foreground"
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Panier (préparé avec compteur dynamique) */}
              <Button
                variant="outline"
                size="sm"
                className="relative h-10 px-3.5 border-border hover:border-brand-gold flex items-center gap-2"
                aria-label="Accéder au panier"
              >
                <ShoppingBag className="h-4 w-4 text-brand-gold" />
                <span className="hidden sm:inline-block text-xs font-semibold">
                  Panier
                </span>
                <span className="inline-flex items-center justify-center bg-brand-black text-white text-[11px] font-bold h-5 w-5 rounded-full">
                  0
                </span>
              </Button>
            </div>
          </div>

          {/* Sous-barre de défilement horizontal des catégories pour tablettes et laptops */}
          <div className="flex xl:hidden overflow-x-auto py-2.5 gap-2 border-t no-scrollbar scroll-smooth">
            {isLoading ? (
              <div className="flex gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-7 w-24 bg-muted rounded-full shrink-0 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <>
                <Link
                  to="/products"
                  className="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-brand-black text-white"
                >
                  Tous les articles
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/categories/${cat.slug}`}
                    className="shrink-0 px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider bg-brand-lightGray text-foreground hover:bg-brand-black hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Modal de recherche propre */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recherche dans la boutique</DialogTitle>
            <DialogDescription>
              Trouvez facilement vos vêtements, costumes, vestes ou accessoires.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSearchSubmit} className="py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ex : Capuche, Polo, Veste, Chaussures..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSearchOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" variant="gold" size="sm" className="font-semibold">
                Rechercher
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
