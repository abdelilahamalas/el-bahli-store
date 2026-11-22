import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  Boxes,
  Search,
  X,
  Package,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Coins,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { InventoryItem, InventoryVariantItem, InventoryStats, AdminCategory } from "@/types/admin"
import type { PaginationMeta } from "@/types/api"
import { Input } from "@/components/ui/input"
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

  const todayFormatted = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Top Header simple */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Inventaire
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">
            Vue d'ensemble en temps réel · {todayFormatted}
          </p>
        </div>
      </div>

      {/* 4 KPI Cards (Taille moyenne professionnelle) */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: UNITÉS EN STOCK */}
          <Card className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Unités en stock
                </span>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                  {stats.total_units}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              {stats.total_variants} variantes actives
            </p>
          </Card>

          {/* Card 2: VALEUR ESTIMÉE */}
          <Card className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Valeur estimée
                </span>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                  {stats.estimated_stock_value ? `${stats.estimated_stock_value} MAD` : "0.00 MAD"}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-[#C9A227]">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              Au prix de vente actuel
            </p>
          </Card>

          {/* Card 3: DISPONIBLES */}
          <Card className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Disponibles
                </span>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                  {stats.in_stock_count}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              Variantes bien approvisionnées
            </p>
          </Card>

          {/* Card 4: STOCK FAIBLE */}
          <Card className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Stock faible (≤ 3)
                </span>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5">
                  {stats.low_stock_count}
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              Réassort conseillé
            </p>
          </Card>
        </div>
      )}

      {/* Alerte simple et discrète en cas de rupture */}
      {stats && stats.out_of_stock_count > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-2.5 flex items-center justify-between text-xs text-rose-800 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>{stats.out_of_stock_count} article(s) en rupture totale</strong> actuellement non disponible(s).
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedStockStatus("rupture")
              setCurrentPage(1)
            }}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 hover:underline cursor-pointer"
          >
            Filtrer les ruptures →
          </button>
        </div>
      )}

      {/* Main Card: Search, Category, Status & Table */}
      <Card className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        {/* Toolbar compacte */}
        <div className="p-3.5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par produit ou catégorie..."
              className="pl-9 pr-8 h-9 rounded-lg bg-slate-50 border-slate-200 text-xs focus-visible:ring-1 focus-visible:ring-slate-300"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Category Filter */}
            <Select
              value={selectedCategory || "__all__"}
              onValueChange={(val) => {
                setSelectedCategory(val === "__all__" ? "" : val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-auto min-w-[155px] rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-700">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
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
              <SelectTrigger className="h-9 w-auto min-w-[155px] rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-700">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="__all__" className="text-xs">Tous les statuts</SelectItem>
                <SelectItem value="disponible" className="text-xs">En stock (&gt; 5)</SelectItem>
                <SelectItem value="stock_faible" className="text-xs">Stock faible (≤ 5)</SelectItem>
                <SelectItem value="rupture" className="text-xs">Rupture de stock (0)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="w-14 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3">
                  Aperçu
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3 min-w-[180px]">
                  Produit
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3">
                  Catégorie
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3 min-w-[240px]">
                  Variantes & Stocks
                </TableHead>
                <TableHead className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3">
                  Stock Total
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3">
                  État
                </TableHead>
                <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3 pr-5">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i} className="animate-pulse border-b border-slate-50">
                    <TableCell className="py-3 text-center"><Skeleton className="h-9 w-9 rounded-lg mx-auto" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-5 w-18 rounded-full" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-5 w-32 rounded-lg" /></TableCell>
                    <TableCell className="py-3 text-center"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                    <TableCell className="py-3"><Skeleton className="h-5 w-18 rounded-full" /></TableCell>
                    <TableCell className="py-3 text-right pr-5"><Skeleton className="h-7 w-16 rounded-lg ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : items.length > 0 ? (
                items.map((item) => {
                  const imageUrl = item.thumbnail_url || item.image_url

                  return (
                    <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      {/* Product Thumbnail */}
                      <TableCell className="py-2.5 text-center">
                        <div className="w-9 h-9 rounded-lg border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center mx-auto shadow-2xs">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none"
                                if (e.currentTarget.nextElementSibling) {
                                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex"
                                }
                              }}
                            />
                          ) : null}
                          <Package className={`w-4 h-4 text-slate-400 ${imageUrl ? "hidden" : "block"}`} />
                        </div>
                      </TableCell>

                      {/* Product Name & Price */}
                      <TableCell className="py-2.5">
                        <Link
                          to={`/admin/products/${item.id}/edit`}
                          className="font-bold text-xs text-[#0B1528] hover:text-slate-900 transition-colors block"
                        >
                          {item.name}
                        </Link>
                        <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                          {item.price} MAD
                        </span>
                      </TableCell>

                      {/* Category Badge */}
                      <TableCell className="py-2.5">
                        <Badge
                          variant="secondary"
                          className="rounded-full bg-slate-100 text-slate-600 border border-slate-200/50 font-normal text-[11px] px-2 py-0.5"
                        >
                          {item.category_name || "Général"}
                        </Badge>
                      </TableCell>

                      {/* Variants & Stocks Pills */}
                      <TableCell className="py-2.5">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {item.variants && item.variants.length > 0 ? (
                            item.variants.map((v) => {
                              const isOutOfStock = v.stock <= 0
                              const isLowStock = v.stock > 0 && v.stock <= 3

                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => handleOpenAdjust(item, v)}
                                  title={`Cliquer pour ajuster (${v.size} - ${v.color})`}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                                    isOutOfStock
                                      ? "bg-rose-50 text-rose-700 border-rose-200 line-through"
                                      : isLowStock
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  <span className="font-semibold text-xs">{v.size}</span>
                                  {v.color !== "Standard" && (
                                    <span className="text-[10px] text-slate-400">({v.color})</span>
                                  )}
                                  <span className="text-slate-300">·</span>
                                  <span className={`font-mono font-bold ${isOutOfStock ? "text-rose-600" : isLowStock ? "text-amber-700" : "text-[#0B1528]"}`}>
                                    {v.stock}
                                  </span>
                                </button>
                              )
                            })
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              Aucune variante
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Total Stock */}
                      <TableCell className="py-2.5 text-center font-extrabold text-[#0B1528] text-xs font-mono">
                        {item.total_stock} pcs
                      </TableCell>

                      {/* Stock Status */}
                      <TableCell className="py-2.5 whitespace-nowrap">
                        {item.total_stock === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Rupture
                          </span>
                        ) : item.total_stock <= 3 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Faible ({item.total_stock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            En stock
                          </span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-2.5 text-right pr-5 whitespace-nowrap">
                        <Button
                          size="sm"
                          onClick={() => handleOpenAdjust(item)}
                          className="h-7.5 px-3 rounded-lg bg-[#0B1528] hover:bg-[#1A2844] text-white text-xs font-semibold shadow-xs transition-colors gap-1.5 cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-[#E5C368]" />
                          Ajuster
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <Empty className="border-none py-4">
                      <EmptyMedia>
                        <Boxes className="w-7 h-7 text-slate-300" />
                      </EmptyMedia>
                      <EmptyTitle className="text-xs font-bold text-slate-700">Aucun article trouvé</EmptyTitle>
                      <EmptyDescription className="text-xs text-slate-500">
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

        {/* Bottom Pagination Bar */}
        <div className="py-3 px-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500 bg-white">
          <span>
            {pagination ? `${pagination.total} produit(s) au total` : `${items.length} produit(s)`}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border-slate-200 text-xs font-medium h-7.5 px-2.5 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
              Précédent
            </Button>
            <span className="text-xs font-semibold text-[#0B1528] px-1.5">
              Page {currentPage} {pagination && pagination.last_page > 1 ? `sur ${pagination.last_page}` : ""}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination || currentPage >= pagination.last_page || loading}
              onClick={() => setCurrentPage((p) => Math.min(pagination?.last_page || 1, p + 1))}
              className="rounded-lg border-slate-200 text-xs font-medium h-7.5 px-2.5 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Suivant
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
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
        <DialogContent className="max-w-md rounded-xl bg-white border-slate-200 p-5 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0B1528] flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#C9A227]" />
              Ajustement de stock
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Modifiez le stock d'une variante avec traçabilité complète.
            </DialogDescription>
          </DialogHeader>

          {adjustingProduct && (
            <div className="space-y-3.5 py-1.5">
              {/* Product mini summary */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center gap-2.5">
                {adjustingProduct.thumbnail_url || adjustingProduct.image_url ? (
                  <img
                    src={adjustingProduct.thumbnail_url || adjustingProduct.image_url || ""}
                    alt={adjustingProduct.name}
                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400">
                    <Package className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-[#0B1528] truncate">
                    {adjustingProduct.name}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Catégorie : {adjustingProduct.category_name || "Général"} · Prix : <span className="font-mono font-bold text-[#0B1528]">{adjustingProduct.price} MAD</span>
                  </p>
                </div>
              </div>

              {/* Variant Selector */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Variante à ajuster</Label>
                {adjustingProduct.variants && adjustingProduct.variants.length > 1 ? (
                  <Select
                    value={selectedVariant ? String(selectedVariant.id) : ""}
                    onValueChange={handleVariantChange}
                  >
                    <SelectTrigger className="h-9 rounded-lg border-slate-200 text-xs font-medium">
                      <SelectValue placeholder="Sélectionnez une variante" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {adjustingProduct.variants.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)} className="text-xs">
                          Taille {v.size} {v.color !== "Standard" ? `(${v.color})` : ""} — Stock actuel : {v.stock} pcs
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : selectedVariant ? (
                  <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
                    Taille : <span className="font-bold text-[#0B1528]">{selectedVariant.size}</span> · Couleur : {selectedVariant.color} · Stock actuel : <span className="font-bold text-[#C9A227]">{selectedVariant.stock} pcs</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Aucune variante disponible</p>
                )}
              </div>

              {/* New Stock Input */}
              <div className="space-y-1">
                <Label htmlFor="new-stock" className="text-xs font-semibold text-slate-700">
                  Nouveau stock disponible (unités physiques)
                </Label>
                <Input
                  id="new-stock"
                  type="number"
                  min="0"
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0"
                  className="h-9 rounded-lg border-slate-200 text-xs font-bold font-mono focus-visible:ring-1 focus-visible:ring-slate-300"
                />
                {selectedVariant && (
                  <p className="text-[11px] text-slate-500">
                    Différence constatée :{" "}
                    <span
                      className={`font-bold ${
                        newStockValue - selectedVariant.stock >= 0
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
              <div className="space-y-1">
                <Label htmlFor="adjust-reason" className="text-xs font-semibold text-slate-700">
                  Motif de l'ajustement (optionnel)
                </Label>
                <Input
                  id="adjust-reason"
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ex : Réassort atelier, inventaire périodique, retour..."
                  className="h-9 rounded-lg border-slate-200 text-xs focus-visible:ring-1 focus-visible:ring-slate-300"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAdjustingProduct(null)
                setSelectedVariant(null)
              }}
              disabled={isSubmittingAdjust}
              className="rounded-lg border-slate-200 text-xs font-medium h-8 text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmAdjust}
              disabled={isSubmittingAdjust || !selectedVariant}
              className="rounded-lg bg-[#0B1528] hover:bg-[#1A2844] text-white text-xs font-bold h-8 px-3.5 transition-colors"
            >
              {isSubmittingAdjust ? "Enregistrement..." : "Enregistrer le stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
