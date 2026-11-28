import { useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { CheckCircle2, Truck, Banknote, Phone, ArrowRight, ShoppingBag } from "lucide-react"
import type { PublicOrderData } from "@/types/cart"
import { siteConfig } from "@/config/site"
import AnnouncementBar from "@/components/layout/AnnouncementBar"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { usePageMeta } from "@/hooks/usePageMeta"

export default function OrderSuccessPage() {
  usePageMeta({
    title: "Commande Confirmée — El Bahli Store",
    canonical: "https://elbahlistore.com/order-success",
    noindex: true,
  })

  const [searchParams] = useSearchParams()
  const referenceFromUrl = searchParams.get("ref")

  const [orderData] = useState<PublicOrderData | null>(() => {
    try {
      const raw = sessionStorage.getItem("last_order_data")
      if (raw) {
        const parsed = JSON.parse(raw)
        return parsed?.order || null
      }
    } catch {
      // Ignorer si indisponible
    }
    return null
  })

  const displayRef = orderData?.reference || referenceFromUrl || "Réf en cours"

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-brand-gold/30">
      <AnnouncementBar />
      <Navbar categories={[]} />

      <main className="flex-1 py-12 sm:py-16">
        <div className="container mx-auto px-4 max-w-2xl space-y-8">
          {/* Carte de Félicitations */}
          <div className="p-8 sm:p-12 rounded-2xl border border-border bg-card text-center space-y-6 shadow-sm">
            <div className="h-16 w-16 rounded-full bg-green-500/15 text-green-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-brand-gold block">
                Commande Validée
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Merci pour votre commande !
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Votre commande a été enregistrée avec succès. Notre service client prendra contact avec vous par téléphone avant l'expédition de votre colis.
              </p>
            </div>

            {/* Référence et Détails Clés */}
            <div className="p-4 rounded-xl bg-brand-lightGray/70 border border-border/60 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground font-medium">Numéro de référence :</span>
                <span className="font-mono font-bold text-sm text-brand-black">
                  {displayRef}
                </span>
              </div>

              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground font-medium">Mode de paiement :</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5 text-brand-gold" />
                  <span>Espèces à la livraison</span>
                </span>
              </div>

              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground font-medium">Frais de livraison :</span>
                <span className="font-bold text-green-600 flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-brand-gold" />
                  <span>GRATUITE (0,00 DH)</span>
                </span>
              </div>

              {orderData?.total && (
                <div className="flex items-center justify-between pt-1 text-sm font-bold">
                  <span>Total à régler à la livraison :</span>
                  <span className="text-base font-black text-brand-black">
                    {orderData.total} MAD
                  </span>
                </div>
              )}
            </div>

            {/* Articles de la commande si disponibles */}
            {orderData?.items && orderData.items.length > 0 && (
              <div className="border-t pt-4 text-left space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Récapitulatif des articles ({orderData.items.length})
                </h3>
                <div className="divide-y divide-border/40 text-xs">
                  {orderData.items.map((item, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-foreground">{item.product_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Taille : {item.size} • Couleur : {item.color} • Qté : {item.quantity}
                        </p>
                      </div>
                      <span className="font-bold">{item.line_total} MAD</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assistance WhatsApp */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/40 text-xs text-muted-foreground space-y-1 text-left">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-brand-gold" />
                <span>Une question sur votre livraison ?</span>
              </p>
              <p>
                Notre équipe est à votre disposition sur WhatsApp ({siteConfig.phoneDisplay}) pour vous renseigner sur le suivi de votre colis.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/">
                <Button variant="gold" size="lg" className="w-full sm:w-auto font-bold text-xs gap-2">
                  <span>Retour à l'accueil</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              <Link to="/products">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-xs gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  <span>Continuer mes achats</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer categories={[]} />
    </div>
  )
}
