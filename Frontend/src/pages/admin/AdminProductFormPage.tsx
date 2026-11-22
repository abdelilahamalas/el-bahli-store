import { useEffect, useState, type FormEvent, type ChangeEvent } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Check,
  Star,
  RefreshCw,
  ImageIcon,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminProduct, AdminCategory, AdminProductImage } from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface VariantRow {
  id?: number
  size: string
  color: string
  stock: number
  is_active: boolean
}

export default function AdminProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const initialCatParam = searchParams.get("category_id")
  const isEditMode = Boolean(id)
  const navigate = useNavigate()

  // Base product fields
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState<number | "">(
    initialCatParam ? Number(initialCatParam) : ""
  )
  const [price, setPrice] = useState<string>("")
  const [promotionalPrice, setPromotionalPrice] = useState<string>("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)

  // Variants list
  const [variants, setVariants] = useState<VariantRow[]>([
    { size: "M", color: "Standard", stock: 10, is_active: true },
  ])

  // Images state
  const [existingImages, setExistingImages] = useState<AdminProductImage[]>([])
  const [selectedNewFiles, setSelectedNewFiles] = useState<File[]>([])
  const [filePreviews, setFilePreviews] = useState<string[]>([])
  const [selectedNewMainIndex, setSelectedNewMainIndex] = useState(0)

  // UI state
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImageActionLoading, setIsImageActionLoading] = useState(false)

  // Load categories
  useEffect(() => {
    adminService
      .getCategories()
      .then((cats) => setCategories(cats))
      .catch(() => toast.error("Impossible de charger les catégories."))
  }, [])

  // If edit mode, load product data
  useEffect(() => {
    if (!id) return

    const loadProduct = async () => {
      try {
        setIsLoading(true)
        const product: AdminProduct = await adminService.getProduct(id)
        setName(product.name)
        setCategoryId(product.category_id)
        setPrice(product.price)
        setPromotionalPrice(product.promotional_price || "")
        setDescription(product.description || "")
        setIsActive(product.is_active)
        setExistingImages(product.images || [])

        // Populate variants
        const loadedVariants = (product.sizes || product.variants || []).map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color || "Standard",
          stock: v.stock,
          is_active: v.is_active,
        }))
        if (loadedVariants.length > 0) {
          setVariants(loadedVariants)
        }
      } catch {
        toast.error("Impossible de récupérer les détails du produit.")
        navigate("/admin/products")
      } finally {
        setIsLoading(false)
      }
    }

    loadProduct()
  }, [id, navigate])

  // Clean previews on unmount
  useEffect(() => {
    return () => {
      filePreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [filePreviews])

  // File selection handler (multiple images at once)
  const handleFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const files = Array.from(e.target.files)

    // Validation des formats et tailles
    const validFiles: File[] = []
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`Le fichier ${f.name} dépasse la limite de 5 Mo.`)
        continue
      }
      validFiles.push(f)
    }

    if (validFiles.length === 0) return

    setSelectedNewFiles((prev) => [...prev, ...validFiles])
    const newUrls = validFiles.map((f) => URL.createObjectURL(f))
    setFilePreviews((prev) => [...prev, ...newUrls])
    toast.success(`${validFiles.length} photo(s) ajoutée(s) à la sélection.`)
  }

  const removeSelectedFile = (index: number) => {
    URL.revokeObjectURL(filePreviews[index])
    setSelectedNewFiles((prev) => prev.filter((_, i) => i !== index))
    setFilePreviews((prev) => prev.filter((_, i) => i !== index))
    if (selectedNewMainIndex === index) {
      setSelectedNewMainIndex(0)
    } else if (selectedNewMainIndex > index) {
      setSelectedNewMainIndex((prev) => prev - 1)
    }
  }

  // Upload pending new images immediately in edit mode
  const handleUploadPendingFiles = async () => {
    if (!id || selectedNewFiles.length === 0) return
    setIsImageActionLoading(true)
    try {
      const updatedProduct = await adminService.uploadProductImages(id, selectedNewFiles)
      if (updatedProduct?.images) {
        setExistingImages(updatedProduct.images)
      }
      // Clear previews
      filePreviews.forEach((url) => URL.revokeObjectURL(url))
      setSelectedNewFiles([])
      setFilePreviews([])
      toast.success("Photos ajoutées à la galerie avec succès.")
    } catch (err: unknown) {
      let msg = "Erreur lors du téléchargement des images."
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { message?: string } } }
        if (axErr.response?.data?.message) {
          msg = axErr.response.data.message
        }
      }
      toast.error(msg)
    } finally {
      setIsImageActionLoading(false)
    }
  }

  // Set designated existing image as main
  const handleSetMainImage = async (imageId: number) => {
    if (!id) return
    setIsImageActionLoading(true)
    try {
      const updatedProduct = await adminService.setMainProductImage(id, imageId)
      if (updatedProduct?.images) {
        setExistingImages(updatedProduct.images)
      } else {
        setExistingImages((prev) =>
          prev.map((img) => ({ ...img, is_main: img.id === imageId }))
        )
      }
      toast.success("Image principale définie avec succès.")
    } catch {
      toast.error("Impossible de modifier l'image principale.")
    } finally {
      setIsImageActionLoading(false)
    }
  }

  // Delete an existing image
  const handleDeleteExistingImage = async (imageId: number) => {
    if (!id) return
    setIsImageActionLoading(true)
    try {
      const updatedProduct = await adminService.deleteProductImage(id, imageId)
      if (updatedProduct?.images) {
        setExistingImages(updatedProduct.images)
      } else {
        setExistingImages((prev) => prev.filter((img) => img.id !== imageId))
      }
      toast.success("Image retirée de la galerie.")
    } catch {
      toast.error("Impossible de supprimer cette photo.")
    } finally {
      setIsImageActionLoading(false)
    }
  }

  // Variants handlers
  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      { size: "L", color: "Standard", stock: 10, is_active: true },
    ])
  }

  // Contextual size suggestions based on selected category
  const getQuickSizes = (): { sizes: string[]; label: string } => {
    const selectedCat = categories.find((c) => c.id === categoryId)
    const catName = selectedCat?.name?.toLowerCase() || ""

    // RÈGLE MÉTIER STRICTE : Les tailles numériques s'appliquent UNIQUEMENT aux Jeans
    if (catName.includes("jean")) {
      return {
        sizes: ["30", "31", "32", "33", "34", "35", "36", "38", "40", "42", "44", "46"],
        label: "Tailles Jeans numériques (30-46)",
      }
    }
    // Chaussures → pointures
    if (catName.includes("chaussur")) {
      return {
        sizes: ["39", "40", "41", "42", "43", "44", "45"],
        label: "Pointures (39-45)",
      }
    }
    // Casquettes → taille unique
    if (catName.includes("casquette")) {
      return {
        sizes: ["Taille unique"],
        label: "Taille unique",
      }
    }
    // Pantalons classe, hauts, vestes, ensembles, sweat-shirts, polos, t-shirts → tailles standards
    return {
      sizes: ["S", "M", "L", "XL", "XXL"],
      label: "Tailles standards (S-XXL)",
    }
  }

  const handleQuickAddSizes = () => {
    const { sizes, label } = getQuickSizes()
    const newVariants: VariantRow[] = sizes.map((sz) => ({
      size: sz,
      color: "Standard",
      stock: 10,
      is_active: true,
    }))
    setVariants(newVariants)
    toast.info(`${label} configurées.`)
  }

  const handleUpdateVariant = (
    index: number,
    field: keyof VariantRow,
    value: string | number | boolean
  ) => {
    setVariants((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) {
      toast.warning("Le produit doit avoir au moins une variante ou taille.")
      return
    }
    setVariants((prev) => prev.filter((_, i) => i !== index))
  }

  // Form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Veuillez renseigner le nom du vêtement.")
      return
    }
    if (!categoryId) {
      toast.error("Veuillez sélectionner une catégorie.")
      return
    }
    if (!price || parseFloat(price) <= 0) {
      toast.error("Veuillez indiquer un prix valide.")
      return
    }
    if (variants.length === 0) {
      toast.error("Veuillez configurer au moins une variante / taille.")
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditMode && id) {
        // Update product details and variants
        await adminService.updateProduct(id, {
          name: name.trim(),
          category_id: Number(categoryId),
          price: parseFloat(price),
          promotional_price: promotionalPrice ? parseFloat(promotionalPrice) : null,
          description: description.trim() || null,
          is_active: isActive,
          sizes: variants.map((v) => ({
            size: v.size.trim(),
            color: v.color.trim() || "Standard",
            stock: Math.max(0, Number(v.stock)),
            is_active: v.is_active,
          })),
        })

        // If new images were selected during edit, upload them
        if (selectedNewFiles.length > 0) {
          await adminService.uploadProductImages(id, selectedNewFiles)
        }

        toast.success(`Le produit « ${name} » a été mis à jour avec succès.`)
        navigate("/admin/products")
      } else {
        // Create product via FormData
        const formData = new FormData()
        formData.append("name", name.trim())
        formData.append("category_id", String(categoryId))
        formData.append("price", String(parseFloat(price)))
        if (promotionalPrice) {
          formData.append("promotional_price", String(parseFloat(promotionalPrice)))
        }
        if (description.trim()) {
          formData.append("description", description.trim())
        }
        formData.append("is_active", isActive ? "1" : "0")

        // Variants
        variants.forEach((v, index) => {
          formData.append(`sizes[${index}][size]`, v.size.trim())
          formData.append(`sizes[${index}][color]`, v.color.trim() || "Standard")
          formData.append(`sizes[${index}][stock]`, String(Math.max(0, Number(v.stock))))
          formData.append(`sizes[${index}][is_active]`, v.is_active ? "1" : "0")
        })

        // Images handling
        if (selectedNewFiles.length > 0) {
          // Designated main image
          const mainFile = selectedNewFiles[selectedNewMainIndex] || selectedNewFiles[0]
          formData.append("image", mainFile)

          // Other images
          selectedNewFiles.forEach((file, idx) => {
            if (idx !== selectedNewMainIndex) {
              formData.append("images[]", file)
            }
          })
        }

        await adminService.createProduct(formData)
        toast.success(`Le produit « ${name} » a été créé avec succès.`)
        navigate("/admin/products")
      }
    } catch (err: unknown) {
      let msg = "Une erreur est survenue lors de l'enregistrement."
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
        if (axErr.response?.data?.errors) {
          const firstErrKey = Object.keys(axErr.response.data.errors)[0]
          msg = axErr.response.data.errors[firstErrKey][0]
        } else if (axErr.response?.data?.message) {
          msg = axErr.response.data.message
        }
      }
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-muted-foreground">Chargement des données du produit...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-12">
      {/* Top Bar with Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin/products")}
            className="h-9 w-9 border-border hover:bg-muted"
            title="Retour à la liste"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {isEditMode ? `Modifier le produit` : "Créer un nouveau produit"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEditMode
                ? `Réf : #${id} — Gestion des informations, prix, photos et stocks.`
                : "Remplissez les informations et ajoutez des photos pour publier un article."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/products")}
            disabled={isSubmitting}
            className="text-xs h-9 px-3.5 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            Annuler
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || isImageActionLoading}
            className="text-xs h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                Enregistrement...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-white" />
                {isEditMode ? "Mettre à jour" : "Publier le produit"}
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Details & Variants */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Information Card */}
          <Card className="border-border bg-white shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-foreground">
                Informations générales
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Nom, catégorie et tarification officielle en dirhams.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">
                  Nom du produit <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Jean slim noir"
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Category & Visibility Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold">
                    Catégorie <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={categoryId ? String(categoryId) : ""}
                    onValueChange={(val) => setCategoryId(Number(val))}
                    required
                  >
                    <SelectTrigger id="category" className="h-9 text-xs">
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)} className="text-xs">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-xs font-semibold">
                    Statut de publication
                  </Label>
                  <Select
                    value={isActive ? "1" : "0"}
                    onValueChange={(val) => setIsActive(val === "1")}
                  >
                    <SelectTrigger id="status" className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="text-xs">Actif (Visible en boutique)</SelectItem>
                      <SelectItem value="0" className="text-xs">Masqué (Brouillon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Prices Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="price" className="text-xs font-semibold">
                    Prix régulier (MAD) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Ex. 250"
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="promotional_price" className="text-xs font-semibold">
                    Prix promotionnel (MAD){" "}
                    <span className="text-muted-foreground font-normal">(Optionnel)</span>
                  </Label>
                  <Input
                    id="promotional_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={promotionalPrice}
                    onChange={(e) => setPromotionalPrice(e.target.value)}
                    placeholder="Ex. 199"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold">
                  Description du produit
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Détails de coupe, matière (coton lourd, molleton), conseils d'entretien..."
                  rows={4}
                  className="text-xs resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Variants & Stocks Card */}
          <Card className="border-border bg-white shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Variantes, Tailles et Stocks
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Définissez chaque combinaison de taille, couleur et stock disponible.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleQuickAddSizes}
                  className="h-8 text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
                >
                  {getQuickSizes().label}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddVariant}
                  className="h-8 text-xs bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-lg gap-1 shadow-2xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-700" />
                  Ajouter une ligne
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Puces de sélection individuelle rapide selon la catégorie */}
              <div className="flex flex-wrap items-center gap-1.5 pb-3">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                  Tailles disponibles :
                </span>
                {getQuickSizes().sizes.map((sz) => {
                  const alreadyAdded = variants.some((v) => v.size === sz)
                  return (
                    <Button
                      key={`quick-sz-${sz}`}
                      type="button"
                      variant={alreadyAdded ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (alreadyAdded) {
                          if (variants.length > 1) {
                            setVariants((prev) => prev.filter((v) => v.size !== sz))
                          } else {
                            toast.warning("Conservez au moins une taille pour ce produit.")
                          }
                        } else {
                          setVariants((prev) => [
                            ...prev,
                            { size: sz, color: "Standard", stock: 10, is_active: true },
                          ])
                        }
                      }}
                      className={`h-7 px-2.5 text-xs font-bold rounded-lg transition-colors ${
                        alreadyAdded
                          ? "bg-slate-900 text-white hover:bg-slate-800 shadow-2xs"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
                      }`}
                    >
                      {sz} {alreadyAdded ? "✓" : "+"}
                    </Button>
                  )
                })}
              </div>

              <div className="overflow-x-auto border border-border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-b border-border hover:bg-muted/50">
                      <TableHead className="py-2.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground">Taille</TableHead>
                      <TableHead className="py-2.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground">Couleur / Modèle</TableHead>
                      <TableHead className="py-2.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground">Stock initial</TableHead>
                      <TableHead className="py-2.5 px-3 text-[10px] font-semibold uppercase text-muted-foreground">Actif</TableHead>
                      <TableHead className="py-2.5 px-3 text-right text-[10px] font-semibold uppercase text-muted-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((v, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/20">
                        {/* Size */}
                        <TableCell className="py-2 px-3">
                          <Input
                            value={v.size}
                            onChange={(e) => handleUpdateVariant(idx, "size", e.target.value)}
                            placeholder="Ex. M"
                            className="h-8 text-xs w-24"
                            required
                          />
                        </TableCell>

                        {/* Color */}
                        <TableCell className="py-2 px-3">
                          <Input
                            value={v.color}
                            onChange={(e) => handleUpdateVariant(idx, "color", e.target.value)}
                            placeholder="Ex. Noir"
                            className="h-8 text-xs w-32"
                          />
                        </TableCell>

                        {/* Stock */}
                        <TableCell className="py-2 px-3">
                          <Input
                            type="number"
                            min="0"
                            value={v.stock}
                            onChange={(e) =>
                              handleUpdateVariant(idx, "stock", parseInt(e.target.value) || 0)
                            }
                            className="h-8 text-xs w-24"
                            required
                          />
                        </TableCell>

                        {/* Active toggle */}
                        <TableCell className="py-2 px-3">
                          <Checkbox
                            checked={v.is_active}
                            onCheckedChange={(checked) =>
                              handleUpdateVariant(idx, "is_active", checked === true)
                            }
                          />
                        </TableCell>

                        {/* Delete */}
                        <TableCell className="py-2 px-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveVariant(idx)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 col): Photos & Images Management */}
        <div className="space-y-6">
          <Card className="border-border bg-white shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#C9A227]" />
                  Gestion des photos
                </CardTitle>
                {isImageActionLoading && (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#C9A227]" />
                )}
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Ajoutez plusieurs photos et définissez l'image principale visible en boutique.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Dropzone Button */}
              <div className="border-2 border-dashed border-border rounded-lg p-5 text-center hover:border-[#C9A227] transition-colors bg-muted/20 relative">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleFilesChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center pointer-events-none">
                  <div className="w-9 h-9 rounded-full bg-[#FAF5E6] text-[#C9A227] flex items-center justify-center mb-2">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    Sélectionner une ou plusieurs photos
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    JPG, PNG ou WebP (max 5 Mo chacune)
                  </span>
                </div>
              </div>

              {/* New Selected Files Previews */}
              {selectedNewFiles.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Nouvelles photos ({selectedNewFiles.length})
                    </span>
                    {isEditMode && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleUploadPendingFiles}
                        disabled={isImageActionLoading}
                        className="h-7 text-xs bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs font-semibold"
                      >
                        Enregistrer ces photos
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {filePreviews.map((previewUrl, idx) => {
                      const isDesignatedMain = idx === selectedNewMainIndex && !isEditMode
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-border overflow-hidden bg-neutral-50 flex flex-col justify-between"
                        >
                          <div className="relative aspect-square w-full overflow-hidden bg-muted">
                            <img
                              src={previewUrl}
                              alt="Nouvelle sélection"
                              className="w-full h-full object-cover"
                            />
                            {isDesignatedMain && (
                              <Badge className="absolute top-1.5 left-1.5 bg-slate-900 text-white font-bold text-[9px] px-1.5 py-0.5 shadow-xs">
                                Principale
                              </Badge>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSelectedFile(idx)}
                              className="absolute top-1.5 right-1.5 h-6 w-6 bg-black/70 text-white rounded-md hover:bg-rose-600"
                              title="Retirer ce fichier"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>

                          {!isEditMode && !isDesignatedMain && (
                            <div className="p-1.5 bg-white border-t border-border">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedNewMainIndex(idx)}
                                className="w-full h-6 text-[10px] px-1 font-medium border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                              >
                                Définir comme principale
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Existing Images in Edit Mode */}
              {isEditMode && (
                <div className="space-y-2.5 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Photos enregistrées ({existingImages.length})
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      En ligne
                    </span>
                  </div>

                  {existingImages.length === 0 ? (
                    <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-border text-center text-xs text-muted-foreground">
                      Aucune image dans la galerie. Ajoutez-en ci-dessus.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      {existingImages.map((img) => (
                        <div
                          key={img.id}
                          className="rounded-lg border border-border overflow-hidden bg-neutral-50 flex flex-col justify-between"
                        >
                          <div className="relative aspect-square w-full overflow-hidden bg-muted">
                            <img
                              src={img.image_url}
                              alt="Photo produit"
                              className="w-full h-full object-cover"
                            />

                            {img.is_main && (
                              <Badge className="absolute top-1.5 left-1.5 bg-slate-900 text-white font-bold text-[9px] px-1.5 py-0.5 shadow-xs flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-white text-white" />
                                Principale
                              </Badge>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteExistingImage(img.id)}
                              disabled={isImageActionLoading}
                              className="absolute top-1.5 right-1.5 h-6 w-6 bg-black/70 text-white rounded-md hover:bg-rose-600 disabled:opacity-50"
                              title="Supprimer cette photo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>

                          {!img.is_main && (
                            <div className="p-1.5 bg-white border-t border-border">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetMainImage(img.id)}
                                disabled={isImageActionLoading}
                                className="w-full h-6 text-[10px] px-1 font-medium border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                              >
                                Définir comme principale
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
