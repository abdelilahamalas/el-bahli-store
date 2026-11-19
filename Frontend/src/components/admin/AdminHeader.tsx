import { useState } from "react"
import { useLocation, Link, useNavigate } from "react-router-dom"
import { Menu, ExternalLink, ChevronRight, LogOut, Settings } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
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
          <SheetContent side="left" className="p-0 w-64 bg-[#0D0D0D] border-r border-[#222222]">
            <SheetTitle className="sr-only">Menu d'administration</SheetTitle>
            <AdminSidebar onNavClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center text-xs font-medium text-muted-foreground">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            return (
              <div key={crumb.href} className="flex items-center">
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-muted-foreground/60" />}
                {isLast ? (
                  <span className="text-foreground font-semibold">{crumb.label}</span>
                ) : (
                  <Link to={crumb.href} className="hover:text-foreground transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Store Public Link */}
        <Button
          variant="outline"
          size="sm"
          asChild
          className="hidden sm:inline-flex h-8 text-xs font-medium gap-1.5 border-border hover:border-[#C9A227] hover:text-[#C9A227]"
        >
          <a href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5" />
            Voir la boutique
          </a>
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 h-9 rounded-full hover:bg-muted"
            >
              <div className="w-7 h-7 rounded-full bg-[#111111] text-[#C9A227] flex items-center justify-center font-bold text-xs border border-[#C9A227]/40 shadow-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
              </div>
              <span className="text-xs font-semibold hidden md:inline text-foreground">
                {user?.name || "Admin"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-foreground">{user?.name || "Admin"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin/settings" className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
                Paramètres de la boutique
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/" target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                <ExternalLink className="w-4 h-4 mr-2 text-muted-foreground" />
                Accéder au site public
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
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
