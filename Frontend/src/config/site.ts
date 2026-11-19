// ============================================================================
// El Bahli Store — Configuration Officielle du Site
// ============================================================================

export const siteConfig = {
  name: "El Bahli Store",
  legalName: "El Bahli Store SARL",
  description:
    "Boutique en ligne de prêt-à-porter masculin au Maroc. Élégance, qualité et style moderne.",
  announcement: "Livraison gratuite partout au Maroc",
  phone: "+212609769858",
  phoneDisplay: "+212 609-769858",
  whatsappUrl: "https://wa.me/212609769858",
  social: {
    instagram: "https://www.instagram.com/el_bahli_store/",
    tiktok: "https://www.tiktok.com/@el_bahli_store",
    whatsapp: "https://wa.me/212609769858",
  },
  reassurance: [
    {
      id: "free-delivery",
      title: "Livraison gratuite",
      description: "Livraison gratuite partout au Maroc sans minimum d'achat.",
    },
    {
      id: "cash-on-delivery",
      title: "Paiement à la réception",
      description: "Réglez votre commande en espèces lors de la livraison.",
    },
    {
      id: "direct-support",
      title: "Contact WhatsApp direct",
      description: "Assistance rapide et personnalisée au +212 609-769858.",
    },
  ],
  // Ordre officiel des 12 catégories du catalogue
  officialCategoriesOrder: [
    "capuches",
    "capuches-zippe",
    "sweat-shirt",
    "polo",
    "jackets",
    "jeans",
    "tenu-montone",
    "pantalons-classe",
    "ensembles",
    "casquettes",
    "t-shirts",
    "chaussures",
  ],
} as const

export type SiteConfig = typeof siteConfig
