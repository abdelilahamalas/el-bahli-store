import { useState } from "react"
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
  // Construire la liste complète des images
  const allImages = images.length > 0
    ? images
    : defaultImageUrl
    ? [{ id: 0, image_url: defaultImageUrl, is_main: true, sort_order: 0, alt_text: productName }]
    : []

  const [activeIndex, setActiveIndex] = useState(0)
  const currentImage = allImages[activeIndex]

  if (allImages.length === 0) {
    return (
      <div className="aspect-3/4 w-full rounded-2xl bg-brand-lightGray flex flex-col items-center justify-center p-8 text-center border border-border">
        <ShoppingBag className="h-16 w-16 text-brand-gold/40 mb-3" />
        <span className="text-sm font-semibold text-muted-foreground">{productName}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Image Principale */}
      <div className="relative aspect-3/4 w-full overflow-hidden rounded-2xl bg-brand-lightGray border border-border">
        <img
          src={currentImage?.image_url}
          alt={currentImage?.alt_text || productName}
          className="h-full w-full object-cover object-center transition-all duration-300"
        />
      </div>

      {/* Galerie de Miniatures (si plus d'une image) */}
      {allImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          {allImages.map((img, idx) => (
            <button
              key={img.id || idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-all",
                activeIndex === idx
                  ? "border-brand-gold ring-2 ring-brand-gold/30"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <img
                src={img.thumbnail_url || img.image_url}
                alt={img.alt_text || `${productName} aperçu ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
