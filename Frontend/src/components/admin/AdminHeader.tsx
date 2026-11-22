import React, { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Store, Search, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import AdminSidebar from "./AdminSidebar"

export default function AdminHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const location = useLocation()
  const navigate = useNavigate()

  // Détermination du nom de la page active
  const getPageTitle = () => {
    const path = location.pathname
    if (path === "/admin") return "Tableau de bord"
    if (path.startsWith("/admin/products/new")) return "Ajouter un produit"
    if (path.startsWith("/admin/products/") && path.includes("/edit")) return "Modifier le produit"
    if (path.startsWith("/admin/products")) return "Produits"
    if (path.startsWith("/admin/categories")) return "Catégories"
    if (path.startsWith("/admin/orders/")) return "Détail de la commande"
    if (path.startsWith("/admin/orders")) return "Commandes"
    return "Administration"
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    if (location.pathname.startsWith("/admin/orders")) {
      navigate(`/admin/orders?search=${encodeURIComponent(query)}`)
    } else if (location.pathname.startsWith("/admin/categories")) {
      navigate(`/admin/categories?search=${encodeURIComponent(query)}`)
    } else {
      navigate(`/admin/products?search=${encodeURIComponent(query)}`)
    }
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* 1. Gauche : Bouton menu mobile + Icône Store + Nom de la page */}
      <div className="flex items-center gap-3">
        {/* Menu mobile */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden text-slate-700 h-9 w-9 shrink-0">
              <Menu className="w-5 h-5" />
              <span className="sr-only">Ouvrir le menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-60 bg-[#111111] border-r border-[#222222]">
            <SheetTitle className="sr-only">Menu d'administration</SheetTitle>
            <AdminSidebar onNavClick={() => setMobileOpen(false)} />
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

      {/* 2. Droite : Champ de recherche avec icône Search placée à DROITE */}
      <form onSubmit={handleSearchSubmit} className="relative w-48 sm:w-64">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher..."
          className="w-full h-8.5 pl-3 pr-9 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
        />
        <button
          type="submit"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
          aria-label="Lancer la recherche"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      </form>
    </header>
  )
}
