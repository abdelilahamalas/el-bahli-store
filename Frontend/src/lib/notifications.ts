/**
 * Système centralisé de notifications et messages - El Bahli Store
 * Conforme au design sombre de référence (#18181B, coins 20px, typographie blanche et grise, bordures adaptées)
 */
import { toast, type ExternalToast } from "sonner"

export interface NotifyOptions extends ExternalToast {
  /** Titre optionnel si premier paramètre est un objet */
  title?: string
  /** Description détaillée en gris clair */
  description?: string
}

/**
 * Normalise les arguments pour supporter :
 * notify.success("Titre", "Description")
 * notify.success("Titre")
 * notify.success("Titre", { description: "..." })
 */
function normalizeArgs(
  titleOrOptions: string | NotifyOptions,
  descriptionOrOptions?: string | ExternalToast,
  extraOptions?: ExternalToast
): { title: string; options: ExternalToast } {
  if (typeof titleOrOptions === "object") {
    const { title = "", description, ...rest } = titleOrOptions
    return {
      title,
      options: {
        ...(description ? { description } : {}),
        ...rest,
      },
    }
  }

  const title = titleOrOptions

  if (typeof descriptionOrOptions === "string") {
    return {
      title,
      options: {
        description: descriptionOrOptions,
        ...extraOptions,
      },
    }
  }

  return {
    title,
    options: descriptionOrOptions || {},
  }
}

/**
 * Service centralisé de notifications
 */
export const notify = {
  /**
   * Notification de Succès (Icône CheckCircle verte, bordure émeraude)
   * Pour : Produit ajouté/modifié, Catégorie créée, Commande confirmée/livrée/payée, Stock mis à jour
   */
  success: (
    titleOrOptions: string | NotifyOptions,
    descriptionOrOptions?: string | ExternalToast,
    extraOptions?: ExternalToast
  ) => {
    const { title, options } = normalizeArgs(titleOrOptions, descriptionOrOptions, extraOptions)
    return toast.success(title, options)
  },

  /**
   * Notification d'Erreur (Icône CircleAlert rouge, bordure rose/rouge)
   * Pour : Erreur lors de l'ajout/modif, Erreur serveur, Connexion échouée, Action impossible
   */
  error: (
    titleOrOptions: string | NotifyOptions,
    descriptionOrOptions?: string | ExternalToast,
    extraOptions?: ExternalToast
  ) => {
    const { title, options } = normalizeArgs(titleOrOptions, descriptionOrOptions, extraOptions)
    return toast.error(title, options)
  },

  /**
   * Notification de Refus (Icône XCircle rouge, bordure rose/rouge)
   * Pour : Suppression refusée, Commande refusée/annulée, Opération non autorisée
   */
  refusal: (
    titleOrOptions: string | NotifyOptions = "Action refusée",
    descriptionOrOptions?: string | ExternalToast,
    extraOptions?: ExternalToast
  ) => {
    const { title, options } = normalizeArgs(titleOrOptions, descriptionOrOptions, extraOptions)
    return toast.error(title, {
      ...options,
    })
  },

  /**
   * Notification d'Avertissement (Icône TriangleAlert orange, bordure ambre)
   * Pour : Stock faible, Champ obligatoire manquant, Information à vérifier
   */
  warning: (
    titleOrOptions: string | NotifyOptions,
    descriptionOrOptions?: string | ExternalToast,
    extraOptions?: ExternalToast
  ) => {
    const { title, options } = normalizeArgs(titleOrOptions, descriptionOrOptions, extraOptions)
    return toast.warning(title, options)
  },

  /**
   * Notification d'Information (Icône Info bleue, bordure bleue/neutre)
   * Pour : Information générale, Action en cours, Mise à jour informative
   */
  info: (
    titleOrOptions: string | NotifyOptions,
    descriptionOrOptions?: string | ExternalToast,
    extraOptions?: ExternalToast
  ) => {
    const { title, options } = normalizeArgs(titleOrOptions, descriptionOrOptions, extraOptions)
    return toast.info(title, options)
  },

  /**
   * Analyse automatique d'une erreur Axios / Laravel et affichage de la notification d'erreur correspondante
   */
  fromAxiosError: (
    err: unknown,
    fallbackTitle = "Une erreur est survenue",
    fallbackDesc = "Impossible de terminer l'opération. Veuillez réessayer."
  ) => {
    let title = fallbackTitle
    let description = fallbackDesc

    if (err && typeof err === "object" && "response" in err) {
      const axiosErr = err as {
        response?: {
          status?: number
          data?: {
            message?: string
            errors?: Record<string, string[] | string>
          }
        }
      }

      const status = axiosErr.response?.status
      const data = axiosErr.response?.data

      if (status === 401) {
        title = "Session expirée"
        description = "Veuillez vous reconnecter pour continuer."
      } else if (status === 403) {
        title = "Action non autorisée"
        description = data?.message || "Vous n'avez pas les autorisations nécessaires pour cette action."
      } else if (status === 404) {
        title = "Ressource introuvable"
        description = data?.message || "L'élément demandé n'existe pas ou a été déplacé."
      } else if (status === 422 && data?.errors) {
        title = "Données invalides"
        // Récupérer le premier message d'erreur de validation
        const firstKey = Object.keys(data.errors)[0]
        const firstVal = data.errors[firstKey]
        description = Array.isArray(firstVal) ? firstVal[0] : String(firstVal)
      } else if (data?.message) {
        description = data.message
      } else if (status && status >= 500) {
        title = "Erreur serveur"
        description = "Un problème est survenu côté serveur. Veuillez réessayer ultérieurement."
      }
    } else if (err instanceof Error) {
      if (err.message.includes("Network Error")) {
        title = "Erreur de connexion"
        description = "Impossible de joindre le serveur. Vérifiez votre connexion internet."
      } else {
        description = err.message
      }
    }

    return toast.error(title, { description })
  },

  /**
   * Ferme manuellement une notification ou toutes
   */
  dismiss: (id?: string | number) => toast.dismiss(id),
}

export { toast }
