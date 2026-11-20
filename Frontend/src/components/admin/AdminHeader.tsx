import { useState } from "react"
import { useLocation, Link, useNavigate } from "react-router-dom"
import {
  Menu,
  ExternalLink,
  ChevronRight,
  LogOut,
  Settings,
  Search,
  Bell,
  CheckCircle2,
  Info,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import AdminSidebar from "./AdminSidebar"

export default function AdminHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Generate breadcrumb path
  const getBreadcrumbs = () => {
    const parts = location.pathname.split("/").filter(Boolean)
    const crumbs = [{ label: "Dashboard", href: "/admin" }]

    if (parts.length > 1) {
      const section = parts[1]
      if (section === "products") {
        crumbs.push({ label: "Produits", href: "/admin/products" })
        if (parts[2] === "new") {
          crumbs.push({ label: "Nouveau produit", href: "/admin/products/new" })
        } else if (parts[3] === "edit") {
          crumbs.push({ label: "Modifier", href: location.pathname })
        }
      } else if (section === "categories") {
        crumbs.push({ label: "Catégories", href: "/admin/categories" })
      } else if (section === "orders") {
        crumbs.push({ label: "Commandes", href: "/admin/orders" })
        if (parts[2]) {
          crumbs.push({ label: `Commande #${parts[2]}`, href: location.pathname })
        }
      } else if (section === "inventory") {
        if (parts[2] === "movements") {
          crumbs.push({ label: "Inventaire", href: "/admin/inventory" })
          crumbs.push({ label: "Mouvements", href: "/admin/inventory/movements" })
        } else {
          crumbs.push({ label: "Inventaire", href: "/admin/inventory" })
        }
      } else if (section === "settings") {
        crumbs.push({ label: "Paramètres", href: "/admin/settings" })
      }
    }

    return crumbs
  }

  const breadcrumbs = getBreadcrumbs()

  const handleLogout = () => {
    logout()
    navigate("/admin/login")
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    // Rechercher sur les commandes ou les produits
    if (location.pathname.includes("/admin/orders")) {
      navigate(`/admin/orders?search=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      navigate(`/admin/products?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="h-16 bg-white border-b border-border/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile Sidebar Trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden text-foreground">
              <Menu className="w-5 h-5" />
              <span className="sr-only">Ouvrir le menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-[#0D0D0D] border-r border-[#1E1E1E]">
            <SheetTitle className="sr-only">Menu d'administration</SheetTitle>
            <AdminSidebar onNavClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Global Search Input (Exact style from reference screenshot) */}
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block w-64 md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9 h-9 text-xs bg-muted/30 border-border/70 rounded-xl focus:bg-white focus:border-[#C9A227] transition-all"
          />
        </form>

        {/* Breadcrumb Navigation on smaller screens */}
        <nav aria-label="Breadcrumb" className="sm:hidden flex items-center text-xs font-medium text-muted-foreground">
          {breadcrumbs.slice(-2).map((crumb, idx) => {
            const isLast = idx === 1 || breadcrumbs.length === 1
            return (
              <div key={crumb.href} className="flex items-center">
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 mx-1 text-muted-foreground/60" />}
                {isLast ? (
                  <span className="text-foreground font-semibold">{crumb.label}</span>
                ) : (
                  <Link to={crumb.href} className="hover:text-foreground">
                    {crumb.label}
                  </Link>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* Right Actions: Notifications & Admin Profile */}
      <div className="flex items-center gap-3">
        {/* Notifications Dropdown (Bell icon with red dot as in reference) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 text-foreground hover:bg-muted rounded-full"
              title="Notifications système"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 border border-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2">
            <DropdownMenuLabel className="text-xs font-bold text-foreground px-2 py-1.5 flex items-center justify-between">
              <span>Notifications</span>
              <span className="text-[10px] text-muted-foreground font-normal">Temps réel</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-1 py-1">
              <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-200/50 flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-900">Connexion réussie</p>
                  <p className="text-[11px] text-emerald-700">Bienvenue sur votre espace admin El Bahli Store.</p>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-200/50 flex items-start gap-2 text-xs">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">Catalogue à jour</p>
                  <p className="text-[11px] text-blue-700">Toutes les variantes et stocks sont synchronisés.</p>
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Pill (Black circle "A" + "Admin ˅" as in reference) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-muted/80 transition-colors cursor-pointer select-none border border-border/50">
              <div className="w-7 h-7 rounded-full bg-[#111111] text-white flex items-center justify-center font-extrabold text-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
              </div>
              <span className="text-xs font-bold text-foreground">
                {user?.name || "Admin"}
              </span>
              <span className="text-[10px] text-muted-foreground">▾</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-bold text-foreground">{user?.name || "Administrateur"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin/settings" className="cursor-pointer text-xs">
                <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/" target="_blank" rel="noopener noreferrer" className="cursor-pointer text-xs">
                <ExternalLink className="w-4 h-4 mr-2 text-muted-foreground" />
                Voir la boutique
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer text-xs"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
