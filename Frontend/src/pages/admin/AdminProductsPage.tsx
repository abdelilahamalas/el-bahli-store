import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Power,
  Package,
  AlertCircle,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminProduct, AdminCategory } from "@/types/admin"
import type { PaginationMeta } from "@/types/api"
import { Button } from "@/components/ui/button"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function AdminProductsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlSearch = searchParams.get("search") || ""
  const urlCategory = searchParams.get("category_id") || searchParams.get("category") || "all"

  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState(urlSearch)
  const [selectedCategory, setSelectedCategory] = useState<string>(urlCategory)
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const q = searchParams.get("search") || ""
    const cat = searchParams.get("category_id") || searchParams.get("category") || "all"
    let changed = false
    if (q !== search) {
      setSearch(q)
      changed = true
    }
    if (cat !== selectedCategory) {
      setSelectedCategory(cat)
      changed = true
    }
    if (changed) {
      setCurrentPage(1)
    }
  }, [searchParams])

  // Product deletion dialog state
  const [productToDelete, setProductToDelete] = useState<AdminProduct | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load categories once
  useEffect(() => {
    adminService
      .getCategories()
      .then((res) => setCategories(res))
      .catch(() => {})
  }, [])

  // Load products when filters or page change
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params: Record<string, string | number | boolean> = {
        page: currentPage,
        per_page: 15,
      }
      if (search.trim()) params.search = search.trim()
      if (selectedCategory !== "all") params.category_id = selectedCategory
      if (selectedStatus === "active") params.is_active = true
      if (selectedStatus === "inactive") params.is_active = false

      const res = await adminService.getProducts(params)
      setProducts(res.products)
      setPagination(res.pagination)
    } catch {
      toast.error("Erreur lors de la récupération des produits.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [currentPage, selectedCategory, selectedStatus])

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchProducts()
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  const handleToggleActive = async (product: AdminProduct) => {
    try {
      const res = await adminService.toggleProduct(product.id)
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: res.is_active } : p))
      )
      toast.success("Visibilité mise à jour", {
        description: res.is_active
          ? `Le produit « ${product.name} » est maintenant visible en boutique.`
          : `Le produit « ${product.name} » a été masqué.`,
      })
    } catch {
      toast.error("Action impossible", {
        description: "Impossible de modifier la visibilité du produit.",
      })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return
    try {
      setIsDeleting(true)
      await adminService.deleteProduct(productToDelete.id)
      toast.success("Produit supprimé", {
        description: `Le produit « ${productToDelete.name} » a été supprimé de la boutique.`,
      })
      setProductToDelete(null)
      fetchProducts()
    } catch (err: unknown) {
      let msg = "Impossible de supprimer ce produit."
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { message?: string } } }
        if (axErr.response?.data?.message) {
          msg = axErr.response.data.message
        }
      }
      toast.error("Suppression impossible", {
        description: msg,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const formatPrice = (p: string | number) => {
    const val = typeof p === "string" ? parseFloat(p) : p
    return `${val.toLocaleString("fr-FR", { minimumFractionDigits: 0 })} MAD`
  }

  const renderStockBadge = (totalStock: number) => {
    if (totalStock === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          Rupture (0)
        </span>
      )
    }

    if (totalStock <= 5) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Faible ({totalStock})
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
        {totalStock} en stock
      </span>
    )
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Produits
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gérez le catalogue officiel de vêtements pour hommes.
          </p>
        </div>

        {/* White button standard */}
        <Button
          onClick={() => navigate("/admin/products/new")}
          className="h-9 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-slate-700" />
          <span>Ajouter un produit</span>
        </Button>
      </div>

      {/* Main Card containing Filters and Table */}
      <Card className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        {/* Top Filters Toolbar inside the Card */}
        <div className="p-3.5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs focus-within:bg-white focus-within:border-slate-300 transition-colors">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un produit..."
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

          {/* Category and Status Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={selectedCategory}
              onValueChange={(val) => {
                setSelectedCategory(val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-auto min-w-[170px] text-xs rounded-lg border-slate-200 bg-white">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="all" className="text-xs">Toutes les catégories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)} className="text-xs">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedStatus}
              onValueChange={(val) => {
                setSelectedStatus(val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-auto min-w-[140px] text-xs rounded-lg border-slate-200 bg-white">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="all" className="text-xs">Tous les statuts</SelectItem>
                <SelectItem value="active" className="text-xs">Actifs (En ligne)</SelectItem>
                <SelectItem value="inactive" className="text-xs">Inactifs (Masqués)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-400 hover:bg-slate-50/70">
                <TableHead className="py-3 px-4 font-bold text-slate-500">Produit</TableHead>
                <TableHead className="py-3 px-4 font-bold text-slate-500">Catégorie</TableHead>
                <TableHead className="py-3 px-4 font-bold text-slate-500">Prix</TableHead>
                <TableHead className="py-3 px-4 font-bold text-slate-500">Stock</TableHead>
                <TableHead className="py-3 px-4 font-bold text-slate-500">Statut</TableHead>
                <TableHead className="py-3 px-4 text-right font-bold text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-slate-100">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-32" />
                          <Skeleton className="h-2.5 w-24" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4"><Skeleton className="h-5 w-20 rounded-md" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell className="px-4 text-right"><Skeleton className="h-7 w-20 rounded-md ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : products.length > 0 ? (
                products.map((product) => {
                  const mainImage =
                    product.images.find((img) => img.is_main) || product.images[0]
                  const imageUrl = mainImage?.image_url

                  return (
                    <TableRow
                      key={product.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Product Thumbnail & Name */}
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 flex items-center justify-center">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <Link
                              to={`/admin/products/${product.id}/edit`}
                              className="font-bold text-slate-900 hover:text-slate-600 transition-colors truncate max-w-xs text-xs"
                            >
                              {product.name}
                            </Link>
                            <span className="text-[11px] text-slate-400 truncate">
                              /{product.slug} · {product.sizes?.length || 0} variante(s)
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Category Badge pill */}
                      <TableCell className="px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                          {product.category?.name || product.category_name || "Général"}
                        </span>
                      </TableCell>

                      {/* Price */}
                      <TableCell className="px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs">
                            {formatPrice(product.promotional_price || product.price)}
                          </span>
                          {product.promotional_price && (
                            <span className="text-[10px] text-slate-400 line-through">
                              {formatPrice(product.price)}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Stock Level */}
                      <TableCell className="px-4 whitespace-nowrap">
                        {renderStockBadge(product.total_stock)}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-4 whitespace-nowrap">
                        {product.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            Inactif
                          </span>
                        )}
                      </TableCell>

                      {/* Row Actions: Clean White Buttons */}
                      <TableCell className="px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Modifier button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                            className="h-7 px-2.5 rounded-md text-xs font-medium bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                            title="Modifier ce produit"
                          >
                            <Edit className="w-3 h-3 mr-1 text-slate-500" />
                            Modifier
                          </Button>

                          {/* Toggle Active button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(product)}
                            className={`h-7 px-2 rounded-md text-xs font-medium border-slate-200 cursor-pointer shadow-2xs ${
                              product.is_active
                                ? "bg-white text-slate-600 hover:bg-slate-50"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            }`}
                            title={product.is_active ? "Désactiver" : "Activer"}
                          >
                            <Power className="w-3 h-3 text-slate-500" />
                          </Button>

                          {/* Voir sur la boutique */}
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-7 px-2 rounded-md text-xs font-medium bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-2xs"
                            title="Voir sur la boutique"
                          >
                            <a
                              href={`/products/${product.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-3 h-3 text-slate-500" />
                            </a>
                          </Button>

                          {/* Supprimer button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setProductToDelete(product)}
                            className="h-7 px-2 rounded-md text-xs font-medium bg-white border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer shadow-2xs"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    Aucun produit trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Bottom Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-white">
          <span className="font-medium">
            Total : {pagination?.total ?? products.length} produit(s)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 px-3 rounded-lg border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={Boolean(pagination && currentPage >= pagination.last_page) || loading}
              onClick={() => setCurrentPage((p) => (pagination ? Math.min(pagination.last_page, p + 1) : p + 1))}
              className="h-8 px-3 rounded-lg border-slate-200 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              Suivant
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      {productToDelete && (
        <AlertDialog
          open={!!productToDelete}
          onOpenChange={(open) => !open && setProductToDelete(null)}
        >
          <AlertDialogContent className="rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600 text-sm font-bold">
                <AlertCircle className="w-4 h-4" />
                Supprimer le produit
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-500">
                Êtes-vous sûr de vouloir supprimer définitivement le produit{" "}
                <strong className="text-slate-900">« {productToDelete?.name} »</strong> ? Cette
                action est irréversible. Les variantes et images associées seront également retirées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} className="text-xs rounded-lg">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg"
              >
                {isDeleting ? "Suppression en cours..." : "Confirmer la suppression"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
