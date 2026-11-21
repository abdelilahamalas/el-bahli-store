import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Boxes,
  FolderTree,
  Settings,
  Plus,
  LogOut,
  ExternalLink,
  History,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import logoImg from "@/images/logo store.jpeg"

interface AdminSidebarProps {
  onNavClick?: () => void
}

export default function AdminSidebar({ onNavClick }: AdminSidebarProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/admin/login")
  }

  // Navigation officielle requise (9 rubriques)
  const navItems = [
    {
      label: "Dashboard",
      to: "/admin",
      icon: LayoutDashboard,
      end: true,
    },
    {
      label: "Produits",
      to: "/admin/products",
      icon: Package,
      end: false,
    },
    {
      label: "Catégories",
      to: "/admin/categories",
      icon: FolderTree,
      end: false,
    },
    {
      label: "Commandes",
      to: "/admin/orders",
      icon: ShoppingBag,
      end: false,
    },
    {
      label: "Inventaire",
      to: "/admin/inventory",
      icon: Boxes,
      end: true,
    },
    {
      label: "Mouvements de stock",
      to: "/admin/inventory/movements",
      icon: History,
      end: true,
    },
    {
      label: "Paramètres",
      to: "/admin/settings",
      icon: Settings,
      end: true,
    },
  ]

  return (
    <aside className="w-64 bg-[#0D0D0D] text-white flex flex-col h-full border-r border-[#1E1E1E] select-none">
      {/* En-tête de marque avec logo officiel circulaire (Exactement comme dans la maquette) */}
      <div className="pt-6 pb-4 px-6 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-full overflow-hidden border border-[#C9A227]/70 bg-black flex items-center justify-center p-0.5 mb-2.5 shadow-sm">
          <img
            src={logoImg}
            alt="Logo officiel El Bahli Store"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
        <span className="font-extrabold text-sm tracking-widest text-[#C9A227] uppercase leading-none">
          EL BAHLI
        </span>
        <span className="font-bold text-xs tracking-wider text-white uppercase mt-0.5">
          STORE
        </span>
      </div>

      {/* Bouton d'action rapide : + Nouveau produit (Bouton Or plein arrondi) */}
      <div className="px-5 pb-4">
        <Button
          onClick={() => {
            navigate("/admin/products/new")
            onNavClick?.()
          }}
          className="w-full bg-[#C9A227] hover:bg-[#B38F1E] text-[#111111] font-bold h-10 text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nouveau produit</span>
        </Button>
      </div>

      {/* Navigation principale avec les 6 rubriques */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${isActive
                  ? "bg-[#C9A227] text-[#111111] shadow-xs"
                  : "text-[#9E9E9E] hover:text-white hover:bg-[#1A1A1A]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-[#111111]" : "text-[#777777]"
                      }`}
                  />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Pied de Sidebar : Liens utiles et déconnexion */}
      <div className="p-4 border-t border-[#1E1E1E] space-y-1">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-[#888888] hover:text-[#C9A227] hover:bg-[#151515] rounded-xl transition-colors"
        >
          <ExternalLink className="w-4 h-4 text-[#666666]" />
          <span>Voir la boutique ↗</span>
        </a>

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full flex items-center justify-start gap-3 px-3.5 py-2 text-xs font-medium text-[#888888] hover:text-rose-400 hover:bg-[#151515] rounded-xl h-auto"
        >
          <LogOut className="w-4 h-4 text-[#666666]" />
          <span>Déconnexion</span>
        </Button>

        {/* Copyright conforme à la maquette */}
        <div className="pt-3 pb-1 text-center text-[10px] text-[#555555]">
          © 2026 El Bahli Store · Tous droits réservés
        </div>
      </div>
    </aside>
  )
}
