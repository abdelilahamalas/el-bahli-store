import { useEffect } from "react"

export interface PageMetaOptions {
  title: string
  description?: string
  canonical?: string
  noindex?: boolean
}

/**
 * Hook réutilisable pour mettre à jour les métadonnées SEO de chaque page :
 * - document.title
 * - meta[name="description"]
 * - link[rel="canonical"]
 * - meta[name="robots"] (noindex sur les pages privées / panier / admin)
 */
export function usePageMeta({ title, description, canonical, noindex = false }: PageMetaOptions) {
  useEffect(() => {
    // 1. Titre du document
    document.title = title

    // 2. Meta description
    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (description) {
      if (!metaDesc) {
        metaDesc = document.createElement("meta")
        metaDesc.setAttribute("name", "description")
        document.head.appendChild(metaDesc)
      }
      metaDesc.setAttribute("content", description)
    }

    // 3. Balise Link Canonical (créée si absente, sinon mise à jour)
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (canonical) {
      if (!linkCanonical) {
        linkCanonical = document.createElement("link")
        linkCanonical.setAttribute("rel", "canonical")
        document.head.appendChild(linkCanonical)
      }
      linkCanonical.setAttribute("href", canonical)
    }

    // 4. Balise Robots (noindex, nofollow) pour pages privées, panier, checkout, admin
    let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null
    if (noindex) {
      if (!metaRobots) {
        metaRobots = document.createElement("meta")
        metaRobots.setAttribute("name", "robots")
        document.head.appendChild(metaRobots)
      }
      metaRobots.setAttribute("content", "noindex, nofollow")
    } else if (metaRobots) {
      metaRobots.remove()
    }

    // Nettoyage au démontage pour ne jamais laisser un noindex contaminer une autre page
    return () => {
      if (noindex) {
        const currentRobots = document.querySelector('meta[name="robots"]')
        if (currentRobots) {
          currentRobots.remove()
        }
      }
    }
  }, [title, description, canonical, noindex])
}

export default usePageMeta
