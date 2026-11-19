import { useEffect } from "react"
import { Check, AlertCircle } from "lucide-react"
import type { ProductVariant } from "@/types/product"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/utils/utils"

interface VariantSelectorProps {
  variants: ProductVariant[]
  selectedVariant: ProductVariant | null
  onVariantChange: (variant: ProductVariant | null) => void
  selectedColor: string
  onColorChange: (color: string) => void
  selectedSize: string
  onSizeChange: (size: string) => void
}

export default function VariantSelector({
  variants = [],
  selectedVariant,
  onVariantChange,
  selectedColor,
  onColorChange,
  selectedSize,
  onSizeChange,
}: VariantSelectorProps) {
  // Liste des couleurs uniques disponibles dans les variantes
  const colors = Array.from(new Set(variants.map((v) => v.color || "Standard")))

  // Variantes correspondant à la couleur sélectionnée
  const colorVariants = variants.filter(
    (v) => (v.color || "Standard") === selectedColor
  )

  // Tailles pour cette couleur
  const sizesForColor = colorVariants.map((v) => ({
    size: v.size,
    variant: v,
    isAvailable: v.stock > 0 && v.is_active,
  }))

  // Synchronisation automatique de la variante sélectionnée
  useEffect(() => {
    if (!selectedColor && colors.length > 0) {
      onColorChange(colors[0])
      return
    }

    const currentVariant = variants.find(
      (v) => (v.color || "Standard") === selectedColor && v.size === selectedSize
    )
    if (currentVariant && currentVariant.stock > 0 && currentVariant.is_active) {
      onVariantChange(currentVariant)
    } else {
      // Si la taille précédente n'est plus valide pour cette couleur, choisir la 1ère taille disponible
      const firstAvailable = variants.find(
        (v) =>
          (v.color || "Standard") === selectedColor &&
          v.stock > 0 &&
          v.is_active
      )
      if (firstAvailable) {
        onSizeChange(firstAvailable.size)
        onVariantChange(firstAvailable)
      } else {
        onVariantChange(null)
      }
    }
  }, [
    selectedColor,
    selectedSize,
    variants,
    colors,
    onColorChange,
    onSizeChange,
    onVariantChange,
  ])

  if (variants.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-muted text-xs text-muted-foreground flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>Aucune variante de taille ou de couleur spécifiée pour cet article.</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Sélection de la Couleur (si plus d'une couleur ou couleur non standard) */}
      {colors.length > 1 || (colors.length === 1 && colors[0] !== "Standard") ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Couleur :{" "}
              <span className="text-foreground font-bold">{selectedColor}</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const isSelected = selectedColor === color
              // Vérifie si cette couleur a au moins une variante avec du stock
              const hasStock = variants.some(
                (v) => (v.color || "Standard") === color && v.stock > 0 && v.is_active
              )

              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => onColorChange(color)}
                  className={cn(
                    "px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5",
                    isSelected
                      ? "border-brand-black bg-brand-black text-white shadow-xs"
                      : "border-border bg-card text-foreground hover:border-brand-gold",
                    !hasStock && "opacity-50 line-through"
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 text-brand-gold" />}
                  <span>{color}</span>
                  {!hasStock && (
                    <span className="text-[10px] text-muted-foreground font-normal">
                      (Épuisé)
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* 2. Sélection de la Taille */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Taille :{" "}
            <span className="text-foreground font-bold">
              {selectedSize || "Choisir une taille"}
            </span>
          </span>

          {selectedVariant && (
            <span className="text-xs">
              {selectedVariant.stock > 5 ? (
                <span className="text-green-600 font-medium">En stock</span>
              ) : selectedVariant.stock > 0 ? (
                <span className="text-amber-600 font-semibold">
                  Plus que {selectedVariant.stock} en stock !
                </span>
              ) : (
                <span className="text-destructive font-medium">Indisponible</span>
              )}
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {sizesForColor.map(({ size, variant, isAvailable }) => {
            const isSelected = selectedSize === size

            return (
              <button
                key={size}
                type="button"
                disabled={!isAvailable}
                onClick={() => {
                  if (isAvailable) {
                    onSizeChange(size)
                    onVariantChange(variant)
                  }
                }}
                className={cn(
                  "relative h-12 rounded-lg border text-sm font-bold transition-all flex flex-col items-center justify-center",
                  isSelected
                    ? "border-brand-black bg-brand-black text-white shadow-sm ring-2 ring-brand-gold/30"
                    : isAvailable
                    ? "border-border bg-card text-foreground hover:border-brand-gold hover:bg-brand-lightGray/40"
                    : "border-border/40 bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                <span>{size}</span>
                {!isAvailable && (
                  <span className="text-[9px] font-normal leading-none text-muted-foreground/60">
                    Épuisé
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Résumé de la disponibilité */}
      <div className="pt-2">
        {selectedVariant && selectedVariant.stock > 0 ? (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-700 flex items-center justify-between">
            <span className="font-medium">
              Variante #{selectedVariant.id} ({selectedColor} - {selectedSize}) prête à être commandée.
            </span>
            <Badge variant="outline" className="border-green-600/30 text-green-700 bg-white/50 text-[10px]">
              Stock : {selectedVariant.stock}
            </Badge>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Veuillez sélectionner une taille et une couleur disponibles pour commander.</span>
          </div>
        )}
      </div>
    </div>
  )
}
