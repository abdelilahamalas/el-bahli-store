import { useEffect, useState, useTransition } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
  Search,
  ShoppingBag,
  RefreshCw,
  Banknote,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminOrder } from "@/types/admin"
import type { PaginationMeta } from "@/types/api"
import { Input } from "@/components/ui/input"
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
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { getOrderStatusBadge } from "@/utils/orderStatus"

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
  const navigate = useNavigate()

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Header de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Commandes
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Suivi des ventes, validation des commandes et livraisons au Maroc.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchOrders()}
          disabled={loading}
          className="h-9 px-3 text-xs rounded-xl border-border hover:bg-muted self-start sm:self-auto gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#C9A227]" : ""}`} />
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
              onClick={() => {
                startTransition(() => {
                  setSelectedStatus(tab.id)
                  setCurrentPage(1)
                })
              }}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors cursor-pointer text-xs font-semibold ${
                isActive
                  ? "bg-[#111111] text-white shadow-2xs"
                  : "bg-white text-muted-foreground hover:text-foreground border border-border/70 hover:bg-muted/40"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 3. Barre de recherche avec Input shadcn et indicateur COD */}
      <Card className="border-border/70 shadow-2xs rounded-2xl bg-white p-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par référence, nom client, téléphone..."
              className="pl-9.5 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
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

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 text-xs font-semibold">
              <Banknote className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>À encaisser (page) :</span>
              <span className="font-extrabold text-foreground">{formatMAD(totalToCollectOnPage)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Tableau shadcn/ui officiel (Table, TableHeader, TableRow, TableHead, TableCell) */}
      <Card className="border-border/70 shadow-2xs rounded-2xl bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/70 bg-muted/30 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              <TableHead className="py-3 px-4 font-bold">Référence</TableHead>
              <TableHead className="py-3 px-4 font-bold">Client</TableHead>
              <TableHead className="py-3 px-4 font-bold">Téléphone</TableHead>
              <TableHead className="py-3 px-4 font-bold">Ville</TableHead>
              <TableHead className="py-3 px-4 font-bold">Date</TableHead>
              <TableHead className="py-3 px-4 font-bold">Montant total</TableHead>
              <TableHead className="py-3 px-4 font-bold">Statut</TableHead>
              <TableHead className="py-3 px-4 text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y divide-border/50">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="py-4 px-4"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="py-4 px-4"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="py-4 px-4"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="py-4 px-4"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="py-4 px-4"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="py-4 px-4"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="py-4 px-4"><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell className="py-4 px-4 text-right"><Skeleton className="h-8 w-16 rounded ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : orders.length > 0 ? (
              orders.map((order) => {
                const dateStr = new Date(order.created_at).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
                const displayCity = order.city || order.customer_city || "Maroc"

                return (
                  <TableRow
                    key={order.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    {/* Référence */}
                    <TableCell className="py-3.5 px-4 font-mono font-bold text-foreground">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="hover:text-[#C9A227] transition-colors"
                      >
                        {order.reference}
                      </Link>
                    </TableCell>

                    {/* Client */}
                    <TableCell className="py-3.5 px-4 font-semibold text-foreground">
                      {order.customer_name}
                    </TableCell>

                    {/* Téléphone */}
                    <TableCell className="py-3.5 px-4 font-mono text-muted-foreground">
                      {order.customer_phone}
                    </TableCell>

                    {/* Ville */}
                    <TableCell className="py-3.5 px-4 text-foreground font-medium">
                      {displayCity}
                    </TableCell>

                    {/* Date */}
                    <TableCell className="py-3.5 px-4 text-muted-foreground">
                      {dateStr}
                    </TableCell>

                    {/* Montant total */}
                    <TableCell className="py-3.5 px-4 font-bold text-foreground">
                      {formatMAD(order.total)}
                    </TableCell>

                    {/* Statut */}
                    <TableCell className="py-3.5 px-4">
                      {getOrderStatusBadge(order.status, order.status_label)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-8 px-3 text-xs rounded-xl border-border/80 hover:border-[#C9A227] hover:text-[#C9A227] font-semibold"
                      >
                        <Link to={`/admin/orders/${order.id}`}>
                          <span>Détails</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <Empty className="border-none py-4">
                    <EmptyMedia>
                      <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>Aucune commande trouvée</EmptyTitle>
                    <EmptyDescription>
                      {search || selectedStatus !== "all"
                        ? "Modifiez vos critères de recherche ou réinitialisez les filtres."
                        : "Les commandes de vos clients apparaîtront ici."}
                    </EmptyDescription>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination fonctionnelle */}
        {pagination && pagination.last_page > 1 && (
          <div className="p-4 border-t border-border/70 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Page {pagination.current_page} sur {pagination.last_page} ({pagination.total} commandes)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                className="h-8 rounded-xl text-xs"
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                disabled={currentPage >= pagination.last_page || loading}
                className="h-8 rounded-xl text-xs"
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
