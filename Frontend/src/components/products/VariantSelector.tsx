import { useEffect, useState } from "react"
import { Check, AlertCircle, Ruler } from "lucide-react"
import type { ProductVariant } from "@/types/product"
import { cn } from "@/utils/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false)

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
      <div className="p-4 rounded-2xl bg-muted text-xs text-muted-foreground flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>Aucune variante de taille ou de couleur spécifiée pour cet article.</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Sélection de la Couleur (si plusieurs couleurs disponibles) */}
      {colors.length > 1 || (colors.length === 1 && colors[0] !== "Standard") ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Couleur :{" "}
              <span className="text-foreground font-extrabold">{selectedColor}</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const isSelected = selectedColor === color
              const hasStock = variants.some(
                (v) => (v.color || "Standard") === color && v.stock > 0 && v.is_active
              )

              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => onColorChange(color)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                    isSelected
                      ? "border-brand-black bg-brand-black text-white shadow-xs"
                      : "border-border bg-card text-foreground hover:border-brand-gold hover:bg-muted/40",
                    !hasStock && "opacity-40 line-through cursor-not-allowed"
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

      {/* 2. Sélection de la Taille — Style moderne inspiré du modèle de référence */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Taille
            </span>
            {selectedSize && (
              <span className="text-xs font-extrabold text-foreground px-2 py-0.5 rounded-full bg-brand-lightGray border">
                {selectedSize}
              </span>
            )}
          </div>

          {/* Guide des tailles interactif */}
          <Dialog open={isSizeGuideOpen} onOpenChange={setIsSizeGuideOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand-gold font-semibold transition-colors cursor-pointer"
              >
                <Ruler className="h-3.5 w-3.5 text-brand-gold" />
                <span>Guide des tailles</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  Guide des Tailles Officiel
                </DialogTitle>
              </DialogHeader>
              <div className="py-3 space-y-4 text-xs">
                <p className="text-muted-foreground">
                  Nos coupes sont ajustées et conformes aux standards marocains et européens. En cas de doute, privilégiez votre taille habituelle.
                </p>
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold text-center">Taille</TableHead>
                        <TableHead className="font-bold text-center">Poitrine (cm)</TableHead>
                        <TableHead className="font-bold text-center">Hauteur (cm)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-bold text-center">S</TableCell>
                        <TableCell className="text-center">90 - 95</TableCell>
                        <TableCell className="text-center">165 - 172</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-bold text-center">M</TableCell>
                        <TableCell className="text-center">96 - 101</TableCell>
                        <TableCell className="text-center">170 - 178</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-bold text-center">L</TableCell>
                        <TableCell className="text-center">102 - 107</TableCell>
                        <TableCell className="text-center">175 - 182</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-bold text-center">XL</TableCell>
                        <TableCell className="text-center">108 - 114</TableCell>
                        <TableCell className="text-center">180 - 188</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-bold text-center">XXL</TableCell>
                        <TableCell className="text-center">115 - 122</TableCell>
                        <TableCell className="text-center">185 - 192</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Boutons pilules de taille façon streetwear (S, M, L, XL, XXL) */}
        <div className="flex flex-wrap gap-2.5">
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
                  "h-12 min-w-[56px] px-4 rounded-xl border text-sm font-extrabold transition-all duration-200 flex items-center justify-center cursor-pointer",
                  isSelected
                    ? "border-brand-black bg-brand-black text-white shadow-md ring-2 ring-brand-gold/40 scale-102"
                    : isAvailable
                    ? "border-border/80 bg-card text-foreground hover:border-brand-black hover:bg-muted/40"
                    : "border-border/30 bg-muted/20 text-muted-foreground/30 cursor-not-allowed line-through"
                )}
              >
                {size}
              </button>
            )
          })}
        </div>

        {/* Indicateur de stock en temps réel pour la taille choisie */}
        {selectedVariant && (
          <div className="pt-1 flex items-center gap-2 text-xs">
            {selectedVariant.stock > 5 ? (
              <span className="inline-flex items-center gap-1.5 text-green-700 font-semibold">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                En stock — Expédition immédiate
              </span>
            ) : selectedVariant.stock > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Dépêchez-vous : plus que {selectedVariant.stock} article{selectedVariant.stock > 1 ? "s" : ""} disponible{selectedVariant.stock > 1 ? "s" : ""} !
              </span>
            ) : (
              <span className="text-destructive font-semibold">
                Taille épuisée pour le moment
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
