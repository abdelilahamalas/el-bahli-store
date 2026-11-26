import React, { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Store, Search, Menu, X, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import AdminSidebar from "./AdminSidebar"
import { useAuth } from "@/hooks/useAuth"

export default function AdminHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const lastClosedAtRef = React.useRef<number>(0)
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = async () => {
    handleClose()
    await logout()
    navigate("/zakaria/admin/login")
  }

  const handleClose = () => {
    lastClosedAtRef.current = Date.now()
    setMobileOpen(false)
  }

  const handleToggle = () => {
    if (Date.now() - lastClosedAtRef.current < 450) {
      return
    }
    setMobileOpen((prev) => !prev)
  }

  // Fermeture automatique lors d'un changement de route admin
  React.useEffect(() => {
    handleClose()
  }, [location.pathname])

  // Détermination du nom de la page active
  const getPageTitle = () => {
    const path = location.pathname
    if (path === "/zakaria/admin") return "Tableau de bord"
    if (path.startsWith("/zakaria/admin/products/new")) return "Ajouter un produit"
    if (path.startsWith("/zakaria/admin/products/") && path.includes("/edit")) return "Modifier le produit"
    if (path.startsWith("/zakaria/admin/products")) return "Produits"
    if (path.startsWith("/zakaria/admin/categories")) return "Catégories"
    if (path.startsWith("/zakaria/admin/orders/")) return "Détail de la commande"
    if (path.startsWith("/zakaria/admin/orders")) return "Commandes"
    return "Administration"
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    if (location.pathname.startsWith("/zakaria/admin/orders")) {
      navigate(`/zakaria/admin/orders?search=${encodeURIComponent(query)}`)
    } else if (location.pathname.startsWith("/zakaria/admin/categories")) {
      navigate(`/zakaria/admin/categories?search=${encodeURIComponent(query)}`)
    } else {
      navigate(`/zakaria/admin/products?search=${encodeURIComponent(query)}`)
    }
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* 1. Gauche : Bouton menu mobile + Icône Store + Nom de la page */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Bouton hamburger contrôlé (sans SheetTrigger pour éliminer tout conflit d'état) */}
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          className="lg:hidden text-slate-700 h-9 w-9 shrink-0 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span className="sr-only">Ouvrir le menu</span>
        </Button>

        {/* Menu mobile et tablette */}
        <Sheet open={mobileOpen} onOpenChange={(next) => { if (!next) { handleClose() } else { setMobileOpen(true) } }}>
          <SheetContent
            side="left"
            className="p-0 w-60 bg-[#111111] border-r border-[#222222]"
          >
            <SheetTitle className="sr-only">Menu d'administration</SheetTitle>
            <AdminSidebar onNavClick={handleClose} />
          </SheetContent>
        </Sheet>

        {/* Icône Store et titre de page */}
        <div className="flex items-center gap-2 text-slate-900">
          <Store className="w-4 h-4 text-slate-500 shrink-0" />
          <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* 2. Droite : Champ de recherche et bouton de Déconnexion rapide */}
      <div className="ml-auto flex items-center justify-end gap-2 pl-3">
        <form onSubmit={handleSearchSubmit} className="relative w-36 sm:w-64 md:w-72">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="h-8.5 w-full bg-slate-50/80 hover:bg-white focus:bg-white border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 pl-3 pr-14 rounded-lg focus-visible:ring-1 focus-visible:ring-slate-300 focus-visible:border-slate-300 transition-colors"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 rounded transition-colors"
                aria-label="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 rounded transition-colors"
              aria-label="Lancer la recherche"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="Se déconnecter"
          aria-label="Se déconnecter"
          className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 h-8.5 w-8.5 rounded-lg shrink-0 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span className="sr-only">Déconnexion</span>
        </Button>
      </div>
    </header>
  )
}
