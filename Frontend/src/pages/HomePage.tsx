import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ArrowDown, Truck, Banknote, Phone, ArrowRight } from "lucide-react"
import type { Category } from "@/types/category"
import categoryService from "@/services/categoryService"
import { siteConfig } from "@/config/site"
import { storeLogo } from "@/utils/categoryImages"
import AnnouncementBar from "@/components/layout/AnnouncementBar"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import CategoryGrid from "@/components/categories/CategoryGrid"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCategories = () => {
    setIsLoading(true)
    setError(null)
    categoryService
      .getCategories()
      .then((data) => {
        setCategories(data)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : "Une erreur est survenue lors du chargement des catégories depuis le serveur."
        setError(message)
        setIsLoading(false)
      })
  }

  useEffect(() => {
    let isMounted = true
    categoryService
      .getCategories()
      .then((data) => {
        if (isMounted) {
          setCategories(data)
          setIsLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const message =
            err instanceof Error
              ? err.message
              : "Une erreur est survenue lors du chargement des catégories depuis le serveur."
          setError(message)
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const scrollToCategories = () => {
    const target = document.getElementById("categories-section")
    if (!target) return

    const navHeight = 75
    const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight
    const startPosition = window.scrollY
    const distance = targetPosition - startPosition
    const duration = 600
    let startTime: number | null = null

    const easeInOutQuad = (t: number): number => {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    }

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const ease = easeInOutQuad(progress)

      window.scrollTo(0, startPosition + distance * ease)

      if (elapsed < duration) {
        requestAnimationFrame(animation)
      }
    }

    requestAnimationFrame(animation)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-brand-gold/30">
      {/* 1. Barre supérieure — Annonce Officielle */}
      <AnnouncementBar />

      {/* 2. Header Officiel avec Navigation Stylée & Centrée */}
      <Navbar categories={categories} isLoading={isLoading} />

      <main className="flex-1">
        {/* 3. Section Hero Simple, Épurée & Impactante (Inspirée de la référence streetwear) */}
        <section className="relative overflow-hidden bg-brand-black text-white py-16 sm:py-24 lg:py-28 border-b border-border/10">
          {/* Fond subtil */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#C9A227_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />

          <div className="container relative mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Contenu textuel Hero épuré */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                {/* Ligne discrète d'introduction type streetwear */}
                <div className="text-xs sm:text-sm font-semibold tracking-widest uppercase text-brand-gold/90">
                  — NÉ AU MAROC, LIVRÉ PARTOUT DANS LE ROYAUME
                </div>

                {/* Titre percutant, grand et épuré comme le modèle "Prends ta place." */}
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08]">
                  Prends ton <span className="text-brand-gold">style.</span>
                </h1>

                <p className="text-brand-gray text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                  Vestiaire masculin haut de gamme alliant authenticité, coupes soignées
                  et matières confortables. Commandez en ligne en quelques clics avec paiement sécurisé à la réception.
                </p>

                {/* Boutons d'action rapides */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-3">
                  <Button
                    variant="gold"
                    size="lg"
                    onClick={scrollToCategories}
                    className="w-full sm:w-auto px-8 gap-2 font-bold shadow-lg rounded-full cursor-pointer"
                  >
                    <span>Découvrir les Collections</span>
                    <ArrowDown className="h-4 w-4" />
                  </Button>

                  <Link
                    to="/products"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all hover:border-brand-gold/50 cursor-pointer"
                  >
                    <span>Voir Tout le Catalogue</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Composition visuelle officielle Hero avec logo circulaire */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-brand-gold/30 to-transparent blur-xl opacity-70" />
                  <div className="relative p-6 sm:p-8 rounded-3xl bg-brand-black/90 border border-brand-gold/40 shadow-2xl flex flex-col items-center text-center max-w-sm backdrop-blur-xs">
                    {/* Logo sous forme circulaire */}
                    <img
                      src={storeLogo}
                      alt="Logo Officiel El Bahli Store"
                      className="h-44 w-44 sm:h-52 sm:w-52 rounded-full object-contain bg-white p-2 border-2 border-brand-gold/40 shadow-xl transition-transform duration-500 hover:scale-105"
                    />
                    <div className="mt-6 space-y-1">
                      <span className="text-brand-gold font-mono text-xs uppercase tracking-widest block font-bold">
                        Collection Officielle
                      </span>
                      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                        EL BAHLI STORE
                      </h2>
                      <p className="text-xs text-brand-gray font-medium">
                        Livraison dans tout le Royaume
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Section Réassurance Officielle */}
        <section className="bg-brand-lightGray/70 py-10 border-b border-border/50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Avantage 1 */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
                <div className="h-12 w-12 rounded-full bg-brand-gold/15 text-brand-gold flex items-center justify-center shrink-0">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground mb-1">
                    Livraison Gratuite
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Livraison offerte à domicile partout au Maroc, sans condition ni minimum d'achat.
                  </p>
                </div>
              </div>

              {/* Avantage 2 */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
                <div className="h-12 w-12 rounded-full bg-brand-gold/15 text-brand-gold flex items-center justify-center shrink-0">
                  <Banknote className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground mb-1">
                    Paiement à la Réception
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Commandez sereinement et réglez en espèces lors de la remise de votre colis par le livreur.
                  </p>
                </div>
              </div>

              {/* Avantage 3 */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
                <div className="h-12 w-12 rounded-full bg-brand-gold/15 text-brand-gold flex items-center justify-center shrink-0">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground mb-1">
                    Service Client Direct
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Échangez directement avec nous sur WhatsApp ({siteConfig.phoneDisplay}) pour vos conseils et choix de taille.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Section des 12 Catégories Officielles */}
        <section id="categories-section" className="py-16 sm:py-20 lg:py-24">
          <div className="container mx-auto px-4 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-gold block">
                Notre Catalogue
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Les 12 Collections Officielles
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Parcourez l'ensemble de notre vestiaire masculin : capuches, sweats,
                polos, vestes, jeans, pantalons classe et accessoires.
              </p>
            </div>

            {/* Grille dynamique des catégories avec les nouvelles cartes modernes */}
            <CategoryGrid
              categories={categories}
              isLoading={isLoading}
              error={error}
              onRetry={loadCategories}
            />
          </div>
        </section>
      </main>

      {/* 6. Footer Officiel */}
      <Footer categories={categories} />
    </div>
  )
}
