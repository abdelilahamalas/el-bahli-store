import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutGrid,
  Package,
  Layers,
  ShoppingBag,
  Boxes,
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
    onNavClick?.()
    await logout()
    navigate("/zakaria/admin/login")
  }

  // Exactement les 4 pages + Déconnexion 
  const navItems = [
    {
      label: "Dashboard",
      to: "/zakaria/admin",
      icon: LayoutGrid,
      end: true,
    },
    {
      label: "Produits",
      to: "/zakaria/admin/products",
      icon: Package,
      end: false,
    },
    {
      label: "Catégories",
      to: "/zakaria/admin/categories",
      icon: Layers,
      end: false,
    },
    {
      label: "Commandes",
      to: "/zakaria/admin/orders",
      icon: ShoppingBag,
      end: false,
    },
    {
      label: "Gestion de stock",
      to: "/zakaria/admin/stock",
      icon: Boxes,
      end: false,
    },
  ]

  return (
    <aside className="w-60 bg-[#111111] text-white flex flex-col h-full max-h-screen select-none border-r border-[#222222] overflow-hidden shrink-0">
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

      {/* 2. Navigation principale : Liens essentiels + Bouton Déconnexion regroupé */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavClick}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]/60 ${isActive
                  ? "bg-white/[0.12] text-white border-l-3 border-[#C9A227] shadow-xs pl-3"
                  : "text-slate-300 hover:text-white hover:bg-white/[0.06] border-l-3 border-transparent"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? "text-[#C9A227]" : "text-slate-400 group-hover:text-slate-200"
                      }`}
                  />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}

        {/* Ligne de séparation élégante */}
        <div className="pt-2 pb-1">
          <div className="border-t border-white/5" />
        </div>

        {/* Bouton Déconnexion parfaitement harmonisé avec les autres boutons */}
        <button
          type="button"
          onClick={handleLogout}
          className="group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-rose-400 hover:bg-white/[0.06] border-l-3 border-transparent transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 cursor-pointer text-left"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 text-slate-400 group-hover:text-rose-400 transition-colors" />
          <span className="truncate">Déconnexion</span>
        </button>
      </nav>

      {/* 3. Pied de Sidebar : Copyright épuré */}
      <div className="p-3 border-t border-white/5 shrink-0 bg-[#0d0d0d]">
        <p className="text-[10px] text-slate-500 text-center font-normal">
          © 2026 El Bahli Store
        </p>
      </div>
    </aside>
  )
}
