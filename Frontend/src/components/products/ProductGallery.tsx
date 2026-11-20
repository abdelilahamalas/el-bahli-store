import { useState, useEffect } from "react"
import { ShoppingBag } from "lucide-react"
import type { ProductImage } from "@/types/product"
import { cn } from "@/utils/utils"

interface ProductGalleryProps {
  images: ProductImage[]
  defaultImageUrl?: string | null
  productName: string
}

export default function ProductGallery({
  images,
  defaultImageUrl,
  productName,
}: ProductGalleryProps) {
  // Construire la liste complète des images réelles du produit (aucun tiers)
  const allImages = images && images.length > 0
    ? images
    : defaultImageUrl
    ? [{ id: 0, image_url: defaultImageUrl, is_main: true, sort_order: 0, alt_text: productName }]
    : []

  // Trouver l'index de l'image principale
  const mainImageIndex = allImages.findIndex((img) => img.is_main)
  const [activeIndex, setActiveIndex] = useState(mainImageIndex >= 0 ? mainImageIndex : 0)

  // Mettre à jour si les images changent
  useEffect(() => {
    const idx = allImages.findIndex((img) => img.is_main)
    setActiveIndex(idx >= 0 ? idx : 0)
  }, [images, defaultImageUrl])

  const currentImage = allImages[activeIndex]

  if (allImages.length === 0) {
    return (
      <div className="aspect-[3/4] w-full rounded-2xl bg-neutral-100 flex flex-col items-center justify-center p-8 text-center border border-border">
        <ShoppingBag className="h-14 w-14 text-neutral-400 mb-3" />
        <span className="text-xs font-semibold text-neutral-500">{productName}</span>
        <span className="text-[11px] text-neutral-400 mt-1">Aucune photo enregistrée</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Grande Image Principale */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-neutral-50 border border-border">
        <img
          src={currentImage?.image_url}
          alt={currentImage?.alt_text || productName}
          className="h-full w-full object-cover object-center"
        />
      </div>

      {/* Galerie de Miniatures avec défilement horizontal fluide */}
      {allImages.length > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scroll-smooth">
          {allImages.map((img, idx) => (
            <button
              key={img.id || idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-neutral-100 transition-colors focus:outline-hidden",
                activeIndex === idx
                  ? "border-[#C9A227] ring-1 ring-[#C9A227]"
                  : "border-transparent opacity-75 hover:opacity-100"
              )}
              title={`Afficher l'image ${idx + 1}`}
            >
              <img
                src={img.thumbnail_url || img.image_url}
                alt={img.alt_text || `${productName} vignette ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
