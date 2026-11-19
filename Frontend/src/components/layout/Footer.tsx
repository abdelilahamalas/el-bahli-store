import { Link } from "react-router-dom"
import { Truck, Phone, ShieldCheck, ArrowUpRight } from "lucide-react"
import type { Category } from "@/types/category"
import { storeLogo } from "@/utils/categoryImages"
import { siteConfig } from "@/config/site"
import SocialLinks from "@/components/common/SocialLinks"

interface FooterProps {
  categories?: Category[]
}

const CURRENT_YEAR = new Date().getFullYear()

export default function Footer({ categories = [] }: FooterProps) {
  return (
    <footer className="bg-brand-black text-white border-t border-border/10">
      {/* Bandeau d'engagement réassurance Footer */}
      <div className="border-b border-white/10 bg-white/5 py-6">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <Truck className="h-6 w-6 text-brand-gold shrink-0" />
            <div>
              <p className="font-semibold text-sm">Livraison Gratuite</p>
              <p className="text-xs text-brand-gray">Partout au Maroc sans frais cachés</p>
            </div>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-3">
            <ShieldCheck className="h-6 w-6 text-brand-gold shrink-0" />
            <div>
              <p className="font-semibold text-sm">Paiement à la Réception</p>
              <p className="text-xs text-brand-gray">Réglez votre commande en toute sécurité</p>
            </div>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-3">
            <Phone className="h-6 w-6 text-brand-gold shrink-0" />
            <div>
              <p className="font-semibold text-sm">WhatsApp Business Direct</p>
              <p className="text-xs text-brand-gray">{siteConfig.phoneDisplay}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal du Footer */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Colonne 1 : Présentation de la boutique & Logo */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={storeLogo}
                alt="El Bahli Store"
                className="h-12 w-12 rounded-full object-contain bg-white p-0.5 border border-white/20 shadow-xs"
              />
              <div>
                <span className="font-bold text-lg tracking-tight text-white block">
                  EL BAHLI <span className="text-brand-gold">STORE</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest text-brand-gray font-semibold">
                  Mode Masculine
                </span>
              </div>
            </div>
            <p className="text-xs text-brand-gray leading-relaxed">
              {siteConfig.description}
            </p>
            <div className="pt-2">
              <span className="text-xs text-brand-gray block mb-2 font-medium">
                Rejoignez notre communauté :
              </span>
              <SocialLinks iconClassName="h-5 w-5" />
            </div>
          </div>

          {/* Colonne 2 : Catégories (1ère partie) */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-wider text-brand-gold">
              Collections
            </h3>
            <ul className="space-y-2 text-xs text-brand-gray">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/categories/${cat.slug}`}
                    className="hover:text-brand-gold transition-colors inline-flex items-center gap-1"
                  >
                    <span>{cat.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Colonne 3 : Catégories (2ème partie) */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-wider text-brand-gold">
              Vestiaire & Accessoires
            </h3>
            <ul className="space-y-2 text-xs text-brand-gray">
              {categories.slice(6).map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/categories/${cat.slug}`}
                    className="hover:text-brand-gold transition-colors inline-flex items-center gap-1"
                  >
                    <span>{cat.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Colonne 4 : Contact Officiel WhatsApp */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase font-bold tracking-wider text-brand-gold">
              Contact & Commandes
            </h3>
            <p className="text-xs text-brand-gray">
              Notre équipe est joignable directement par WhatsApp pour toute question sur nos tailles, arrivages ou commandes.
            </p>
            <a
              href={siteConfig.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-brand-gold text-brand-black text-xs font-bold hover:bg-brand-gold/90 transition-colors shadow-sm"
            >
              <span>Discuter sur WhatsApp</span>
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <p className="text-[11px] text-brand-gray">
              Numéro officiel : <span className="text-white font-medium">{siteConfig.phoneDisplay}</span>
            </p>
          </div>
        </div>

        {/* Ligne inférieure de Copyright */}
        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-brand-gray">
          <p>© {CURRENT_YEAR} {siteConfig.name}. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <span className="text-brand-gold font-medium">
              « {siteConfig.announcement} »
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
