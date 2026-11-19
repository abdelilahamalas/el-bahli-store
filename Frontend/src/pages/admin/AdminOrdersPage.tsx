import { useEffect, useState, useTransition } from "react"
import { Link } from "react-router-dom"
import {
  Search,
  ShoppingBag,
  Calendar,
  Phone,
  MapPin,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminOrder } from "@/types/admin"
import type { PaginationMeta } from "@/types/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getOrderStatusBadge } from "@/utils/orderStatus"

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)

  const [, startTransition] = useTransition()

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params: Record<string, string | number> = {
        page: currentPage,
        per_page: 15,
      }
      if (search.trim()) params.search = search.trim()
      if (selectedStatus !== "all") params.status = selectedStatus

      const res = await adminService.getOrders(params)
      setOrders(res.orders)
      setPagination(res.pagination)
    } catch {
      toast.error("Erreur lors de la récupération des commandes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [currentPage, selectedStatus])

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchOrders()
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  const formatMAD = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount
    return `${num.toLocaleString("fr-FR", { minimumFractionDigits: 0 })} MAD`
  }

  const renderDeliveryIndicator = (order: AdminOrder) => {
    switch (order.status) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            Livrée à domicile
          </span>
        )
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-purple-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0" />
            En acheminement
          </span>
        )
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-indigo-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            Préparation colis
          </span>
        )
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-blue-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            Prête à expédier
          </span>
        )
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            À confirmer
          </span>
        )
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
            Annulée (Non livrée)
          </span>
        )
      default:
        return (
          <span className="text-xs text-muted-foreground">
            Livraison standard
          </span>
        )
    }
  }

  const statusTabs = [
    { id: "all", label: "Toutes les commandes" },
    { id: "pending", label: "En attente" },
    { id: "confirmed", label: "Confirmées" },
    { id: "processing", label: "En préparation" },
    { id: "shipped", label: "Expédiées" },
    { id: "delivered", label: "Livrées" },
    { id: "cancelled", label: "Annulées" },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Commandes</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Suivi des ventes, confirmations téléphoniques et expéditions en paiement à la livraison (COD).
          </p>
        </div>
      </div>

      {/* Status Pills / Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium border-b border-border">
        {statusTabs.map((tab) => {
          const isActive = selectedStatus === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                startTransition(() => {
                  setSelectedStatus(tab.id)
                  setCurrentPage(1)
                })
              }}
              className={`px-3 py-2 rounded-t-md whitespace-nowrap transition-all border-b-2 font-medium ${
                isActive
                  ? "border-[#C9A227] text-foreground font-semibold bg-white shadow-2xs"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-border shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par référence, nom client, numéro de téléphone..."
            className="pl-9 h-9 text-xs bg-muted/20 border-border"
          />
        </div>
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch("")}
            className="text-xs text-muted-foreground hover:text-foreground h-8"
          >
            Effacer
          </Button>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Commande</th>
                <th className="py-3 px-4">Client & Téléphone</th>
                <th className="py-3 px-4">Ville</th>
                <th className="py-3 px-4">Livraison (Maroc)</th>
                <th className="py-3 px-4">Total à payer</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-20" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-4 w-28 mb-1" /><Skeleton className="h-3 w-24" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-4 w-28" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-5 w-24 rounded" /></td>
                    <td className="py-4 px-4 text-right"><Skeleton className="h-8 w-24 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : orders.length > 0 ? (
                orders.map((order) => {
                  const dateStr = new Date(order.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })

                  const displayCity = order.city || order.customer_city || "Ville non précisée"

                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      {/* Reference & Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="font-mono font-bold text-foreground hover:text-[#C9A227] transition-colors"
                          >
                            {order.reference}
                          </Link>
                          <span className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {dateStr}
                          </span>
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {order.customer_name}
                          </span>
                          <span className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {order.customer_phone}
                          </span>
                        </div>
                      </td>

                      {/* City */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 text-[#C9A227] shrink-0" />
                          <span className="font-medium text-foreground">{displayCity}</span>
                        </div>
                      </td>

                      {/* Delivery Status Indicator */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderDeliveryIndicator(order)}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{formatMAD(order.total)}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {order.payment_status === "paid" ? (
                              <span className="text-emerald-600 font-semibold">Encaissé</span>
                            ) : (
                              <span>Paiement à la livraison</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getOrderStatusBadge(order.status, order.status_label)}
                      </td>

                      {/* Explicit Action Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-8 px-3 text-xs font-semibold border-border hover:border-[#C9A227] hover:text-[#C9A227] gap-1 shadow-2xs"
                        >
                          <Link to={`/admin/orders/${order.id}`}>
                            <span>Gérer</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <ShoppingBag className="w-9 h-9 text-muted-foreground/40 mb-2" />
                      <p className="font-semibold text-sm text-foreground">Aucune commande trouvée</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {search || selectedStatus !== "all"
                          ? "Aucune commande ne correspond aux filtres sélectionnés."
                          : "Vous n'avez pas encore reçu de commande."}
                      </p>
                      {(search || selectedStatus !== "all") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearch("")
                            setSelectedStatus("all")
                          }}
                          className="mt-3 text-xs"
                        >
                          Réinitialiser les filtres
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination && pagination.last_page > 1 && (
          <div className="py-3 px-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Affichage de {pagination.from || 1} à {pagination.to || orders.length} sur{" "}
              {pagination.total} commandes
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs"
              >
                Précédent
              </Button>
              <span className="px-2 font-medium text-foreground">
                Page {currentPage} sur {pagination.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pagination.last_page || loading}
                onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                className="h-8 text-xs"
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
