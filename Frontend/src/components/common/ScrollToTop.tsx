import { useEffect } from "react"
import { useLocation } from "react-router-dom"

/**
 * ScrollToTop
 * Réinitialise instantanément le défilement en haut de page à chaque changement de route ou d'URL.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    // Réinitialise le scroll de la fenêtre
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    })

    // Sécurité supplémentaire pour les conteneurs avec scroll interne éventuel
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname, search])

  return null
}
