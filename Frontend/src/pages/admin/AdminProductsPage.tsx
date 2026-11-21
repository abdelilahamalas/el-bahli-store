import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  Power,
  Package,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminProduct, AdminCategory } from "@/types/admin"
import type { PaginationMeta } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

export default function AdminProductsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlSearch = searchParams.get("search") || ""

  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState(urlSearch)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const q = searchParams.get("search") || ""
    if (q !== search) {
      setSearch(q)
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
      toast.success(
        res.is_active
          ? `Le produit « ${product.name} » est maintenant en ligne.`
          : `Le produit « ${product.name} » a été désactivé.`
      )
    } catch {
      toast.error("Impossible de modifier la visibilité du produit.")
    }
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return
    try {
      setIsDeleting(true)
      await adminService.deleteProduct(productToDelete.id)
      toast.success(`Le produit « ${productToDelete.name} » a été supprimé.`)
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
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatPrice = (p: string | number) => {
    const val = typeof p === "string" ? parseFloat(p) : p
    return `${val.toLocaleString("fr-FR", { minimumFractionDigits: 0 })} MAD`
  }

  // Stock status indicator using shadcn Progress component
  const renderStockIndicator = (totalStock: number) => {
    if (totalStock === 0) {
      return (
        <div className="flex flex-col gap-1 w-28">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-600">
            <span>0 unité</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Rupture</span>
          </div>
          <Progress value={100} indicatorClassName="bg-rose-600" className="h-1.5 bg-rose-100" />
        </div>
      )
    }

    if (totalStock <= 5) {
      return (
        <div className="flex flex-col gap-1 w-28">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-600">
            <span>{totalStock} unités</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Faible</span>
          </div>
          <Progress value={(totalStock / 5) * 100} indicatorClassName="bg-amber-500" className="h-1.5 bg-amber-100" />
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-1 w-28">
        <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
          <span>{totalStock} unités</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Optimal</span>
        </div>
        <Progress value={Math.min(100, (totalStock / 30) * 100)} indicatorClassName="bg-emerald-600" className="h-1.5 bg-emerald-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Produits</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Parcourez, filtrez et gérez le catalogue de vêtements de la boutique.
          </p>
        </div>

        <Button
          onClick={() => navigate("/admin/products/new")}
          className="bg-[#111111] hover:bg-[#252525] text-white text-xs font-semibold h-9 px-4 gap-2 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4 text-[#C9A227]" />
          Ajouter un produit
        </Button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-3.5 rounded-lg border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="pl-9 h-9 text-xs bg-muted/30 border-border focus:bg-white"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              setCurrentPage(1)
            }}
            className="h-9 px-3 text-xs bg-white border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value)
              setCurrentPage(1)
            }}
            className="h-9 px-3 text-xs bg-white border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs (En ligne)</option>
            <option value="inactive">Inactifs (Masqués)</option>
          </select>
        </div>
      </div>

      {/* Products Data Table */}
      <Card className="overflow-hidden border-border bg-white shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                <TableHead className="w-[300px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Produit</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Catégorie</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prix</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stock disponible</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Statut</TableHead>
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-md" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-36" />
                          <Skeleton className="h-2.5 w-24" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14 rounded" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded ml-auto" /></TableCell>
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
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Product Thumbnail & Name */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-border">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <Link
                              to={`/admin/products/${product.id}/edit`}
                              className="font-semibold text-foreground hover:text-[#C9A227] transition-colors truncate max-w-xs"
                            >
                              {product.name}
                            </Link>
                            <span className="text-[11px] text-muted-foreground truncate">
                              /{product.slug} · {product.sizes?.length || 0} variante(s)
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant="secondary"
                          className="bg-muted text-muted-foreground font-normal text-[11px] hover:bg-muted"
                        >
                          {product.category?.name || product.category_name || "Général"}
                        </Badge>
                      </TableCell>

                      {/* Price */}
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {formatPrice(product.promotional_price || product.price)}
                          </span>
                          {product.promotional_price && (
                            <span className="text-[10px] text-muted-foreground line-through">
                              {formatPrice(product.price)}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Stock Level Bar */}
                      <TableCell className="whitespace-nowrap">
                        {renderStockIndicator(product.total_stock)}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="whitespace-nowrap">
                        {product.is_active ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-medium gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Actif
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-slate-100 text-slate-600 border-slate-200 text-[11px] font-medium gap-1"
                          >
                            <XCircle className="w-3 h-3 text-slate-400" />
                            Masqué
                          </Badge>
                        )}
                      </TableCell>

                      {/* Row Actions */}
                      <TableCell className="text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs font-semibold">
                              Actions produit
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                              className="cursor-pointer text-xs"
                            >
                              <Edit className="w-3.5 h-3.5 mr-2" />
                              Modifier le produit
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="cursor-pointer text-xs">
                              <a
                                href={`/products/${product.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                Voir sur la boutique
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(product)}
                              className="cursor-pointer text-xs"
                            >
                              <Power className="w-3.5 h-3.5 mr-2" />
                              {product.is_active ? "Désactiver" : "Activer"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setProductToDelete(product)}
                              className="cursor-pointer text-xs text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Supprimer le produit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <Empty className="border-none py-4">
                    <EmptyMedia>
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>Aucun produit trouvé</EmptyTitle>
                    <EmptyDescription>
                      {search || selectedCategory !== "all" || selectedStatus !== "all"
                        ? "Essayez d'ajuster vos critères de recherche ou de filtrage."
                        : "Votre catalogue de vêtements est actuellement vide."}
                    </EmptyDescription>
                    <EmptyContent>
                      {search || selectedCategory !== "all" || selectedStatus !== "all" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearch("")
                            setSelectedCategory("all")
                            setSelectedStatus("all")
                          }}
                          className="text-xs"
                        >
                          Réinitialiser les filtres
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => navigate("/admin/products/new")}
                          className="text-xs bg-[#111111] text-white hover:bg-[#222]"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1 text-[#C9A227]" />
                          Créer le premier produit
                        </Button>
                      )}
                    </EmptyContent>
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
              Affichage de {pagination.from || 1} à {pagination.to || products.length} sur{" "}
              {pagination.total} produits
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

      {/* Delete Confirmation Dialog */}
      {productToDelete && (
        <AlertDialog
          open={!!productToDelete}
          onOpenChange={(open) => !open && setProductToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-5 h-5" />
                Supprimer le produit
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Êtes-vous sûr de vouloir supprimer définitivement le produit{" "}
                <strong className="text-foreground">« {productToDelete?.name} »</strong> ? Cette
                action est irréversible. Les variantes et images associées seront également retirées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} className="text-xs">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
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
