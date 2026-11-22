import { useState, useEffect, useRef, useCallback } from "react"
import { ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react"
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
  // Construire la liste complète des images réelles du produit
  const allImages =
    images && images.length > 0
      ? images
      : defaultImageUrl
      ? [{ id: 0, image_url: defaultImageUrl, is_main: true, sort_order: 0, alt_text: productName }]
      : []

  const [activeIndex, setActiveIndex] = useState(0)

  // Mettre à jour si les images changent
  useEffect(() => {
    const mainIdx = allImages.findIndex((img) => img.is_main)
    setActiveIndex(mainIdx >= 0 ? mainIdx : 0)
  }, [images, defaultImageUrl])

  const total = allImages.length
  const hasMultiple = total > 1

  // Navigation circulaire gauche / droite
  const handlePrev = useCallback(() => {
    if (!hasMultiple) return
    setActiveIndex((prev) => (prev === 0 ? total - 1 : prev - 1))
  }, [hasMultiple, total])

  const handleNext = useCallback(() => {
    if (!hasMultiple) return
    setActiveIndex((prev) => (prev === total - 1 ? 0 : prev + 1))
  }, [hasMultiple, total])

  // Support tactile Swipe pour mobile
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
    touchEndX.current = null
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return
    const distance = touchStartX.current - touchEndX.current
    const isSwipeLeft = distance > 45
    const isSwipeRight = distance < -45

    if (isSwipeLeft) {
      handleNext()
    } else if (isSwipeRight) {
      handlePrev()
    }

    touchStartX.current = null
    touchEndX.current = null
  }

  // Navigation clavier (flèches gauche / droite)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") handlePrev()
    if (e.key === "ArrowRight") handleNext()
  }

  const currentImage = allImages[activeIndex]

  if (allImages.length === 0) {
    return (
      <div className="aspect-[4/5] w-full rounded-2xl bg-neutral-100 flex flex-col items-center justify-center p-8 text-center border border-border">
        <ShoppingBag className="h-14 w-14 text-neutral-400 mb-3" />
        <span className="text-xs font-semibold text-neutral-500">{productName}</span>
        <span className="text-[11px] text-neutral-400 mt-1">Aucune photo enregistrée</span>
      </div>
    )
  }

  return (
    <div
      className="space-y-3.5 select-none focus:outline-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={`Galerie photo de ${productName}`}
    >
      {/* Zone Carousel Image Principale */}
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[#FAFAFA] border border-border/80 flex items-center justify-center group"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image principale centrée avec object-contain sans couper les vêtements */}
        <img
          key={currentImage?.id || activeIndex}
          src={currentImage?.image_url}
          alt={currentImage?.alt_text || `${productName} photo ${activeIndex + 1}`}
          className="h-full w-full object-contain object-center transition-opacity duration-200 p-2 sm:p-4"
        />

        {/* Navigation Carousel (uniquement si le produit a plusieurs images) */}
        {hasMultiple && (
          <>
            {/* Bouton Circulaire Gauche */}
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Image précédente"
              className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md border border-slate-200/80 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xs"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 stroke-[2.2]" />
            </button>

            {/* Bouton Circulaire Droit */}
            <button
              type="button"
              onClick={handleNext}
              aria-label="Image suivante"
              className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md border border-slate-200/80 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xs"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 stroke-[2.2]" />
            </button>

            {/* Indicateur de position (ex: 2 / 5) */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <span className="px-2.5 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-semibold tracking-wider backdrop-blur-md shadow-xs border border-white/10">
                {activeIndex + 1} / {total}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Galerie de Miniatures avec défilement horizontal fluide */}
      {hasMultiple && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-smooth">
          {allImages.map((img, idx) => (
            <button
              key={img.id || idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "relative h-16 w-14 sm:h-18 sm:w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-neutral-50 transition-all cursor-pointer p-1",
                activeIndex === idx
                  ? "border-[#C9A227] shadow-xs ring-1 ring-[#C9A227]/50"
                  : "border-slate-200/80 opacity-70 hover:opacity-100 hover:border-slate-300"
              )}
              title={`Afficher la photo ${idx + 1}`}
            >
              <img
                src={img.thumbnail_url || img.image_url}
                alt={img.alt_text || `${productName} miniature ${idx + 1}`}
                className="h-full w-full object-contain object-center"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
