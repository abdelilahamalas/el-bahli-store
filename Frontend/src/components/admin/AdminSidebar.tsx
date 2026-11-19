import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Boxes,
  History,
  Settings,
  Plus,
  LogOut,
  ExternalLink,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import logoImg from "@/images/logo store.jpeg"

interface AdminSidebarProps {
  onNavClick?: () => void
}

export default function AdminSidebar({ onNavClick }: AdminSidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/admin/login")
  }

  const navItems = [
    {
      group: "VUE D'ENSEMBLE",
      items: [
        {
          label: "Dashboard",
          to: "/admin",
          icon: LayoutDashboard,
          end: true,
        },
      ],
    },
    {
      group: "CATALOGUE",
      items: [
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
      ],
    },
    {
      group: "COMMANDES",
      items: [
        {
          label: "Commandes",
          to: "/admin/orders",
          icon: ShoppingBag,
          end: false,
        },
      ],
    },
    {
      group: "GESTION DU STOCK",
      items: [
        {
          label: "Inventaire",
          to: "/admin/inventory",
          icon: Boxes,
          end: true,
        },
        {
          label: "Mouvements",
          to: "/admin/inventory/movements",
          icon: History,
          end: true,
        },
      ],
    },
    {
      group: "PARAMÈTRES",
      items: [
        {
          label: "Boutique",
          to: "/admin/settings",
          icon: Settings,
          end: true,
        },
      ],
    },
  ]

  return (
    <aside className="w-64 bg-[#0D0D0D] text-white flex flex-col h-full border-r border-[#222222] select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#222222] flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden border border-[#C9A227]/40 flex-shrink-0 bg-black">
          <img src={logoImg} alt="El Bahli Store" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-sm tracking-wide text-white truncate">
            EL BAHLI <span className="text-[#C9A227]">STORE</span>
          </span>
          <span className="text-[11px] text-[#888888] font-medium tracking-wider uppercase">
            Back-office
          </span>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="px-4 pt-4 pb-2">
        <Button
          onClick={() => {
            navigate("/admin/products/new")
            onNavClick?.()
          }}
          className="w-full bg-[#1A1A1A] hover:bg-[#252525] text-white border border-[#333333] hover:border-[#C9A227]/60 justify-start gap-2 h-9 text-xs font-semibold shadow-sm transition-all"
        >
          <div className="w-5 h-5 rounded bg-[#C9A227] text-black flex items-center justify-center font-bold">
            <Plus className="w-3.5 h-3.5" />
          </div>
          Nouveau produit
        </Button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {navItems.map((group) => (
          <div key={group.group} className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-[#666666] tracking-wider uppercase">
              {group.group}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-[#C9A227] text-black font-semibold shadow-sm"
                        : "text-[#B0B0B0] hover:text-white hover:bg-[#1A1A1A]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? "text-black" : "text-[#888888]"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User Info & Footer Actions */}
      <div className="p-3 border-t border-[#222222] bg-[#0A0A0A] space-y-2">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3 py-2 text-xs text-[#888888] hover:text-[#C9A227] hover:bg-[#151515] rounded-md transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />
            Voir la boutique
          </span>
          <span className="text-[10px] text-[#555555]">↗</span>
        </a>

        <div className="flex items-center justify-between p-2 rounded-lg bg-[#141414] border border-[#222222]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#222222] border border-[#333333] flex items-center justify-center font-bold text-xs text-[#C9A227] flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">
                {user?.name || "Administrateur"}
              </span>
              <span className="text-[10px] text-[#777777] truncate">
                {user?.email || "admin@elbahli.store"}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Se déconnecter"
            className="p-1.5 text-[#777777] hover:text-red-400 hover:bg-[#1E1E1E] rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
