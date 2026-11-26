import { useState, useRef, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { Menu, Truck, ChevronRight, Phone } from "lucide-react"
import type { Category } from "@/types/category"
import { storeLogo, getCategoryImage } from "@/utils/categoryImages"
import { siteConfig } from "@/config/site"
import SocialLinks from "@/components/common/SocialLinks"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface MobileMenuProps {
  categories: Category[]
  isLoading?: boolean
}

export default function MobileMenu({ categories, isLoading }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const lastClosedAtRef = useRef<number>(0)
  const location = useLocation()

  const handleClose = () => {
    lastClosedAtRef.current = Date.now()
    setOpen(false)
  }

  const handleToggle = () => {
    if (Date.now() - lastClosedAtRef.current < 450) {
      return
    }
    setOpen((prev) => !prev)
  }

  // Fermeture automatique lors d'un changement de route
  useEffect(() => {
    handleClose()
  }, [location.pathname])

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        aria-expanded={open}
        aria-label="Ouvrir le menu de navigation"
        className="lg:hidden h-10 w-10 text-foreground hover:text-brand-gold hover:bg-muted cursor-pointer"
      >
        <Menu className="h-6 w-6" />
      </Button>

      <Sheet open={open} onOpenChange={(next) => { if (!next) { handleClose() } else { setOpen(true) } }}>
        <SheetContent
          side="left"
          className="w-[85vw] sm:w-[380px] p-0 flex flex-col bg-background border-r"
        >
        {/* Header du menu */}
        <SheetHeader className="p-5 border-b bg-brand-lightGray/30 text-left">
          <div className="flex items-center gap-3">
            <img
              src={storeLogo}
              alt="Logo El Bahli Store"
              className="h-11 w-11 rounded-full object-contain bg-white p-0.5 border shadow-xs"
            />
            <div>
              <SheetTitle className="text-base font-bold tracking-tight text-foreground">
                EL BAHLI <span className="text-brand-gold">STORE</span>
              </SheetTitle>
              <p className="text-xs text-muted-foreground">
                Mode Masculine & Élégance
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Bannière livraison gratuite dans le menu mobile */}
        <div className="bg-brand-black text-white px-4 py-2 text-xs flex items-center gap-2">
          <Truck className="h-3.5 w-3.5 text-brand-gold shrink-0" />
          <span className="font-medium text-[11px] truncate">
            {siteConfig.announcement}
          </span>
        </div>

        {/* Liste des catégories */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Navigation
          </div>

          <Link
            to="/products"
            onClick={handleClose}
            className="flex items-center justify-between p-2.5 rounded-lg text-sm font-bold text-foreground bg-brand-lightGray/70 hover:bg-brand-black hover:text-white transition-colors mb-2"
          >
            <span>Tous les vêtements (Catalogue)</span>
            <ChevronRight className="h-4 w-4" />
          </Link>

          <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Collections par Catégorie
          </div>

          {isLoading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-11 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (
            categories.map((category) => {
              const image = getCategoryImage(category.slug, category.image_url || category.image)
              return (
                <Link
                  key={category.id}
                  to={`/categories/${category.slug}`}
                  onClick={handleClose}
                  className="flex items-center justify-between p-2 rounded-lg text-sm font-medium text-foreground hover:bg-brand-lightGray hover:text-brand-gold transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {image ? (
                      <img
                        src={image}
                        alt={category.name}
                        className="h-8 w-8 rounded-md object-cover border border-border"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {category.name.charAt(0)}
                      </div>
                    )}
                    <span>{category.name}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )
            })
          )}
        </div>

        {/* Pied du menu mobile */}
        <div className="p-4 border-t bg-muted/20 space-y-4">
          <a
            href={siteConfig.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-brand-black text-white text-xs font-semibold hover:bg-brand-black/90 transition-colors"
          >
            <Phone className="h-3.5 w-3.5 text-brand-gold" />
            <span>Assistance WhatsApp ({siteConfig.phoneDisplay})</span>
          </a>

          <Separator />

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">Suivez-nous :</span>
            <SocialLinks iconClassName="h-4 w-4" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
    </>
  )
}
