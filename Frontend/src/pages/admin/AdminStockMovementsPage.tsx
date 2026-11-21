import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, History, ArrowDown, ArrowUp, Minus, Calendar } from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { StockMovementItem } from "@/types/admin"
import type { PaginationMeta } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
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

export default function AdminStockMovementsPage() {
  const navigate = useNavigate()
  const [movements, setMovements] = useState<StockMovementItem[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedType, setSelectedType] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)

  const fetchMovements = async () => {
    try {
      setLoading(true)
      const params: Record<string, string | number> = {
        page: currentPage,
        per_page: 20,
      }
      if (selectedType) params.type = selectedType

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
  }, [currentPage, selectedType])

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case "initial_stock":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold">
            Stock initial
          </Badge>
        )
      case "manual_adjustment":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-semibold">
            Ajustement manuel
          </Badge>
        )
      case "order_placed":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold">
            Commande client
          </Badge>
        )
      case "order_cancelled":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
            Annulation commande
          </Badge>
        )
      case "return":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold">
            Retour marchandise
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
            {type}
          </Badge>
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
            className="h-9 w-9 border-border"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Mouvements de stock
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Journal d'audit détaillé de chaque entrée, sortie et ajustement d'inventaire.
            </p>
          </div>
        </div>

        {/* Filter Type */}
        <select
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value)
            setCurrentPage(1)
          }}
          className="h-9 px-3 text-xs bg-white border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
        >
          <option value="">Tous les types d'opération</option>
          <option value="initial_stock">Stock initial</option>
          <option value="manual_adjustment">Ajustement manuel</option>
          <option value="order_placed">Sortie commande</option>
          <option value="order_cancelled">Restitution annulation</option>
          <option value="return">Retour marchandise</option>
        </select>
      </div>

      {/* Movements Table */}
      <Card className="overflow-hidden border-border bg-white shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date & Heure</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Article & Variante</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Opération</TableHead>
                <TableHead className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Variation</TableHead>
                <TableHead className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Avant / Après</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Motif / Contexte</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Auteur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell className="py-3.5"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="py-3.5"><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell className="py-3.5"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                    <TableCell className="py-3.5 text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                    <TableCell className="py-3.5 text-center"><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                    <TableCell className="py-3.5"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="py-3.5 text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : movements.length > 0 ? (
                movements.map((m) => {
                  const dateStr = new Date(m.created_at).toLocaleDateString("fr-FR", {
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
                    <TableRow key={m.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3 whitespace-nowrap text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                        {dateStr}
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{m.product_name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            Taille : {m.size} · Couleur : {m.color}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 whitespace-nowrap">{renderTypeBadge(m.type)}</TableCell>

                      <TableCell className="py-3 text-center whitespace-nowrap">
                        <span
                          className={`font-bold inline-flex items-center gap-0.5 ${
                            isPositive
                              ? "text-emerald-600"
                              : isNegative
                              ? "text-rose-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          {isPositive && <ArrowUp className="w-3 h-3" />}
                          {isNegative && <ArrowDown className="w-3 h-3" />}
                          {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
                          {isPositive ? `+${delta}` : delta}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 text-center whitespace-nowrap text-muted-foreground">
                        <span className="font-medium text-foreground">{m.quantity_before}</span>
                        <span className="mx-1.5 text-muted-foreground/60">&rarr;</span>
                        <span className="font-bold text-foreground">{m.quantity_after}</span>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="text-foreground">{m.reason || "—"}</span>
                          {m.order_reference && (
                            <span className="text-[10px] font-mono text-[#C9A227] font-semibold">
                              Réf: {m.order_reference}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-3 text-right whitespace-nowrap text-muted-foreground">
                        {m.admin_name || "Système"}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <Empty className="border-none py-2">
                      <EmptyMedia>
                        <History className="w-5 h-5" />
                      </EmptyMedia>
                      <EmptyTitle>Aucun mouvement enregistré</EmptyTitle>
                      <EmptyDescription>
                        Toutes les variations de stock futures apparaîtront ici.
                      </EmptyDescription>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        {pagination && pagination.last_page > 1 && (
          <div className="py-3 px-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Affichage de {pagination.from || 1} à {pagination.to || movements.length} sur{" "}
              {pagination.total} mouvements
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
      </Card>
    </div>
  )
}
