import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, History, ArrowDown, ArrowUp, Minus, Calendar, Search, X, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { StockMovementItem } from "@/types/admin"
import type { PaginationMeta } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function AdminStockMovementsPage() {
  const navigate = useNavigate()
  const [movements, setMovements] = useState<StockMovementItem[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedType, setSelectedType] = useState<string>("")
  const [search, setSearch] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)

  const fetchMovements = async () => {
    try {
      setLoading(true)
      const params: Record<string, string | number> = {
        page: currentPage,
        per_page: 20,
      }
      if (selectedType) params.type = selectedType
      if (search.trim()) params.search = search.trim()

      const res = await adminService.getStockMovements(params)
      setMovements(res.movements)
      setPagination(res.pagination)
    } catch {
      toast.error("Impossible de récupérer l'historique des mouvements de stock.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMovements()
  }, [currentPage, selectedType, search])

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case "initial_stock":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Stock initial
          </span>
        )
      case "manual_adjustment":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Ajustement manuel
          </span>
        )
      case "order_placed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Commande client
          </span>
        )
      case "order_cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Annulation commande
          </span>
        )
      case "return":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Retour marchandise
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {type}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin/inventory")}
            className="h-10 w-10 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0B1528]">
              Mouvements de stock
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Journal d'audit détaillé de chaque entrée, sortie et ajustement d'inventaire.
            </p>
          </div>
        </div>
      </div>

      {/* Main Single Card: Search, Filter & Table (Matches Image 9) */}
      <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Rechercher par article, référence, motif..."
              className="pl-10 pr-9 h-10 rounded-xl bg-slate-50 border-slate-200 text-xs focus-visible:ring-1 focus-visible:ring-slate-300"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  setCurrentPage(1)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto">
            <Select
              value={selectedType || "__all__"}
              onValueChange={(val) => {
                setSelectedType(val === "__all__" ? "" : val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-10 w-auto min-w-[200px] rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                <SelectValue placeholder="Tous les types d'opération" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="__all__" className="text-xs">Tous les types d'opération</SelectItem>
                <SelectItem value="initial_stock" className="text-xs">Stock initial</SelectItem>
                <SelectItem value="manual_adjustment" className="text-xs">Ajustement manuel</SelectItem>
                <SelectItem value="order_placed" className="text-xs">Sortie commande</SelectItem>
                <SelectItem value="order_cancelled" className="text-xs">Restitution annulation</SelectItem>
                <SelectItem value="return" className="text-xs">Retour marchandise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Movements Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3.5 pl-6">
                  Date & Heure
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3.5 min-w-[200px]">
                  Article & Variante
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3.5">
                  Opération
                </TableHead>
                <TableHead className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3.5">
                  Variation
                </TableHead>
                <TableHead className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3.5">
                  Avant → Après
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3.5">
                  Motif / Contexte
                </TableHead>
                <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3.5 pr-6">
                  Auteur
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="animate-pulse border-b border-slate-50">
                    <TableCell className="py-4 pl-6"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                    <TableCell className="py-4 text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                    <TableCell className="py-4 text-center"><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                    <TableCell className="py-4"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="py-4 text-right pr-6"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : movements.length > 0 ? (
                movements.map((m) => {
                  const dateObj = new Date(m.created_at)
                  const dateStr = dateObj.toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })

                  const delta = m.quantity_delta
                  const isPositive = delta > 0
                  const isNegative = delta < 0

                  return (
                    <TableRow key={m.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="py-3.5 pl-6 whitespace-nowrap text-slate-500 text-xs font-mono">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {dateStr}
                        </span>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-[#0B1528]">{m.product_name}</span>
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            Taille : {m.size} · Couleur : {m.color}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5 whitespace-nowrap">
                        {renderTypeBadge(m.type)}
                      </TableCell>

                      <TableCell className="py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${isPositive
                            ? "bg-emerald-50 text-emerald-700"
                            : isNegative
                              ? "bg-rose-50 text-rose-700"
                              : "bg-slate-100 text-slate-600"
                            }`}
                        >
                          {isPositive && <ArrowUp className="w-3 h-3" />}
                          {isNegative && <ArrowDown className="w-3 h-3" />}
                          {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
                          {isPositive ? `+${delta}` : delta}
                        </span>
                      </TableCell>

                      <TableCell className="py-3.5 text-center whitespace-nowrap font-mono text-xs">
                        <span className="text-slate-600 font-medium">{m.quantity_before}</span>
                        <span className="mx-2 text-slate-400">→</span>
                        <span className="font-bold text-[#0B1528]">{m.quantity_after}</span>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-700">{m.reason || "—"}</span>
                          {m.order_reference && (
                            <span className="text-[10px] font-mono font-semibold text-[#C9A227] mt-0.5">
                              Réf: {m.order_reference}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5 text-right pr-6 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-bold">
                            {m.admin_name ? m.admin_name.charAt(0).toUpperCase() : "S"}
                          </div>
                          <span>{m.admin_name || "Système"}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <Empty className="border-none py-4">
                      <EmptyMedia>
                        <History className="w-8 h-8 text-slate-300" />
                      </EmptyMedia>
                      <EmptyTitle className="text-sm font-bold text-slate-700">Aucun mouvement enregistré</EmptyTitle>
                      <EmptyDescription className="text-xs text-slate-500">
                        Toutes les variations de stock futures apparaîtront ici.
                      </EmptyDescription>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Bottom Pagination Bar */}
        <div className="py-3.5 px-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white">
          <span>
            {pagination
              ? `Affichage de ${pagination.from || 1} à ${pagination.to || movements.length} sur ${pagination.total} mouvements`
              : `${movements.length} mouvement(s)`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border-slate-200 text-xs font-medium h-8 px-3 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Précédent
            </Button>
            <span className="text-xs font-semibold text-[#0B1528] px-2">
              Page {currentPage} {pagination && pagination.last_page > 1 ? `sur ${pagination.last_page}` : ""}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination || currentPage >= pagination.last_page || loading}
              onClick={() => setCurrentPage((p) => Math.min(pagination?.last_page || 1, p + 1))}
              className="rounded-xl border-slate-200 text-xs font-medium h-8 px-3 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Suivant
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
