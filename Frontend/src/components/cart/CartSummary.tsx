import { Truck, Banknote, ShieldCheck } from "lucide-react"
import { siteConfig } from "@/config/site"

interface CartSummaryProps {
  subtotal: number
  deliveryFee?: number
  total: number
  totalCount: number
}

export default function CartSummary({
  subtotal,
  deliveryFee = 0,
  total,
  totalCount,
}: CartSummaryProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-xs">
      <h3 className="font-bold text-base text-foreground tracking-tight border-b pb-3">
        Récapitulatif de la commande
      </h3>

      <div className="space-y-3 text-xs sm:text-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Sous-total ({totalCount} article{totalCount > 1 ? "s" : ""})</span>
          <span className="font-semibold text-foreground">
            {subtotal.toFixed(2)} MAD
          </span>
        </div>

        <div className="flex items-center justify-between text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-brand-gold" />
            <span>Livraison partout au Maroc</span>
          </span>
          <span className="font-bold text-green-600">
            {deliveryFee === 0 ? "GRATUITE (0,00 DH)" : `${deliveryFee.toFixed(2)} MAD`}
          </span>
        </div>

        <div className="flex items-center justify-between text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Banknote className="h-4 w-4 text-brand-gold" />
            <span>Mode de paiement</span>
          </span>
          <span className="font-semibold text-foreground">
            Espèces à la réception
          </span>
        </div>

        <div className="pt-3 border-t flex items-baseline justify-between text-base sm:text-lg">
          <span className="font-extrabold text-foreground">Total à payer</span>
          <span className="font-black text-xl text-brand-black">
            {total.toFixed(2)} <span className="text-xs font-bold">MAD</span>
          </span>
        </div>
      </div>

      {/* Rappel réassurance */}
      <div className="p-3 rounded-xl bg-brand-lightGray/70 text-[11px] text-muted-foreground space-y-1.5 border border-border/40">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <ShieldCheck className="h-4 w-4 text-brand-gold" />
          <span>Commande 100% sécurisée</span>
        </div>
        <p>
          « {siteConfig.announcement} » sans aucun frais caché. Vous réglez directement le livreur à la remise de votre colis.
        </p>
      </div>
    </div>
  )
}
