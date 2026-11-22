import { useEffect, useState, useRef, type ChangeEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  Upload,
  ArrowRight,
  Loader2,
  Trash2,
  Search,
  Plus,
  AlertCircle,
  X,
  Edit,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminCategory } from "@/types/admin"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminCategoriesPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const searchQuery = search
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Form state for creating/editing category
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null)
  const [nameInput, setNameInput] = useState("")
  const [isActiveInput, setIsActiveInput] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete dialog state
  const [deletingCategory, setDeletingCategory] = useState<AdminCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const res = await adminService.getCategories()
      setCategories(res)
    } catch {
      toast.error("Erreur lors de la récupération des catégories.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  // Auto-slug generator
  const slugPreview = nameInput.trim()
    ? `/categories/${nameInput
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`
    : "/categories/..."

  const handleStartCreate = () => {
    setEditingCategory(null)
    setNameInput("")
    setIsActiveInput(true)
    nameInputRef.current?.focus()
  }

  const handleStartEdit = (cat: AdminCategory) => {
    setEditingCategory(cat)
    setNameInput(cat.name)
    setIsActiveInput(cat.is_active)
    nameInputRef.current?.focus()
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) {
      toast.error("Veuillez renseigner le nom de la catégorie.")
      return
    }

    setIsSubmitting(true)
    try {
      if (editingCategory) {
        await adminService.updateCategory(editingCategory.id, {
          name: nameInput.trim(),
          is_active: isActiveInput,
        })
        toast.success(`La catégorie « ${nameInput} » a été modifiée.`)
      } else {
        await adminService.createCategory({
          name: nameInput.trim(),
          is_active: isActiveInput,
          sort_order: categories.length + 1,
        })
        toast.success(`La catégorie « ${nameInput} » a été créée avec succès.`)
      }
      handleStartCreate()
      fetchCategories()
    } catch (err: unknown) {
      let msg = "Une erreur est survenue lors de l'enregistrement."
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { message?: string } } }
        if (axErr.response?.data?.message) {
          msg = axErr.response.data.message
        }
      }
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggle = async (cat: AdminCategory) => {
    try {
      const res = await adminService.toggleCategory(cat.id)
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: res.is_active } : c))
      )
      toast.success(
        res.is_active
          ? `La catégorie « ${cat.name} » est maintenant active.`
          : `La catégorie « ${cat.name} » est masquée.`
      )
    } catch {
      toast.error("Impossible de modifier le statut de la catégorie.")
    }
  }

  const handleDeleteRequest = (cat: AdminCategory) => {
    if (cat.products_count && cat.products_count > 0) {
      toast.error(
        `Impossible de supprimer « ${cat.name} » : ${cat.products_count} produit(s) y sont rattachés.`
      )
      return
    }
    setDeletingCategory(cat)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return
    setIsDeleting(true)
    try {
      await adminService.deleteCategory(deletingCategory.id)
      toast.success(`La catégorie « ${deletingCategory.name} » a été supprimée.`)
      setDeletingCategory(null)
      fetchCategories()
    } catch (err: unknown) {
      let msg = "Impossible de supprimer cette catégorie."
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

  const activeCount = categories.filter((c) => c.is_active).length
  const displayedCategories = searchQuery.trim()
    ? categories.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
    : categories

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Catégories
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {categories.length} catégories · {activeCount} actives au catalogue.
          </p>
        </div>

        {/* White button standard */}
        <Button
          onClick={handleStartCreate}
          className="h-9 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-slate-700" />
          <span>Ajouter une catégorie</span>
        </Button>
      </div>

      {/* 2. Grille à 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Colonne Gauche : Tableau des catégories (7 colonnes) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Barre de recherche catégorie */}
          <div className="relative">
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs focus-within:border-slate-400 transition-colors shadow-2xs">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une catégorie..."
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

          <Card className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-400 hover:bg-slate-50/70">
                    <TableHead className="py-3 px-4 font-bold text-slate-500">Nom</TableHead>
                    <TableHead className="py-3 px-4 font-bold text-slate-500">Produits</TableHead>
                    <TableHead className="py-3 px-4 font-bold text-slate-500">Statut</TableHead>
                    <TableHead className="py-3 px-4 text-right font-bold text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs divide-y divide-slate-100">
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4} className="py-3.5 px-4">
                          <Skeleton className="h-5 w-full rounded" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : displayedCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-slate-400">
                        {searchQuery.trim()
                          ? `Aucune catégorie ne correspond à « ${searchQuery} ».`
                          : "Aucune catégorie enregistrée."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedCategories.map((cat) => (
                      <TableRow
                        key={cat.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Nom */}
                        <TableCell className="py-3 px-4 font-bold text-slate-900">
                          {cat.name}
                        </TableCell>

                        {/* Produits rattachés */}
                        <TableCell className="py-3 px-4 text-slate-600">
                          <span className="font-semibold text-slate-900">
                            {cat.products_count !== undefined ? cat.products_count : 0}
                          </span>{" "}
                          produit(s)
                        </TableCell>

                        {/* Statut avec Switch */}
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={cat.is_active}
                              onCheckedChange={() => handleToggle(cat)}
                              aria-label={`Activer ou désactiver ${cat.name}`}
                            />
                            <span
                              className={
                                cat.is_active
                                  ? "text-emerald-700 font-semibold text-xs"
                                  : "text-slate-400 text-xs"
                              }
                            >
                              {cat.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Actions : White buttons */}
                        <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartEdit(cat)}
                              className="h-7 px-2.5 rounded-md text-xs font-medium bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                            >
                              <Edit className="w-3 h-3 mr-1 text-slate-500" />
                              Modifier
                            </Button>

                            <Link
                              to={`/admin/products?category_id=${cat.id}`}
                              className="h-7 px-2.5 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 shadow-2xs transition-colors"
                            >
                              <span>Voir les produits</span>
                              <ArrowRight className="w-3 h-3 text-slate-500" />
                            </Link>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRequest(cat)}
                              className="h-7 px-2 rounded-md text-xs font-medium bg-white border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer shadow-2xs"
                              title="Supprimer la catégorie"
                            >
                              <Trash2 className="w-3 h-3 text-rose-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Colonne Droite : Formulaire d'ajout / modification (5 colonnes) */}
        <div className="lg:col-span-5">
          <Card className="border border-slate-200/80 bg-white rounded-xl shadow-2xs p-5 space-y-4">
            <CardHeader className="p-0 pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900">
                  {editingCategory ? "Modifier la catégorie" : "Ajouter une catégorie"}
                </CardTitle>
                {editingCategory && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleStartCreate}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900 h-7"
                  >
                    Annuler
                  </Button>
                )}
              </div>
            </CardHeader>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              {/* Nom de la catégorie */}
              <div className="space-y-1.5">
                <Label htmlFor="catName" className="text-xs font-semibold text-slate-800">
                  Nom de la catégorie
                </Label>
                <Input
                  id="catName"
                  ref={nameInputRef}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Ex. : Chemises"
                  required
                  className="h-9 text-xs bg-white border-slate-200 rounded-lg focus:border-slate-400 focus:ring-0"
                />
              </div>

              {/* Adresse dans la boutique */}
              <div className="space-y-1.5">
                <Label htmlFor="catSlug" className="text-xs font-semibold text-slate-800">
                  Adresse dans la boutique
                </Label>
                <Input
                  id="catSlug"
                  value={slugPreview}
                  disabled
                  className="h-9 text-xs bg-slate-50 border-slate-200 rounded-lg text-slate-500 font-mono"
                />
                <p className="text-[11px] text-slate-400">
                  Générée automatiquement à partir du nom.
                </p>
              </div>

              {/* Image de la catégorie */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Image de la catégorie (Optionnel)
                </Label>
                <div className="border border-dashed border-slate-200 rounded-lg p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files && e.target.files[0]) {
                        toast.info("Image sélectionnée.")
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center pointer-events-none space-y-1.5">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs mb-0.5">
                      <Upload className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-slate-700 font-medium">
                      Cliquez pour importer une image
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PNG, JPG ou WebP · 2 Mo max
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggle Afficher dans la boutique avec Switch */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-900">Afficher dans la boutique</p>
                  <p className="text-[11px] text-slate-400">
                    Visible par les clients
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isActiveInput}
                    onCheckedChange={setIsActiveInput}
                    aria-label="Afficher dans la boutique"
                  />
                </div>
              </div>

              {/* Bouton Enregistrer standard */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-9 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 font-semibold text-xs rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700" />
                    <span>Enregistrement en cours...</span>
                  </>
                ) : (
                  <span>
                    {editingCategory ? "Mettre à jour la catégorie" : "Créer la catégorie"}
                  </span>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingCategory && (
        <AlertDialog
          open={!!deletingCategory}
          onOpenChange={(open) => !open && setDeletingCategory(null)}
        >
          <AlertDialogContent className="rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600 text-sm font-bold">
                <AlertCircle className="w-4 h-4" />
                Supprimer la catégorie
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-500">
                Êtes-vous sûr de vouloir supprimer la catégorie{" "}
                <strong className="text-slate-900">« {deletingCategory?.name} »</strong> ?
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
