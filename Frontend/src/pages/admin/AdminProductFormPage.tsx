import { useEffect, useState, type FormEvent, type ChangeEvent } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Star,
  Check,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminProduct, AdminCategory, AdminProductImage } from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface VariantRow {
  id?: number
  size: string
  color: string
  stock: number
  is_active: boolean
}

export default function AdminProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()

  // Base product fields
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState<number | "">("")
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

  // UI state
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  // File selection handler
  const handleFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    setSelectedNewFiles((prev) => [...prev, ...files])

    const newUrls = files.map((f) => URL.createObjectURL(f))
    setFilePreviews((prev) => [...prev, ...newUrls])
  }

  const removeSelectedFile = (index: number) => {
    URL.revokeObjectURL(filePreviews[index])
    setSelectedNewFiles((prev) => prev.filter((_, i) => i !== index))
    setFilePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  // Existing image actions in edit mode
  const handleSetMainImage = async (imageId: number) => {
    if (!id) return
    try {
      await adminService.setMainProductImage(id, imageId)
      setExistingImages((prev) =>
        prev.map((img) => ({ ...img, is_main: img.id === imageId }))
      )
      toast.success("Image principale mise à jour.")
    } catch {
      toast.error("Impossible de changer l'image principale.")
    }
  }

  const handleDeleteExistingImage = async (imageId: number) => {
    if (!id) return
    try {
      await adminService.deleteProductImage(id, imageId)
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId))
      toast.success("Image supprimée.")
    } catch {
      toast.error("Impossible de supprimer cette image.")
    }
  }

  // Variants handlers
  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      { size: "L", color: "Standard", stock: 10, is_active: true },
    ])
  }

  const handleQuickAddSizes = () => {
    const standardSizes = ["S", "M", "L", "XL", "XXL"]
    const newVariants: VariantRow[] = standardSizes.map((sz) => ({
      size: sz,
      color: "Standard",
      stock: 10,
      is_active: true,
    }))
    setVariants(newVariants)
    toast.info("Tailles standards (S, M, L, XL, XXL) ajoutées.")
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
          const imgFormData = new FormData()
          selectedNewFiles.forEach((file) => {
            imgFormData.append("images[]", file)
          })
          await adminService.uploadProductImages(id, imgFormData)
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

        // Images
        if (selectedNewFiles.length > 0) {
          // First image as main image
          formData.append("image", selectedNewFiles[0])
          // Additional images
          selectedNewFiles.slice(1).forEach((file) => {
            formData.append("images[]", file)
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin/products")}
            className="h-9 w-9 border-border"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isEditMode ? "Modifier le produit" : "Ajouter un nouveau produit"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEditMode
                ? "Mettez à jour les caractéristiques, prix, variantes et photos."
                : "Renseignez les détails du produit pour l'ajouter à votre boutique."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/products")}
            className="text-xs h-9"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#111111] hover:bg-[#252525] text-white text-xs font-semibold h-9 px-5 shadow-xs"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
                Enregistrement...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#C9A227]" />
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
                  placeholder="Ex: Capuche Imprimé - Rose Pastel"
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
                  <select
                    id="category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    required
                    className="w-full h-9 px-3 text-xs bg-white border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
                  >
                    <option value="" disabled>
                      Sélectionner une catégorie
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-xs font-semibold">
                    Statut de publication
                  </Label>
                  <select
                    id="status"
                    value={isActive ? "1" : "0"}
                    onChange={(e) => setIsActive(e.target.value === "1")}
                    className="w-full h-9 px-3 text-xs bg-white border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
                  >
                    <option value="1">Actif (Visible en ligne)</option>
                    <option value="0">Masqué (Brouillon)</option>
                  </select>
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
                    placeholder="Ex: 300"
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
                    placeholder="Ex: 250"
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
                  Définissez chaque combinaison de taille, couleur et stock initial.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleQuickAddSizes}
                  className="h-8 text-xs border-border hover:border-[#C9A227]"
                >
                  Pack S-XXL
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddVariant}
                  className="h-8 text-xs bg-[#111111] hover:bg-[#252525] text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-[#C9A227]" />
                  Ajouter une ligne
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Taille</th>
                      <th className="py-2.5 px-3">Couleur</th>
                      <th className="py-2.5 px-3">Quantité en stock</th>
                      <th className="py-2.5 px-3">Active</th>
                      <th className="py-2.5 px-3 text-right">Suppr.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {variants.map((v, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        {/* Size */}
                        <td className="py-2 px-3">
                          <Input
                            value={v.size}
                            onChange={(e) => handleUpdateVariant(idx, "size", e.target.value)}
                            placeholder="Ex: M ou 42"
                            className="h-8 text-xs w-24"
                            required
                          />
                        </td>

                        {/* Color */}
                        <td className="py-2 px-3">
                          <Input
                            value={v.color}
                            onChange={(e) => handleUpdateVariant(idx, "color", e.target.value)}
                            placeholder="Ex: Noir ou Standard"
                            className="h-8 text-xs w-28"
                          />
                        </td>

                        {/* Stock */}
                        <td className="py-2 px-3">
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
                        </td>

                        {/* Active toggle */}
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={v.is_active}
                            onChange={(e) =>
                              handleUpdateVariant(idx, "is_active", e.target.checked)
                            }
                            className="w-4 h-4 rounded text-[#C9A227] focus:ring-[#C9A227]"
                          />
                        </td>

                        {/* Delete */}
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(idx)}
                            className="p-1 text-muted-foreground hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 col): Photos & Media */}
        <div className="space-y-6">
          <Card className="border-border bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground">
                Photos du vêtement
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Ajoutez des visuels sous fond blanc ou neutre (JPEG, PNG, WebP).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Dropzone Button */}
              <div className="border-2 border-dashed border-border rounded-lg p-5 text-center hover:border-[#C9A227]/70 transition-colors bg-muted/20 relative">
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
                    Cliquez ou glissez vos photos ici
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    Formats acceptés : JPG, PNG, WebP (max 5 Mo)
                  </span>
                </div>
              </div>

              {/* New Selected Files Previews */}
              {selectedNewFiles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Nouvelles images ({selectedNewFiles.length})</span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      À uploader
                    </span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {filePreviews.map((previewUrl, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-md overflow-hidden border border-border aspect-square bg-muted"
                      >
                        <img
                          src={previewUrl}
                          alt="Nouveau fichier"
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 && !isEditMode && (
                          <span className="absolute top-1 left-1 bg-[#111111] text-[#C9A227] text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                            Principale
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(idx)}
                          className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded hover:bg-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Images in Edit Mode */}
              {isEditMode && existingImages.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <span className="text-xs font-semibold text-foreground">
                    Images existantes ({existingImages.length})
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {existingImages.map((img) => (
                      <div
                        key={img.id}
                        className="relative group rounded-md overflow-hidden border border-border aspect-square bg-muted"
                      >
                        <img
                          src={img.image_url}
                          alt="Photo existante"
                          className="w-full h-full object-cover"
                        />

                        {img.is_main ? (
                          <span className="absolute top-1 left-1 bg-[#C9A227] text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-black" />
                            Principale
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetMainImage(img.id)}
                            className="absolute top-1 left-1 p-1 bg-black/60 text-white rounded hover:bg-[#C9A227] hover:text-black transition-colors"
                            title="Définir comme principale"
                          >
                            <Star className="w-3 h-3" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteExistingImage(img.id)}
                          className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded hover:bg-rose-600 transition-colors"
                          title="Supprimer cette photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
