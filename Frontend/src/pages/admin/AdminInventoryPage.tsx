import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Boxes,
  Search,
  History,
  Edit3,
  Power,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { InventoryItem, InventoryStats, AdminCategory } from "@/types/admin"
import type { PaginationMeta } from "@/types/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)

  // Adjust stock modal state
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null)
  const [newStockValue, setNewStockValue] = useState<number>(0)
  const [adjustReason, setAdjustReason] = useState<string>("")
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false)

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const params: Record<string, string | number> = {
        page: currentPage,
        per_page: 20,
      }
      if (search.trim()) params.search = search.trim()
      if (selectedCategory) params.category_id = selectedCategory
      if (selectedStockStatus) params.stock_status = selectedStockStatus

      const res = await adminService.getInventory(params)
      setItems(res.inventory.data)
      setPagination(res.inventory.pagination)
      setStats(res.stats)
      if (res.categories) setCategories(res.categories)
    } catch {
      toast.error("Erreur lors de la récupération des données de stock.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [currentPage, selectedCategory, selectedStockStatus])

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchInventory()
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  const handleOpenAdjust = (item: InventoryItem) => {
    setAdjustingItem(item)
    setNewStockValue(item.stock)
    setAdjustReason("")
  }

  const handleConfirmAdjust = async () => {
    if (!adjustingItem) return
    if (newStockValue < 0) {
      toast.error("La quantité de stock ne peut pas être négative.")
      return
    }

    setIsSubmittingAdjust(true)
    try {
      await adminService.adjustStock(
        adjustingItem.id,
        newStockValue,
        adjustReason.trim() || undefined
      )
      toast.success(
        `Stock mis à jour à ${newStockValue} pour « ${adjustingItem.product_name} (${adjustingItem.size}) »`
      )
      setAdjustingItem(null)
      fetchInventory()
    } catch {
      toast.error("Impossible d'ajuster le stock.")
    } finally {
      setIsSubmittingAdjust(false)
    }
  }

  const handleToggleVariant = async (item: InventoryItem) => {
    try {
      const res = await adminService.toggleVariant(item.id)
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, is_active: res.is_active } : it))
      )
      toast.success(
        res.is_active
          ? `La variante (${item.size} - ${item.color}) est réactivée.`
          : `La variante (${item.size} - ${item.color}) a été désactivée.`
      )
    } catch {
      toast.error("Impossible de modifier le statut de la variante.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Inventaire & Contrôle des stocks
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Suivi des quantités par variante, alertes de réapprovisionnement et ajustements manuels.
          </p>
        </div>

        <Button
          variant="outline"
          asChild
          className="text-xs font-semibold h-9 gap-2 border-border hover:border-[#C9A227]"
        >
          <Link to="/admin/inventory/movements">
            <History className="w-4 h-4 text-[#C9A227]" />
            Historique des mouvements
          </Link>
        </Button>
      </div>

      {/* Inventory KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-border bg-white shadow-xs p-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
              Total pièces en stock
            </span>
            <div className="text-2xl font-bold text-foreground mt-1">{stats.total_units}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Réparties sur {stats.total_variants} variantes
            </p>
          </Card>

          <Card className="border-border bg-white shadow-xs p-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
              Variantes en stock
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.in_stock_count}</div>
            <p className="text-[10px] text-emerald-600 mt-0.5">Disponibilité optimale</p>
          </Card>

          <Card className="border-border bg-white shadow-xs p-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
              Stock faible (&le; 5)
            </span>
            <div className="text-2xl font-bold text-amber-600 mt-1">{stats.low_stock_count}</div>
            <p className="text-[10px] text-amber-600 mt-0.5">Réassort conseillé</p>
          </Card>

          <Card className="border-border bg-white shadow-xs p-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
              Ruptures de stock
            </span>
            <div className="text-2xl font-bold text-rose-600 mt-1">{stats.out_of_stock_count}</div>
            <p className="text-[10px] text-rose-600 mt-0.5">Articles indisponibles</p>
          </Card>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par article..."
            className="pl-9 h-9 text-xs bg-muted/20 border-border"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              setCurrentPage(1)
            }}
            className="h-9 px-3 text-xs bg-white border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <select
            value={selectedStockStatus}
            onChange={(e) => {
              setSelectedStockStatus(e.target.value)
              setCurrentPage(1)
            }}
            className="h-9 px-3 text-xs bg-white border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
          >
            <option value="">Tous les états de stock</option>
            <option value="in_stock">En stock (&gt; 5)</option>
            <option value="low_stock">Stock faible (&le; 5)</option>
            <option value="out_of_stock">Rupture (0)</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <Card className="overflow-hidden border-border bg-white shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Article</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Catégorie</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Taille / Couleur</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stock actuel</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">État</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell className="py-3.5"><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell className="py-3.5"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="py-3.5"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="py-3.5"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="py-3.5"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                    <TableCell className="py-3.5"><Skeleton className="h-4 w-6 rounded" /></TableCell>
                    <TableCell className="py-3.5 text-right"><Skeleton className="h-7 w-20 rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3 font-semibold text-foreground">
                      {item.product_name}
                    </TableCell>

                    <TableCell className="py-3">
                      <Badge variant="secondary" className="bg-muted text-muted-foreground font-normal text-[11px]">
                        {item.category_name}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-3">
                      <span className="font-bold text-foreground">{item.size}</span>
                      <span className="text-muted-foreground"> · {item.color}</span>
                    </TableCell>

                    <TableCell className="py-3 font-bold text-foreground">
                      {item.stock} pièce(s)
                    </TableCell>

                    <TableCell className="py-3 whitespace-nowrap">
                      {item.stock === 0 ? (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                          Rupture
                        </Badge>
                      ) : item.stock <= 5 ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                          Faible ({item.stock})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium">
                          En stock
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleVariant(item)}
                        title={item.is_active ? "Désactiver la variante" : "Activer la variante"}
                        className={`p-1.5 rounded transition-colors ${
                          item.is_active
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </TableCell>

                    <TableCell className="py-3 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAdjust(item)}
                        className="h-7 text-xs border-border hover:border-[#C9A227] hover:text-[#C9A227] gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        Ajuster
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Boxes className="w-9 h-9 text-muted-foreground/40 mb-2" />
                      <p className="font-semibold text-sm text-foreground">Aucune variante trouvée</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Aucun article ne correspond à vos filtres actuels.
                      </p>
                    </div>
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
              Affichage de {pagination.from || 1} à {pagination.to || items.length} sur{" "}
              {pagination.total} variantes
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

      {/* Stock Adjustment Dialog */}
      <Dialog open={!!adjustingItem} onOpenChange={(open) => !open && setAdjustingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[#C9A227]" />
              Ajustement manuel du stock
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modifiez la quantité en stock pour la variante sélectionnée. Un mouvement d'audit sera
              automatiquement enregistré.
            </DialogDescription>
          </DialogHeader>

          {adjustingItem && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                <p className="font-bold text-foreground text-sm">{adjustingItem.product_name}</p>
                <p className="text-muted-foreground">
                  Taille : <span className="font-semibold text-foreground">{adjustingItem.size}</span> · Couleur :{" "}
                  <span className="font-semibold text-foreground">{adjustingItem.color}</span>
                </p>
                <p className="text-muted-foreground">
                  Stock actuel : <span className="font-bold text-foreground">{adjustingItem.stock}</span> pièces
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newStock" className="text-xs font-semibold">
                  Nouvelle quantité en stock <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="newStock"
                  type="number"
                  min="0"
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adjustReason" className="text-xs font-semibold">
                  Motif de l'ajustement <span className="text-muted-foreground font-normal">(Optionnel)</span>
                </Label>
                <Input
                  id="adjustReason"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ex: Arrivage atelier, correction inventaire physique..."
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isSubmittingAdjust}
              onClick={() => setAdjustingItem(null)}
              className="text-xs h-9"
            >
              Annuler
            </Button>
            <Button
              disabled={isSubmittingAdjust}
              onClick={handleConfirmAdjust}
              className="bg-[#111111] hover:bg-[#252525] text-white text-xs font-semibold h-9 shadow-xs"
            >
              {isSubmittingAdjust ? "Enregistrement..." : "Appliquer l'ajustement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
