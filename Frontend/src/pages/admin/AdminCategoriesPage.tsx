import { useEffect, useState, type ChangeEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  Upload,
  ArrowRight,
  Loader2,
  Trash2,
  Search,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminCategory } from "@/types/admin"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
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
  Empty,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
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
  }

  const handleStartEdit = (cat: AdminCategory) => {
    setEditingCategory(cat)
    setNameInput(cat.name)
    setIsActiveInput(cat.is_active)
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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Page Header (Exactement comme dans la maquette de référence) */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Catégories
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {categories.length} catégories · {activeCount} actives. Une catégorie désactivée
          n'apparaît plus dans la boutique.
        </p>
      </div>

      {/* 2. Grille à 2 colonnes : Tableau à gauche, Formulaire à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonne Gauche : Tableau des catégories (7 colonnes sur lg) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Barre de recherche catégorie */}
          <InputGroup className="w-full">
            <InputGroupAddon>
              <Search className="w-4 h-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une catégorie..."
              aria-label="Rechercher une catégorie"
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

          <div className="bg-white rounded-2xl border border-border/70 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow className="border-b border-border/60 hover:bg-transparent">
                  <TableHead className="text-muted-foreground uppercase text-[10px] font-semibold">Nom</TableHead>
                  <TableHead className="text-muted-foreground uppercase text-[10px] font-semibold">Produits</TableHead>
                  <TableHead className="text-muted-foreground uppercase text-[10px] font-semibold">Statut</TableHead>
                  <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                    <TableCell colSpan={4} className="py-8 text-center">
                      <Empty className="border-none py-4">
                        <EmptyTitle>
                          {searchQuery.trim() ? "Aucun résultat trouvé" : "Aucune catégorie"}
                        </EmptyTitle>
                        <EmptyDescription>
                          {searchQuery.trim()
                            ? `Aucune catégorie ne correspond à « ${searchQuery} ».`
                            : "Créez votre première catégorie à l'aide du formulaire ci-contre."}
                        </EmptyDescription>
                      </Empty>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedCategories.map((cat) => (
                    <TableRow
                      key={cat.id}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      {/* Nom */}
                      <TableCell className="py-3 px-4 font-semibold text-foreground">
                        {cat.name}
                      </TableCell>

                      {/* Produits rattachés */}
                      <TableCell className="py-3 px-4 text-muted-foreground">
                        {cat.products_count !== undefined
                          ? `${cat.products_count} produits`
                          : "Catalogue"}
                      </TableCell>

                      {/* Statut avec Switch shadcn/ui */}
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={cat.is_active}
                            onCheckedChange={() => handleToggle(cat)}
                            aria-label={`Activer ou désactiver ${cat.name}`}
                          />
                          <span
                            className={
                              cat.is_active ? "text-foreground font-semibold text-xs" : "text-muted-foreground text-xs"
                            }
                          >
                            {cat.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(cat)}
                            className="text-xs font-semibold text-foreground hover:text-[#C9A227] px-2 h-7"
                          >
                            Modifier
                          </Button>

                          <Link
                            to={`/admin/products?category_id=${cat.id}`}
                            className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5 px-2 py-1 rounded hover:bg-muted/60 transition-colors"
                          >
                            <span>Produits</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingCategory(cat)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

        {/* Colonne Droite : Formulaire d'ajout / modification (5 colonnes sur lg - Exactement comme dans la maquette) */}
        <div className="lg:col-span-5">
          <Card className="border-border/70 bg-white rounded-2xl shadow-2xs p-6 space-y-5">
            <CardHeader className="p-0 pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-foreground">
                  {editingCategory ? "Modifier la catégorie" : "Ajouter une catégorie"}
                </CardTitle>
                {editingCategory && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleStartCreate}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground h-7"
                  >
                    Annuler
                  </Button>
                )}
              </div>
            </CardHeader>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              {/* Nom de la catégorie */}
              <div className="space-y-1.5">
                <Label htmlFor="catName" className="text-xs font-semibold text-foreground">
                  Nom de la catégorie
                </Label>
                <Input
                  id="catName"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Ex. : Chemises"
                  required
                  className="h-10 text-xs bg-white border-border rounded-xl focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]"
                />
              </div>

              {/* Adresse dans la boutique */}
              <div className="space-y-1.5">
                <Label htmlFor="catSlug" className="text-xs font-semibold text-foreground">
                  Adresse dans la boutique
                </Label>
                <Input
                  id="catSlug"
                  value={slugPreview}
                  disabled
                  className="h-10 text-xs bg-muted/40 border-border rounded-xl text-muted-foreground font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Générée automatiquement à partir du nom.
                </p>
              </div>

              {/* Image de la catégorie (Dropzone conforme à la maquette) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Image de la catégorie
                </Label>
                <div className="border border-dashed border-border rounded-xl p-6 text-center bg-muted/20 hover:border-[#C9A227] transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files && e.target.files[0]) {
                        toast.info("Image prête pour l'enregistrement.")
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center pointer-events-none space-y-1.5">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">
                      Glissez une image ici ou cliquez
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggle Afficher dans la boutique avec Switch shadcn/ui */}
              <div className="pt-2 flex items-center justify-between border-t border-border/50">
                <div>
                  <p className="text-xs font-bold text-foreground">Afficher dans la boutique</p>
                  <p className="text-[11px] text-muted-foreground">
                    Visible par les clients dès l'enregistrement.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isActiveInput}
                    onCheckedChange={setIsActiveInput}
                    aria-label="Afficher dans la boutique"
                  />
                  <span className="text-xs font-medium text-foreground">
                    {isActiveInput ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Bouton Enregistrer (Bouton doré plein arrondi) */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-[#C9A227] hover:bg-[#B38F1E] text-[#111111] font-bold text-xs rounded-xl shadow-xs transition-colors mt-2 flex items-center justify-center gap-2 cursor-pointer border-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <span>
                    {editingCategory ? "Mettre à jour la catégorie" : "Enregistrer la catégorie"}
                  </span>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* AlertDialog pour confirmation de suppression */}
      {deletingCategory && (
        <AlertDialog
          open={Boolean(deletingCategory)}
          onOpenChange={(open) => !open && setDeletingCategory(null)}
        >
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer la catégorie ?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs leading-relaxed">
                Êtes-vous sûr de vouloir supprimer la catégorie « {deletingCategory?.name} » ? Les
                vêtements associés ne seront pas supprimés mais n'auront plus de catégorie rattachée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel
                onClick={() => setDeletingCategory(null)}
                className="rounded-xl text-xs h-9"
              >
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-9"
              >
                {isDeleting ? "Suppression..." : "Confirmer la suppression"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
