import { useEffect, useState } from "react"
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  Power,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminCategory } from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null)
  const [nameInput, setNameInput] = useState("")
  const [sortOrderInput, setSortOrderInput] = useState<number>(1)
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

  const handleOpenCreate = () => {
    setEditingCategory(null)
    setNameInput("")
    setSortOrderInput(categories.length + 1)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (cat: AdminCategory) => {
    setEditingCategory(cat)
    setNameInput(cat.name)
    setSortOrderInput(cat.sort_order)
    setIsDialogOpen(true)
  }

  const handleSaveCategory = async () => {
    if (!nameInput.trim()) {
      toast.error("Veuillez renseigner le nom de la catégorie.")
      return
    }

    setIsSubmitting(true)
    try {
      if (editingCategory) {
        await adminService.updateCategory(editingCategory.id, {
          name: nameInput.trim(),
          sort_order: sortOrderInput,
        })
        toast.success(`La catégorie « ${nameInput} » a été modifiée.`)
      } else {
        await adminService.createCategory({
          name: nameInput.trim(),
          sort_order: sortOrderInput,
          is_active: true,
        })
        toast.success(`La catégorie « ${nameInput} » a été créée avec succès.`)
      }
      setIsDialogOpen(false)
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
          ? `La catégorie « ${cat.name} » est activée.`
          : `La catégorie « ${cat.name} » est masquée.`
      )
    } catch {
      toast.error("Impossible de modifier le statut de la catégorie.")
    }
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

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Catégories</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organisation du catalogue des collections de vêtements pour hommes.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-[#111111] hover:bg-[#252525] text-white text-xs font-semibold h-9 px-4 gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4 text-[#C9A227]" />
          Nouvelle catégorie
        </Button>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-lg border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">Ordre</th>
                <th className="py-3 px-4">Nom de la catégorie</th>
                <th className="py-3 px-4">Identifiant (Slug)</th>
                <th className="py-3 px-4">Articles associés</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4 text-center"><Skeleton className="h-4 w-6 mx-auto" /></td>
                    <td className="py-3.5 px-4"><Skeleton className="h-4 w-36" /></td>
                    <td className="py-3.5 px-4"><Skeleton className="h-4 w-28" /></td>
                    <td className="py-3.5 px-4"><Skeleton className="h-5 w-16 rounded" /></td>
                    <td className="py-3.5 px-4"><Skeleton className="h-5 w-14 rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><Skeleton className="h-7 w-20 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : categories.length > 0 ? (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-muted-foreground">
                      {cat.sort_order}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-foreground">{cat.name}</span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      /{cat.slug}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="bg-muted text-muted-foreground font-normal text-[11px]">
                        {cat.products_count ?? 0} article(s)
                      </Badge>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {cat.is_active ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Visible
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-medium">
                          Masquée
                        </Badge>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggle(cat)}
                          title={cat.is_active ? "Masquer la catégorie" : "Rendre visible"}
                          className={`h-7 w-7 ${
                            cat.is_active ? "text-emerald-600 hover:bg-emerald-50" : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(cat)}
                          title="Modifier"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingCategory(cat)}
                          title="Supprimer"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <FolderTree className="w-9 h-9 text-muted-foreground/40 mb-2" />
                      <p className="font-semibold text-sm text-foreground">Aucune catégorie trouvée</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-[#C9A227]" />
              {editingCategory ? "Modifier la catégorie" : "Ajouter une catégorie"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Définissez le nom et la position d'affichage de la collection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="catName" className="text-xs font-semibold">
                Nom de la catégorie <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="catName"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Ex: Capuches zippé"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catSort" className="text-xs font-semibold">
                Ordre d'affichage
              </Label>
              <Input
                id="catSort"
                type="number"
                min="1"
                value={sortOrderInput}
                onChange={(e) => setSortOrderInput(parseInt(e.target.value) || 1)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsDialogOpen(false)}
              className="text-xs h-9"
            >
              Annuler
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={handleSaveCategory}
              className="bg-[#111111] hover:bg-[#252525] text-white text-xs font-semibold h-9 shadow-xs"
            >
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {deletingCategory && (
        <AlertDialog
          open={!!deletingCategory}
          onOpenChange={(open) => !open && setDeletingCategory(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-5 h-5" />
                Supprimer la catégorie
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Êtes-vous sûr de vouloir supprimer la catégorie{" "}
                <strong className="text-foreground">« {deletingCategory?.name} »</strong> ? Notez
                qu'une catégorie contenant des produits ne peut pas être supprimée.
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
