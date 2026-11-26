import { useEffect, useState, useTransition } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  Search,
  RefreshCw,
  Banknote,
  X,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminOrder } from "@/types/admin"
import type { PaginationMeta } from "@/types/api"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)

  const [searchParams] = useSearchParams()
  const urlSearch = searchParams.get("search") || ""

  // Filters
  const [search, setSearch] = useState(urlSearch)
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)

  const [, startTransition] = useTransition()

  useEffect(() => {
    const q = searchParams.get("search") || ""
    if (q !== search) {
      setSearch(q)
      setCurrentPage(1)
    }
  }, [searchParams])

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
      toast.error("Chargement impossible", {
        description: "Erreur lors de la récupération des commandes.",
      })
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

  const totalToCollectOnPage = orders
    .filter((o) => o.payment_status === "pending" && !["cancelled", "returned"].includes(o.status))
    .reduce((acc, o) => acc + (typeof o.total === "string" ? parseFloat(o.total) : o.total), 0)

  const statusTabs = [
    { id: "all", label: "Toutes les commandes" },
    { id: "pending", label: "En attente" },
    { id: "confirmed", label: "Confirmées" },
    { id: "processing", label: "En préparation" },
    { id: "shipped", label: "Expédiées" },
    { id: "delivered", label: "Livrées" },
    { id: "cancelled", label: "Annulées" },
  ]

  const getOrderStatusBadge = (status: string, label?: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {label || "En attente"}
          </span>
        )
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {label || "Confirmée"}
          </span>
        )
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            {label || "En préparation"}
          </span>
        )
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            {label || "Expédiée"}
          </span>
        )
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {label || "Livrée"}
          </span>
        )
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {label || "Annulée"}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {label || status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* 1. Header de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Commandes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des ventes, validation des commandes et livraisons au Maroc.
          </p>
        </div>

        {/* White button standard : Actualiser */}
        <Button
          onClick={() => fetchOrders()}
          disabled={loading}
          className="h-9 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? "animate-spin" : ""}`} />
          <span>Actualiser</span>
        </Button>
      </div>

      {/* 2. Onglets de filtrage par statut */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {statusTabs.map((tab) => {
          const isActive = selectedStatus === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                startTransition(() => {
                  setSelectedStatus(tab.id)
                  setCurrentPage(1)
                })
              }}
              className={`h-8 px-3.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 whitespace-nowrap ${isActive
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-2xs"
                }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 3. Barre de recherche et indicateur COD intégrés */}
      <Card className="border border-slate-200/80 shadow-2xs rounded-xl bg-white p-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-lg">
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs focus-within:bg-white focus-within:border-slate-300 transition-colors">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par référence, client, téléphone..."
                className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-medium">
              <Banknote className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-slate-600">À encaisser :</span>
              <span className="font-bold text-slate-900">{formatMAD(totalToCollectOnPage)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Tableau shadcn/ui */}
      <Card className="border border-slate-200/80 shadow-2xs rounded-xl bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase font-bold text-slate-400 hover:bg-slate-50/70">
              <TableHead className="py-3 px-4 font-bold text-slate-500">RÉFÉRENCE</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-500">CLIENT</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-500">TÉLÉPHONE</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-500">VILLE</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-500">DATE</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-500">MONTANT TOTAL</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-500">STATUT</TableHead>
              <TableHead className="py-3 px-4 text-right font-bold text-slate-500">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y divide-slate-100">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="py-3 px-4"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="py-3 px-4"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="py-3 px-4"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="py-3 px-4"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="py-3 px-4"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="py-3 px-4"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="py-3 px-4"><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell className="py-3 px-4 text-right"><Skeleton className="h-7 w-20 rounded-md ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : orders.length > 0 ? (
              orders.map((order) => {
                const dateStr = new Date(order.created_at).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
                const displayCity = order.city || order.customer_city || "Salé"
                const initials = (order.customer_name || "Client")
                  .split(" ")
                  .map((n) => n.charAt(0))
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()

                return (
                  <TableRow
                    key={order.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Référence */}
                    <TableCell className="py-3 px-4">
                      <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                        {order.reference}
                      </span>
                    </TableCell>

                    {/* Client */}
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {initials}
                        </div>
                        <span className="font-bold text-slate-900">{order.customer_name}</span>
                      </div>
                    </TableCell>

                    {/* Téléphone */}
                    <TableCell className="py-3 px-4 font-mono text-slate-500">
                      {order.customer_phone || "—"}
                    </TableCell>

                    {/* Ville */}
                    <TableCell className="py-3 px-4 text-slate-600 font-medium">
                      {displayCity}
                    </TableCell>

                    {/* Date */}
                    <TableCell className="py-3 px-4 text-slate-500">
                      {dateStr}
                    </TableCell>

                    {/* Montant total */}
                    <TableCell className="py-3 px-4 font-bold text-xs text-slate-900">
                      {formatMAD(order.total)}
                    </TableCell>

                    {/* Statut */}
                    <TableCell className="py-3 px-4">
                      {getOrderStatusBadge(order.status, order.status_label)}
                    </TableCell>

                    {/* Action : White button Détails → */}
                    <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/zakaria/admin/orders/${order.id}`}
                        className="h-7.5 px-3 rounded-lg text-xs font-semibold bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <span>Détails</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                  Aucune commande trouvée.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination fonctionnelle */}
        {pagination && pagination.last_page > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-white">
            <span className="font-medium">
              Page {pagination.current_page} sur {pagination.last_page} · {pagination.total} commandes
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                className="h-8 px-3 rounded-lg text-xs font-medium border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                disabled={currentPage >= pagination.last_page || loading}
                className="h-8 px-3 rounded-lg text-xs font-medium border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
