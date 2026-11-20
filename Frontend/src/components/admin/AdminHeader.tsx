import { useState } from "react"
import { useLocation, Link, useNavigate } from "react-router-dom"
import {
  Menu,
  ExternalLink,
  ChevronRight,
  LogOut,
  Settings,
  Search,
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
    if (location.pathname.includes("/admin/orders")) {
      navigate(`/admin/orders?search=${encodeURIComponent(searchQuery.trim())}`)
    } else if (location.pathname.includes("/admin/categories")) {
      // stay on categories or filter
    } else {
      navigate(`/admin/products?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="h-16 bg-white border-b border-border/70 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
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

        {/* Global Functional Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block w-72 md:w-88">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un produit, commande ou catégorie..."
            className="pl-9.5 h-9 text-xs bg-muted/20 border-border/70 rounded-xl focus:bg-white focus:border-[#C9A227] transition-all"
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

      {/* Right Actions: Admin Profile Pill ONLY (Notifications Bell completely removed per instructions) */}
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-muted/80 transition-colors cursor-pointer select-none border border-border/60 bg-white shadow-2xs">
              <div className="w-7 h-7 rounded-full bg-[#111111] text-white flex items-center justify-center font-extrabold text-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
              </div>
              <span className="text-xs font-bold text-foreground">
                {user?.name || "Admin"}
              </span>
              <span className="text-[10px] text-muted-foreground">▾</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1">
            <DropdownMenuLabel className="font-normal px-2 py-1.5">
              <div className="flex flex-col space-y-0.5">
                <p className="text-xs font-bold text-foreground">{user?.name || "Administrateur"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email || "admin@elbahli.ma"}</p>
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
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
