import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  Boxes,
  Search,
  History,
  Edit3,
  X,
  Package,
  AlertTriangle,
  XCircle,
  Coins,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { InventoryItem, InventoryVariantItem, InventoryStats, AdminCategory } from "@/types/admin"
import type { PaginationMeta } from "@/types/api"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function AdminInventoryPage() {
  const [searchParams] = useSearchParams()
  const urlSearch = searchParams.get("search") || ""

  const [items, setItems] = useState<InventoryItem[]>([])
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState(urlSearch)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const q = searchParams.get("search") || ""
    if (q !== search) {
      setSearch(q)
      setCurrentPage(1)
    }
  }, [searchParams])

  // Adjust stock modal state
  const [adjustingProduct, setAdjustingProduct] = useState<InventoryItem | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<InventoryVariantItem | null>(null)
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

  const handleOpenAdjust = (product: InventoryItem, variant?: InventoryVariantItem) => {
    setAdjustingProduct(product)
    const targetVariant = variant || (product.variants && product.variants.length > 0 ? product.variants[0] : null)
    setSelectedVariant(targetVariant)
    setNewStockValue(targetVariant ? targetVariant.stock : 0)
    setAdjustReason("")
  }

  const handleVariantChange = (variantIdStr: string) => {
    if (!adjustingProduct) return
    const vId = Number(variantIdStr)
    const found = adjustingProduct.variants.find((v) => v.id === vId)
    if (found) {
      setSelectedVariant(found)
      setNewStockValue(found.stock)
    }
  }

  const handleConfirmAdjust = async () => {
    if (!adjustingProduct || !selectedVariant) return
    if (newStockValue < 0) {
      toast.error("La quantité de stock ne peut pas être négative.")
      return
    }

    setIsSubmittingAdjust(true)
    try {
      await adminService.adjustStock(
        selectedVariant.id,
        newStockValue,
        adjustReason.trim() || undefined
      )
      toast.success(
        `Stock mis à jour à ${newStockValue} pour « ${adjustingProduct.name} » (${selectedVariant.size}${selectedVariant.color !== "Standard" ? ` - ${selectedVariant.color}` : ""})`
      )
      setAdjustingProduct(null)
      setSelectedVariant(null)
      fetchInventory()
    } catch {
      toast.error("Impossible d'ajuster le stock.")
    } finally {
      setIsSubmittingAdjust(false)
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
            Suivi des quantités par variante, alertes de réapprovisionnement et ajustements manuels certifiés.
          </p>
        </div>

        <Button
          variant="outline"
          asChild
          className="text-xs font-semibold h-9 gap-2 border-border hover:border-[#C9A227] hover:text-[#C9A227]"
        >
          <Link to="/admin/inventory/movements">
            <History className="w-4 h-4 text-[#C9A227]" />
            Historique des mouvements
          </Link>
        </Button>
      </div>

      {/* Inventory KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="border-border bg-white shadow-xs p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Unités en stock
              </span>
              <Boxes className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-1">{stats.total_units}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {stats.total_variants} variantes actives
            </p>
          </Card>

          <Card className="border-border bg-white shadow-xs p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Valeur estimée
              </span>
              <Coins className="w-4 h-4 text-[#C9A227]" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {stats.estimated_stock_value ? `${stats.estimated_stock_value} MAD` : "0.00 MAD"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Au prix de vente actuel</p>
          </Card>

          <Card className="border-border bg-white shadow-xs p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Disponibles
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.in_stock_count}</div>
            <p className="text-[10px] text-emerald-600 mt-0.5">Variantes bien approvisionnées</p>
          </Card>

          <Card className="border-border bg-white shadow-xs p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Stock faible (&le; 5)
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{stats.low_stock_count}</div>
            <p className="text-[10px] text-amber-600 mt-0.5">Réassort conseillé</p>
          </Card>

          <Card className="border-border bg-white shadow-xs p-4 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Ruptures
              </span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{stats.out_of_stock_count}</div>
            <p className="text-[10px] text-rose-600 mt-0.5">Articles indisponibles</p>
          </Card>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <InputGroup className="flex-1 max-w-sm">
          <InputGroupAddon>
            <Search className="w-4 h-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par produit ou catégorie..."
            aria-label="Rechercher un produit"
          />
          {search && (
            <InputGroupAddon align="end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearch("")}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                aria-label="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </InputGroupAddon>
          )}
        </InputGroup>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Category Filter */}
          <Select
            value={selectedCategory || "__all__"}
            onValueChange={(val) => {
              setSelectedCategory(val === "__all__" ? "" : val)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-auto min-w-[170px] text-xs">
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-xs">Toutes les catégories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stock Status Filter */}
          <Select
            value={selectedStockStatus || "__all__"}
            onValueChange={(val) => {
              setSelectedStockStatus(val === "__all__" ? "" : val)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-auto min-w-[170px] text-xs">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-xs">Tous les statuts</SelectItem>
              <SelectItem value="disponible" className="text-xs">En stock (&gt; 5)</SelectItem>
              <SelectItem value="stock_faible" className="text-xs">Stock faible (&le; 5)</SelectItem>
              <SelectItem value="rupture" className="text-xs">Rupture de stock (0)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Inventory Table */}
      <Card className="overflow-hidden border-border bg-white shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-12 text-center">
                  Aperçu
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[200px]">
                  Produit
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Catégorie
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[220px]">
                  Variantes & Stocks
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  Stock Total
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  État
                </TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell className="py-3.5"><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                    <TableCell className="py-3.5"><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell className="py-3.5"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="py-3.5"><Skeleton className="h-6 w-32 rounded-full" /></TableCell>
                    <TableCell className="py-3.5 text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                    <TableCell className="py-3.5"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                    <TableCell className="py-3.5 text-right"><Skeleton className="h-8 w-20 rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : items.length > 0 ? (
                items.map((item) => {
                  const imageUrl = item.thumbnail_url || item.image_url

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      {/* Product Thumbnail */}
                      <TableCell className="py-3 text-center">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded-md object-cover border border-border bg-muted inline-block"
                            onError={(e) => {
                              // Fallback cleanly if image fails to load
                              e.currentTarget.style.display = "none"
                              if (e.currentTarget.nextElementSibling) {
                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex"
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-10 h-10 rounded-md border border-border bg-muted items-center justify-center text-muted-foreground mx-auto ${imageUrl ? "hidden" : "flex"}`}
                        >
                          <Package className="w-5 h-5" />
                        </div>
                      </TableCell>

                      {/* Product Name & Price */}
                      <TableCell className="py-3">
                        <Link
                          to={`/admin/products/${item.id}/edit`}
                          className="font-bold text-foreground hover:text-[#C9A227] hover:underline transition-colors block text-sm"
                        >
                          {item.name}
                        </Link>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {item.price} MAD
                        </span>
                      </TableCell>

                      {/* Category Badge */}
                      <TableCell className="py-3">
                        <Badge variant="secondary" className="bg-muted text-muted-foreground font-normal text-[11px]">
                          {item.category_name || "Général"}
                        </Badge>
                      </TableCell>

                      {/* Variants & Stock Pills */}
                      <TableCell className="py-3">
                        <div className="flex flex-wrap gap-1.5 max-w-sm">
                          {item.variants && item.variants.length > 0 ? (
                            item.variants.map((v) => {
                              const isOutOfStock = v.stock <= 0
                              const isLowStock = v.stock > 0 && v.stock <= 5

                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => handleOpenAdjust(item, v)}
                                  title={`Cliquer pour ajuster le stock de cette variante (${v.size} - ${v.color})`}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition-all hover:scale-105 cursor-pointer ${isOutOfStock
                                    ? "bg-rose-50 text-rose-700 border-rose-200 line-through opacity-80"
                                    : isLowStock
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    }`}
                                >
                                  <span>{v.size}</span>
                                  {v.color !== "Standard" && (
                                    <span className="text-[9px] opacity-75">({v.color})</span>
                                  )}
                                  <span className="font-extrabold ml-0.5">:{v.stock}</span>
                                </button>
                              )
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Aucune variante
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Total Stock */}
                      <TableCell className="py-3 text-center font-extrabold text-foreground text-sm">
                        {item.total_stock} pcs
                      </TableCell>

                      {/* Stock Status */}
                      <TableCell className="py-3 whitespace-nowrap">
                        {item.total_stock === 0 ? (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                            Rupture
                          </Badge>
                        ) : item.total_stock <= 5 ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                            Faible ({item.total_stock})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium">
                            En stock
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleOpenAdjust(item)}
                            className="h-8 px-3 rounded-xl bg-[#18181B] text-white hover:bg-[#27272A] border border-[#27272A] text-xs font-semibold shadow-xs transition-colors gap-1.5 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#C9A227]" />
                            Ajuster
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Link to={`/admin/inventory/movements?search=${encodeURIComponent(item.name)}`}>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
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
                        <Boxes className="w-6 h-6 text-muted-foreground" />
                      </EmptyMedia>
                      <EmptyTitle>Aucun article trouvé dans l'inventaire</EmptyTitle>
                      <EmptyDescription>
                        {search || selectedCategory || selectedStockStatus
                          ? "Aucun article ne correspond à vos filtres actuels."
                          : "Les articles enregistrés apparaîtront ici."}
                      </EmptyDescription>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Segmented Shadcn Pagination Bar */}
        {pagination && pagination.last_page > 1 && (
          <div className="py-3 px-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Affichage de {((currentPage - 1) * 20) + 1} à {Math.min(currentPage * 20, pagination.total)} sur{" "}
              {pagination.total} articles
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs gap-1 border-border"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Précédent
              </Button>
              <div className="flex items-center gap-1 px-1">
                <span className="h-8 min-w-[32px] px-2 rounded-md bg-[#111111] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {currentPage}
                </span>
                <span className="text-xs text-muted-foreground px-1">sur</span>
                <span className="h-8 min-w-[32px] px-2 rounded-md border border-border bg-white text-foreground flex items-center justify-center font-semibold text-xs">
                  {pagination.last_page}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pagination.last_page || loading}
                onClick={() => setCurrentPage((p) => Math.min(pagination.last_page, p + 1))}
                className="h-8 text-xs gap-1 border-border"
              >
                Suivant
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog
        open={!!adjustingProduct}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustingProduct(null)
            setSelectedVariant(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#C9A227]" />
              Ajustement manuel de stock
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modifiez le stock d'une variante avec traçabilité complète dans le journal d'audit.
            </DialogDescription>
          </DialogHeader>

          {adjustingProduct && (
            <div className="space-y-4 py-2">
              {/* Product mini summary */}
              <div className="p-3 bg-muted/40 rounded-lg border border-border flex items-center gap-3">
                {adjustingProduct.thumbnail_url || adjustingProduct.image_url ? (
                  <img
                    src={adjustingProduct.thumbnail_url || adjustingProduct.image_url || ""}
                    alt={adjustingProduct.name}
                    className="w-11 h-11 rounded-md object-cover border border-border bg-muted"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-md border border-border bg-muted flex items-center justify-center text-muted-foreground">
                    <Package className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-foreground truncate">
                    {adjustingProduct.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Catégorie : {adjustingProduct.category_name || "Général"} · Prix : {adjustingProduct.price} MAD
                  </p>
                </div>
              </div>

              {/* Variant Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Variante à ajuster</Label>
                {adjustingProduct.variants && adjustingProduct.variants.length > 1 ? (
                  <Select
                    value={selectedVariant ? String(selectedVariant.id) : ""}
                    onValueChange={handleVariantChange}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Sélectionnez une variante" />
                    </SelectTrigger>
                    <SelectContent>
                      {adjustingProduct.variants.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)} className="text-xs">
                          Taille {v.size} {v.color !== "Standard" ? `(${v.color})` : ""} — Stock actuel : {v.stock} pcs
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : selectedVariant ? (
                  <div className="p-2.5 rounded-md border border-border bg-white text-xs font-medium">
                    Taille : <span className="font-bold">{selectedVariant.size}</span> · Couleur : {selectedVariant.color} · Stock actuel : <span className="font-bold text-[#C9A227]">{selectedVariant.stock} pcs</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Aucune variante disponible</p>
                )}
              </div>

              {/* New Stock Input */}
              <div className="space-y-1.5">
                <Label htmlFor="new-stock" className="text-xs font-semibold">
                  Nouveau stock disponible (unités physiques)
                </Label>
                <Input
                  id="new-stock"
                  type="number"
                  min="0"
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0"
                  className="h-9 text-sm font-bold font-mono"
                />
                {selectedVariant && (
                  <p className="text-[11px] text-muted-foreground">
                    Différence constatée :{" "}
                    <span
                      className={`font-bold ${newStockValue - selectedVariant.stock >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                        }`}
                    >
                      {newStockValue - selectedVariant.stock >= 0 ? "+" : ""}
                      {newStockValue - selectedVariant.stock} unité(s)
                    </span>
                  </p>
                )}
              </div>

              {/* Reason Input */}
              <div className="space-y-1.5">
                <Label htmlFor="adjust-reason" className="text-xs font-semibold">
                  Motif de l'ajustement (optionnel)
                </Label>
                <Input
                  id="adjust-reason"
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ex : Réassort atelier, inventaire de fin de mois, retour client..."
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAdjustingProduct(null)
                setSelectedVariant(null)
              }}
              disabled={isSubmittingAdjust}
              className="text-xs"
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmAdjust}
              disabled={isSubmittingAdjust || !selectedVariant}
              className="bg-[#111111] hover:bg-[#0D0D0D] text-white text-xs font-bold gap-1.5"
            >
              {isSubmittingAdjust ? "Enregistrement..." : "Enregistrer le stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
