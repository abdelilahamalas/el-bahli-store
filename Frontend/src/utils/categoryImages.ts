// ============================================================================
// El Bahli Store — Mapping des Images Officielles (Logo et Catégories)
// ============================================================================

// Logo officiel de la boutique
import storeLogo from "@/images/logo store.jpeg"

// Images officielles des 12 catégories
import capuchesImg from "@/images/categories/Les capuches.jpeg"
import capuchesZippeImg from "@/images/categories/Les capuches zippe.jpeg"
import sweatShirtImg from "@/images/categories/Les sweat-shirt.jpeg"
import poloImg from "@/images/categories/Les polos.jpeg"
import jacketsImg from "@/images/categories/Les jackets.jpeg"
import jeansImg from "@/images/categories/Les jeans.jpeg"
import tenuMontoneImg from "@/images/categories/Les tenus.jpeg"
import pantalonsClasseImg from "@/images/categories/Les pantalons classe.jpeg"
import ensemblesImg from "@/images/categories/Les ensembles.jpeg"
import casquettesImg from "@/images/categories/Les casquettes.jpeg"
import tshirtsImg from "@/images/categories/Les t-shirts.jpeg"
import chaussuresImg from "@/images/categories/Chaussures.jpeg"

export { storeLogo }

/**
 * Dictionnaire associant chaque slug officiel à son image locale réelle.
 */
export const categoryImagesMap: Record<string, string> = {
  capuches: capuchesImg,
  "capuches-zippe": capuchesZippeImg,
  "sweat-shirt": sweatShirtImg,
  polo: poloImg,
  jackets: jacketsImg,
  jeans: jeansImg,
  "tenu-montone": tenuMontoneImg,
  "pantalons-classe": pantalonsClasseImg,
  ensembles: ensemblesImg,
  casquettes: casquettesImg,
  "t-shirts": tshirtsImg,
  chaussures: chaussuresImg,
}

/**
 * Retourne l'image associée à une catégorie en fonction de son image API dynamique, de son slug ou de son nom.
 */
export function getCategoryImage(slugOrName: string, categoryImageUrl?: string | null): string | null {
  if (categoryImageUrl) {
    return categoryImageUrl
  }
  if (!slugOrName) return null

  const normalized = slugOrName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")

  if (categoryImagesMap[normalized]) {
    return categoryImagesMap[normalized]
  }

  // Recherche par correspondance partielle
  for (const [key, value] of Object.entries(categoryImagesMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value
    }
  }

  return null
}
