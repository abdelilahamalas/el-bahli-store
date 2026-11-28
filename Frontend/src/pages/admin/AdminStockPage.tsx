import { useEffect, useState } from "react"
import {
  Boxes,
  Package,
  AlertTriangle,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type {
  InventoryItem,
  InventoryStats,
  AdminCategory,
} from "@/types/admin"
import type { PaginationMeta } from "@/types/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export default function AdminStockPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)

  // Filtres
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [search, setSearch] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Produit sélectionné pour affichage du détail en modale
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null)

  const fetchStock = async () => {
    try {
      setLoading(true)
      const res = await adminService.getStock({
        category_id: selectedCategory === "all" ? undefined : selectedCategory,
        search: search.trim() || undefined,
        page: currentPage,
        per_page: 15,
      })
      setItems(res.inventory.data)
      setPagination(res.inventory.pagination)
      setStats(res.stats)
      if (res.categories && res.categories.length > 0) {
        setCategories(res.categories)
      }
    } catch {
      toast.error("Chargement impossible", {
        description: "Erreur lors de la récupération des données de stock.",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStock()
  }, [currentPage, selectedCategory])

  // Débrouillage de la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchStock()
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. En-tête */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
          Gestion de stock
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Suivi des quantités, alertes de rupture et disponibilité par taille
        </p>
      </div>

      {/* 2. Cartes statistiques KPI au style exact du Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1 : Total des produits */}
        <Card className="border border-slate-200/80 bg-white rounded-xl shadow-2xs p-4 sm:p-5 transition-colors">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total des produits
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
              <Package className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            {loading && !stats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              (stats?.total_products ?? 0).toLocaleString("fr-FR")
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Produits référencés dans la boutique
          </p>
        </Card>

        {/* KPI 2 : Total des unités en stock */}
        <Card className="border border-slate-200/80 bg-white rounded-xl shadow-2xs p-4 sm:p-5 transition-colors">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total des unités en stock
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
              <Boxes className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            {loading && !stats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              (stats?.total_units ?? 0).toLocaleString("fr-FR")
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Pièces physiques disponibles immédiatement
          </p>
        </Card>

        {/* KPI 3 : Tailles en rupture */}
        <Card className="border border-slate-200/80 bg-white rounded-xl shadow-2xs p-4 sm:p-5 transition-colors">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tailles en rupture (stock = 0)
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            {loading && !stats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <span className={(stats?.out_of_stock_count ?? 0) > 0 ? "text-rose-600" : "text-slate-900"}>
                {(stats?.out_of_stock_count ?? 0).toLocaleString("fr-FR")}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Variantes nécessitant un réapprovisionnement
          </p>
        </Card>
      </div>

      {/* 3. Filtre par catégorie et recherche par nom */}
      <Card className="border border-slate-200/80 shadow-2xs rounded-xl bg-white p-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Recherche */}
          <div className="relative flex-1 max-w-md">
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs focus-within:bg-white focus-within:border-slate-300 transition-colors">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom de vêtement..."
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

          {/* Sélecteur de catégorie */}
          <div className="w-full sm:w-64">
            <Select
              value={selectedCategory}
              onValueChange={(val) => {
                setSelectedCategory(val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200 text-slate-800 rounded-lg shadow-2xs">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Toutes les catégories
                </SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)} className="text-xs">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* 4. Tableau des produits */}
      <Card className="border border-slate-200/80 shadow-2xs rounded-xl bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase font-bold text-slate-400 hover:bg-slate-50/70">
              <TableHead className="py-3 px-4 font-bold text-slate-500 w-72">PRODUIT</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-500">CATÉGORIE</TableHead>
              <TableHead className="py-3 px-4 font-bold text-slate-500">STOCK PAR TAILLE</TableHead>
              <TableHead className="py-3 px-4 text-right font-bold text-slate-500">TOTAL PRODUIT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs divide-y divide-slate-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="py-3 px-4"><Skeleton className="h-6 w-48 rounded-md" /></TableCell>
                  <TableCell className="py-3 px-4 text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : items.length > 0 ? (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => setSelectedProduct(item)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                >
                  {/* Produit : Miniature + Nom */}
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.thumbnail_url || item.image_url ? (
                          <img
                            src={item.thumbnail_url || item.image_url || ""}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate group-hover:text-[#C9A227] transition-colors">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Eye className="w-3 h-3 text-slate-400" />
                          Cliquer pour voir le détail
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Catégorie */}
                  <TableCell className="py-3 px-4 text-slate-600 font-medium">
                    {item.category_name || "—"}
                  </TableCell>

                  {/* Stock par taille */}
                  <TableCell className="py-3 px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.variants && item.variants.length > 0 ? (
                        item.variants.map((v) => {
                          const isInStock = v.stock > 0
                          return (
                            <span
                              key={v.id}
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
                                isInStock
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {v.size} : {v.stock}
                            </span>
                          )
                        })
                      ) : (
                        <span className="text-slate-400 text-xs italic">Aucune variante</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Total produit */}
                  <TableCell className="py-3 px-4 text-right">
                    <span
                      className={`inline-block font-extrabold text-sm ${
                        item.total_stock > 0 ? "text-slate-900" : "text-rose-600"
                      }`}
                    >
                      {item.total_stock} {item.total_stock > 1 ? "unités" : "unité"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Boxes className="w-8 h-8 mb-2 stroke-1 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">
                      Aucun produit trouvé
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Essayez de modifier votre recherche ou le filtre de catégorie.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* 5. Pagination */}
        {pagination && pagination.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Page {pagination.current_page} sur {pagination.last_page} ({pagination.total} produits)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1 || loading}
                className="h-8 text-xs bg-white text-slate-700 border-slate-200"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, pagination.last_page))}
                disabled={currentPage >= pagination.last_page || loading}
                className="h-8 text-xs bg-white text-slate-700 border-slate-200"
              >
                Suivant
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 6. Modale de détail du stock d'un produit (lecture seule) */}
      <Dialog
        open={Boolean(selectedProduct)}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null)
        }}
      >
        <DialogContent className="max-w-lg p-0 overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-xl">
          {selectedProduct && (
            <div>
              {/* Header de la modale */}
              <DialogHeader className="p-5 pb-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-start gap-4 pr-6">
                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                    {selectedProduct.thumbnail_url || selectedProduct.image_url ? (
                      <img
                        src={selectedProduct.thumbnail_url || selectedProduct.image_url || ""}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-base font-extrabold text-slate-900 leading-snug truncate">
                      {selectedProduct.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedProduct.category_name || "Catégorie non définie"}</span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Contenu : Tableau des variantes (Taille, Couleur, Stock actuel) */}
              <div className="p-5 space-y-4">
                <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                        <TableHead className="py-2.5 px-3">Taille</TableHead>
                        <TableHead className="py-2.5 px-3">Couleur</TableHead>
                        <TableHead className="py-2.5 px-3 text-right">Stock actuel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs divide-y divide-slate-100">
                      {selectedProduct.variants && selectedProduct.variants.length > 0 ? (
                        selectedProduct.variants.map((v) => {
                          const isInStock = v.stock > 0
                          return (
                            <TableRow key={v.id} className="hover:bg-slate-50/50">
                              <TableCell className="py-2.5 px-3 font-bold text-slate-900">
                                {v.size}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-slate-600">
                                {v.color || "Standard"}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-right">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold ${
                                    isInStock
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}
                                >
                                  {v.stock} {v.stock > 1 ? "unités" : "unité"}
                                </span>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="py-4 text-center text-slate-400 italic">
                            Aucune variante disponible
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Total produit en bas du tableau */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Total disponible pour ce vêtement
                  </span>
                  <span
                    className={`text-base font-extrabold ${
                      selectedProduct.total_stock > 0 ? "text-slate-900" : "text-rose-600"
                    }`}
                  >
                    {selectedProduct.total_stock} {selectedProduct.total_stock > 1 ? "unités" : "unité"}
                  </span>
                </div>
              </div>

              {/* Footer avec bouton Fermer uniquement (lecture seule) */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedProduct(null)}
                  className="h-9 px-4 text-xs font-semibold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs cursor-pointer"
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
