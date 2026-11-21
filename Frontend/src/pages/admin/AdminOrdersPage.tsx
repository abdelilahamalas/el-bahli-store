import { useEffect, useState, useTransition } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
  Search,
  ShoppingBag,
  RefreshCw,
  Banknote,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminOrder } from "@/types/admin"
import type { PaginationMeta } from "@/types/api"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
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
            <Button
              key={tab.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => {
                startTransition(() => {
                  setSelectedStatus(tab.id)
                  setCurrentPage(1)
                })
              }}
              className={`h-8 px-3.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors duration-100 ${
                isActive
                  ? "bg-[#18181B] text-white border border-[#27272A] shadow-xs hover:bg-[#27272A]"
                  : "bg-white text-zinc-600 hover:text-zinc-950 border border-zinc-200/80 hover:bg-zinc-50"
              }`}
            >
              {tab.label}
            </Button>
          )
        })}
      </div>

      {/* 3. Barre de recherche avec InputGroup shadcn et indicateur COD */}
      <Card className="border border-zinc-200/80 shadow-2xs rounded-2xl bg-white p-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <InputGroup className="max-w-md">
            <InputGroupAddon>
              <Search className="w-4 h-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par référence, client, téléphone..."
              aria-label="Rechercher une commande"
            />
            {search && (
              <InputGroupAddon align="end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearch("")}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </InputGroupAddon>
            )}
          </InputGroup>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs font-semibold shadow-2xs">
              <Banknote className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-zinc-600">À encaisser (page) :</span>
              <span className="font-extrabold text-zinc-950">{formatMAD(totalToCollectOnPage)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Tableau shadcn/ui moderne et épuré */}
      <Card className="border border-zinc-200/80 shadow-2xs rounded-2xl bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-zinc-200/80 bg-zinc-50/80 text-[11px] uppercase font-bold tracking-wider text-zinc-500 hover:bg-zinc-50/80">
              <TableHead className="py-3 px-4 font-bold text-zinc-500">Référence</TableHead>
              <TableHead className="py-3 px-4 font-bold text-zinc-500">Client</TableHead>
              <TableHead className="py-3 px-4 font-bold text-zinc-500">Téléphone</TableHead>
              <TableHead className="py-3 px-4 font-bold text-zinc-500">Ville</TableHead>
              <TableHead className="py-3 px-4 font-bold text-zinc-500">Date</TableHead>
              <TableHead className="py-3 px-4 font-bold text-zinc-500">Montant total</TableHead>
              <TableHead className="py-3 px-4 font-bold text-zinc-500">Statut</TableHead>
              <TableHead className="py-3 px-4 text-right font-bold text-zinc-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y divide-zinc-100">
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
                    className="hover:bg-zinc-50/70 transition-colors duration-150 cursor-pointer group"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    {/* Référence */}
                    <TableCell className="py-3.5 px-4">
                      <span className="font-mono font-bold text-xs bg-zinc-100 text-zinc-900 border border-zinc-200/80 px-2.5 py-1 rounded-lg group-hover:border-[#C9A227]/50 group-hover:text-[#C9A227] transition-colors">
                        {order.reference}
                      </span>
                    </TableCell>

                    {/* Client */}
                    <TableCell className="py-3.5 px-4 font-semibold text-zinc-900">
                      {order.customer_name}
                    </TableCell>

                    {/* Téléphone */}
                    <TableCell className="py-3.5 px-4 font-mono text-zinc-500">
                      {order.customer_phone || "—"}
                    </TableCell>

                    {/* Ville */}
                    <TableCell className="py-3.5 px-4 text-zinc-700 font-medium">
                      {displayCity}
                    </TableCell>

                    {/* Date */}
                    <TableCell className="py-3.5 px-4 text-zinc-500">
                      {dateStr}
                    </TableCell>

                    {/* Montant total */}
                    <TableCell className="py-3.5 px-4 font-extrabold text-sm text-zinc-950">
                      {formatMAD(order.total)}
                    </TableCell>

                    {/* Statut */}
                    <TableCell className="py-3.5 px-4">
                      {getOrderStatusBadge(order.status, order.status_label)}
                    </TableCell>

                    {/* Actions : Bouton sombre pilule conforme à la référence */}
                    <TableCell className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        asChild
                        className="h-8 px-3.5 text-xs rounded-xl bg-[#18181B] text-white hover:bg-[#27272A] border border-[#27272A] font-semibold shadow-xs transition-colors duration-100 cursor-pointer"
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

        {/* Pagination fonctionnelle moderne */}
        {pagination && pagination.last_page > 1 && (
          <div className="p-4 border-t border-zinc-200/80 bg-zinc-50/40 flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-medium">
              Page {pagination.current_page} sur {pagination.last_page} · {pagination.total} commandes
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                className="h-8 px-3 rounded-xl text-xs font-semibold border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                disabled={currentPage >= pagination.last_page || loading}
                className="h-8 px-3 rounded-xl text-xs font-semibold border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 cursor-pointer"
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
