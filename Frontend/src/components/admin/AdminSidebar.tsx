import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutGrid,
  Package,
  Layers,
  ShoppingBag,
  LogOut,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import logoImg from "@/images/logo store.jpeg"

interface AdminSidebarProps {
  onNavClick?: () => void
}

export default function AdminSidebar({ onNavClick }: AdminSidebarProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate("/zakaria/admin/login")
  }

  // Exactement les 4 pages + Déconnexion 
  const navItems = [
    {
      label: "Dashboard",
      to: "/admin",
      icon: LayoutGrid,
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
      icon: Layers,
      end: false,
    },
    {
      label: "Commandes",
      to: "/admin/orders",
      icon: ShoppingBag,
      end: false,
    },
  ]

  return (
    <aside className="w-60 bg-[#111111] text-white flex flex-col h-screen max-h-screen select-none border-r border-[#222222] overflow-hidden shrink-0">
      {/* 1. Logo officiel El Bahli Store */}
      <div className="pt-6 pb-6 px-4 flex items-center gap-3 shrink-0 border-b border-white/5">
        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 shrink-0 bg-black">
          <img
            src={logoImg}
            alt="Logo officiel El Bahli Store"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-extrabold text-xs tracking-wider text-white uppercase leading-tight truncate">
            EL BAHLI STORE
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Administration
          </span>
        </div>
      </div>

      {/* 2. Navigation principale : 4 liens essentiels */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-hidden">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${isActive
                  ? "bg-white/10 text-white border-l-2 border-[#C9A227]"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-[#C9A227]" : "text-slate-400"
                      }`}
                  />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* 3. Pied de Sidebar : Déconnexion uniquement */}
      <div className="p-3 border-t border-white/5 shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-start gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          <span>Déconnexion</span>
        </button>

        <p className="text-[10px] text-slate-500 pt-2 text-center font-normal">
          © 2026 El Bahli Store
        </p>
      </div>
    </aside>
  )
}
