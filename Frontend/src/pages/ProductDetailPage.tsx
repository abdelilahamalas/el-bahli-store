import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import {
  Truck,
  Banknote,
  Phone,
  ShoppingBag,
  ArrowLeft,
  AlertCircle,
  Share2,
} from "lucide-react"
import { toast } from "sonner"
import { useCart } from "@/hooks/useCart"
import type { Product, ProductVariant } from "@/types/product"
import type { Category } from "@/types/category"
import productService from "@/services/productService"
import categoryService from "@/services/categoryService"
import { siteConfig } from "@/config/site"
import AnnouncementBar from "@/components/layout/AnnouncementBar"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import ProductGallery from "@/components/products/ProductGallery"
import VariantSelector from "@/components/products/VariantSelector"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { addItem } = useCart()

  const [categories, setCategories] = useState<Category[]>([])
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Variantes sélectionnées
  const [selectedColor, setSelectedColor] = useState<string>("")
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState<number>(1)

  // Chargement des catégories pour le header
  useEffect(() => {
    let isMounted = true
    categoryService
      .getCategories()
      .then((data) => {
        if (isMounted) setCategories(data)
      })
      .catch((err) => console.error("Erreur chargement catégories :", err))

    return () => {
      isMounted = false
    }
  }, [])

  // Chargement du produit
  useEffect(() => {
    if (!slug) return
    let isMounted = true

    productService
      .getProductBySlug(slug)
      .then((data) => {
        if (isMounted) {
          setProduct(data)
          setIsLoading(false)

          // Initialisation de la variante par défaut
          if (data.variants && data.variants.length > 0) {
            const firstInStock = data.variants.find((v) => v.stock > 0 && v.is_active)
            const target = firstInStock || data.variants[0]
            setSelectedColor(target.color || "Standard")
            setSelectedSize(target.size)
            setSelectedVariant(target)
          }
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg =
            err instanceof Error
              ? err.message
              : "Ce produit n'a pas pu être trouvé ou est indisponible."
          setError(msg)
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [slug])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name || "El Bahli Store",
        text: `Découvrez ${product?.name} sur El Bahli Store`,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success("Lien copié dans le presse-papier !")
    }
  }

  const handleAddToCart = () => {
    if (!product || !selectedVariant || selectedVariant.stock <= 0) {
      toast.error("Veuillez sélectionner une taille disponible avant d'ajouter au panier.")
      return
    }

    const unitPrice = product.promotional_price
      ? parseFloat(product.promotional_price)
      : parseFloat(product.price)

    const mainImage =
      product.images?.find((img) => img.is_main)?.image_url ||
      product.image_url ||
      product.images?.[0]?.image_url

    addItem(
      {
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        slug: product.slug,
        image: mainImage,
        price: unitPrice,
        size: selectedSize,
        color: selectedColor || "Standard",
        maxStock: selectedVariant.stock,
      },
      quantity
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <AnnouncementBar />
        <Navbar categories={categories} />
        <main className="flex-1 py-12 container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7">
              <Skeleton className="aspect-3/4 w-full rounded-2xl" />
            </div>
            <div className="lg:col-span-5 space-y-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </main>
        <Footer categories={categories} />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <AnnouncementBar />
        <Navbar categories={categories} />
        <main className="flex-1 py-16 container mx-auto px-4 flex items-center justify-center">
          <div className="max-w-md w-full p-8 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">Produit introuvable</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {error || "L'article demandé n'est plus en stock ou a été retiré de la boutique."}
            </p>
            <div className="pt-2">
              <Link to="/products">
                <Button variant="outline" size="sm" className="gap-2 rounded-full">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Retourner au catalogue</span>
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer categories={categories} />
      </div>
    )
  }

  const numPrice = parseFloat(product.price)
  const numPromo = product.promotional_price ? parseFloat(product.promotional_price) : null
  const hasPromo = numPromo !== null && numPromo > 0 && numPromo < numPrice
  const isOutOfStock = product.total_stock <= 0
  const isVariantSelected = Boolean(selectedVariant && selectedVariant.stock > 0 && selectedVariant.is_active)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-brand-gold/30">
      <AnnouncementBar />
      <Navbar categories={categories} />

      <main className="flex-1 py-8 sm:py-12">
        <div className="container mx-auto px-4 space-y-8">
          {/* Fil d'Ariane épuré avec séparateur vertical façon streetwear */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Link to="/" className="hover:text-brand-gold transition-colors">
              Accueil
            </Link>
            <span className="opacity-40">|</span>
            <Link to="/products" className="hover:text-brand-gold transition-colors">
              Catalogue
            </Link>
            {product.category_name && (
              <>
                <span className="opacity-40">|</span>
                <span className="text-muted-foreground">{product.category_name}</span>
              </>
            )}
            <span className="opacity-40">|</span>
            <span className="text-foreground font-semibold truncate max-w-[200px]">
              {product.name}
            </span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            {/* Galerie d'Images (Gauche) */}
            <div className="lg:col-span-7">
              <ProductGallery
                images={product.images || []}
                defaultImageUrl={product.image_url}
                productName={product.name}
              />
            </div>

            {/* Informations & Sélecteurs (Droite) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Catégorie & Partage */}
              <div className="flex items-center justify-between gap-2">
                {product.category_name && (
                  <Badge variant="outline" className="text-xs uppercase tracking-wider font-bold border-brand-gold/40 text-brand-gold rounded-full px-3 py-1">
                    {product.category_name}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  aria-label="Partager ce produit"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Titre du Produit */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                {product.name}
              </h1>

              {/* Avis Clients (Étoiles) */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center text-brand-gold text-sm tracking-wider">
                  ★★★★★
                </div>
                <span className="font-extrabold text-foreground">5,0</span>
                <span className="text-muted-foreground">· 12 avis clients vérifiés</span>
              </div>

              {/* Affichage des Prix style épuré */}
              <div className="flex items-baseline gap-3 pt-1">
                {hasPromo ? (
                  <>
                    <span className="text-3xl sm:text-4xl font-black text-brand-black">
                      {numPromo} <span className="text-sm font-bold text-brand-gold">MAD</span>
                    </span>
                    <span className="text-lg text-muted-foreground line-through">
                      {numPrice} MAD
                    </span>
                    <Badge variant="destructive" className="ml-2 font-bold text-xs uppercase rounded-full">
                      -{Math.round(((numPrice - (numPromo as number)) / numPrice) * 100)}%
                    </Badge>
                  </>
                ) : (
                  <span className="text-3xl sm:text-4xl font-black text-brand-black">
                    {numPrice} <span className="text-sm font-bold text-brand-gold">MAD</span>
                  </span>
                )}
              </div>

              {/* Sélecteur de Variantes (Tailles & Couleurs avec stock en direct) */}
              <VariantSelector
                variants={product.variants || []}
                selectedVariant={selectedVariant}
                onVariantChange={setSelectedVariant}
                selectedColor={selectedColor}
                onColorChange={setSelectedColor}
                selectedSize={selectedSize}
                onSizeChange={setSelectedSize}
              />

              {/* Sélecteur de Quantité */}
              {isVariantSelected && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Quantité
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border rounded-xl overflow-hidden bg-card shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="h-10 w-10 flex items-center justify-center text-sm font-bold hover:bg-muted disabled:opacity-40 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="h-10 w-12 flex items-center justify-center text-sm font-bold">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((q) =>
                            Math.min(selectedVariant?.stock ?? 1, q + 1)
                          )
                        }
                        disabled={quantity >= (selectedVariant?.stock ?? 1)}
                        className="h-10 w-10 flex items-center justify-center text-sm font-bold hover:bg-muted disabled:opacity-40 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-xs text-muted-foreground">
                      (Max {selectedVariant?.stock} unité{(selectedVariant?.stock ?? 0) > 1 ? "s" : ""})
                    </span>
                  </div>
                </div>
              )}

              {/* Estimation de livraison partout au Maroc */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-brand-lightGray/70 border border-border/70 text-xs text-foreground/90">
                <Truck className="h-4 w-4 text-brand-gold shrink-0" />
                <span>
                  Livraison offerte · Réception estimée sous <strong className="font-bold">24h à 48h partout au Maroc</strong>
                </span>
              </div>

              {/* Bouton d'Action Principal — Design Professionnel El Bahli Store */}
              <div className="space-y-3 pt-2">
                {!isVariantSelected ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled
                    className="w-full h-12 sm:h-13 text-xs sm:text-sm font-bold rounded-xl bg-muted/60 text-muted-foreground border-border cursor-not-allowed select-none gap-2"
                  >
                    <ShoppingBag className="h-4 w-4 text-muted-foreground/60" />
                    <span>Sélectionnez votre taille</span>
                  </Button>
                ) : isOutOfStock ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    disabled
                    className="w-full h-12 sm:h-13 text-xs sm:text-sm font-bold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 cursor-not-allowed select-none"
                  >
                    Victime de son succès (Rupture)
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleAddToCart}
                    className="w-full h-12 text-sm font-semibold rounded-xl bg-[#111111] text-white hover:bg-[#222222] border border-[#C9A227]/30 transition-colors gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="h-4 w-4 text-[#C9A227]" />
                    <span>Ajouter au panier</span>
                  </Button>
                )}

                <a
                  href={`${siteConfig.whatsappUrl}?text=${encodeURIComponent(
                    `Bonjour El Bahli Store, j'ai une question concernant l'article ${product.name} (Réf : #${product.id}).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-brand-gold py-2.5 transition-colors border border-border/80 rounded-xl hover:border-brand-gold"
                >
                  <Phone className="h-3.5 w-3.5 text-brand-gold" />
                  <span>Une question sur la taille ? Échangez sur WhatsApp</span>
                </a>
              </div>

              {/* Description */}
              {product.description && (
                <div className="pt-4 border-t space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Description du Produit
                  </h2>
                  <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Réassurance Rapide */}
              <div className="pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="h-4 w-4 text-brand-gold shrink-0" />
                  <span>Livraison gratuite partout au Maroc</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Banknote className="h-4 w-4 text-brand-gold shrink-0" />
                  <span>Paiement à la réception (Espèces)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer categories={categories} />
    </div>
  )
}
