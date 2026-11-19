import { useState, useEffect } from "react"
import { ArrowDown, Truck, Banknote, Phone, Sparkles } from "lucide-react"
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
    const el = document.getElementById("categories-section")
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-brand-gold/30">
      {/* 1. Barre supérieure — Livraison Gratuite */}
      <AnnouncementBar />

      {/* 2. Header Officiel */}
      <Navbar categories={categories} isLoading={isLoading} />

      <main className="flex-1">
        {/* 3. Section Hero Premium */}
        <section className="relative overflow-hidden bg-brand-black text-white py-16 sm:py-24 lg:py-28 border-b border-border/10">
          {/* Arrière-plan stylisé discret */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#C9A227_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />

          <div className="container relative mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Contenu textuel Hero */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-brand-gold text-xs font-semibold tracking-wider uppercase border border-brand-gold/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  Prêt-à-Porter Masculin au Maroc
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                  L'élégance moderne,{" "}
                  <span className="text-brand-gold underline decoration-brand-gold/40 underline-offset-8">
                    signée El Bahli
                  </span>
                </h1>

                <p className="text-brand-gray text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  Découvrez une sélection exclusive de vêtements pour hommes alliant
                  confort, finitions soignées et style contemporain. Livraison gratuite
                  partout au Maroc avec paiement sécurisé à la réception.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                  <Button
                    variant="gold"
                    size="lg"
                    onClick={scrollToCategories}
                    className="w-full sm:w-auto px-8 gap-2 font-bold shadow-lg"
                  >
                    <span>Explorer les 12 Collections</span>
                    <ArrowDown className="h-4 w-4" />
                  </Button>

                  <a
                    href={siteConfig.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-md text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
                  >
                    Contacter la Boutique
                  </a>
                </div>
              </div>

              {/* Composition visuelle officielle Hero (utilisant le logo réel) */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative">
                  {/* Cadre décoratif raffiné */}
                  <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-brand-gold/40 to-transparent blur-md opacity-60" />
                  <div className="relative p-6 sm:p-8 rounded-2xl bg-brand-black border border-brand-gold/40 shadow-2xl flex flex-col items-center text-center max-w-sm">
                    <img
                      src={storeLogo}
                      alt="Logo El Bahli Store"
                      className="h-44 w-44 sm:h-52 sm:w-52 rounded-2xl object-contain bg-white p-2 border border-brand-gold/30 shadow-md transition-transform duration-300 hover:scale-102"
                    />
                    <div className="mt-6 space-y-1">
                      <span className="text-brand-gold font-mono text-xs uppercase tracking-widest block">
                        Collection Officielle
                      </span>
                      <h2 className="text-xl font-bold tracking-tight text-white">
                        EL BAHLI STORE
                      </h2>
                      <p className="text-xs text-brand-gray">
                        Casablanca & Livraison dans tout le Royaume
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Section Réassurance Officielle */}
        <section className="bg-brand-lightGray/60 py-10 border-b border-border/40">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Avantage 1 */}
              <div className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border shadow-xs">
                <div className="h-12 w-12 rounded-lg bg-brand-gold/15 text-brand-gold flex items-center justify-center shrink-0">
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
              <div className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border shadow-xs">
                <div className="h-12 w-12 rounded-lg bg-brand-gold/15 text-brand-gold flex items-center justify-center shrink-0">
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
              <div className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border shadow-xs">
                <div className="h-12 w-12 rounded-lg bg-brand-gold/15 text-brand-gold flex items-center justify-center shrink-0">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground mb-1">
                    Service Client Direct
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Échangez directement avec nous sur WhatsApp ({siteConfig.phoneDisplay}) pour vos conseils de taille.
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
              <span className="text-xs font-semibold uppercase tracking-widest text-brand-gold block">
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

            {/* Grille dynamique des catégories */}
            <CategoryGrid
              categories={categories}
              isLoading={isLoading}
              error={error}
              onRetry={loadCategories}
            />
          </div>
        </section>

        {/* 6. Section Emplacement Propre pour les Produits Futurs */}
        <section className="bg-brand-lightGray/40 py-14 border-t border-border/40">
          <div className="container mx-auto px-4">
            <div className="p-8 sm:p-12 rounded-2xl bg-card border border-border text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold/20 text-brand-gold mb-1">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Arrivages & Nouvelles Collections
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Le catalogue complet des articles avec gestion du stock en temps réel
                par taille et couleur sera déployé dans les prochaines phases.
                Chaque pièce est rigoureusement sélectionnée pour votre style au quotidien.
              </p>
              <div className="pt-2">
                <Button
                  variant="gold"
                  onClick={scrollToCategories}
                  className="font-semibold"
                >
                  Découvrir les Catégories Disponibles
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Footer Officiel */}
      <Footer categories={categories} />
    </div>
  )
}
