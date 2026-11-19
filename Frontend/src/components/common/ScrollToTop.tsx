import { useEffect } from "react"
import { useLocation } from "react-router-dom"

/**
 * ScrollToTop
 * Réinitialise instantanément le défilement en haut de page à chaque changement de route ou d'URL.
 * Si une ancre (#hash) est présente, fait défiler de manière fluide jusqu'à l'élément ciblé.
 */
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      // Laisser le temps au composant de se monter si changement de route
      const timer = setTimeout(() => {
        const el = document.querySelector(hash)
        if (el) {
          const navHeight = 75
          const targetPosition = el.getBoundingClientRect().top + window.scrollY - navHeight
          window.scrollTo({
            top: targetPosition,
            behavior: "smooth",
          })
        }
      }, 100)

      return () => clearTimeout(timer)
    }

    // Réinitialise le scroll de la fenêtre si pas d'ancre
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    })

    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname, search, hash])

  return null
}
