import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  timeout: 15000,
})

// Clé de stockage du jeton d'authentification Sanctum
const TOKEN_STORAGE_KEY = "el_bahli_token"

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY)
}

export const setAuthToken = (token: string, remember: boolean = false): void => {
  if (remember) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  } else {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

export const removeAuthToken = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  sessionStorage.removeItem(TOKEN_STORAGE_KEY)
}

// Génération d'un UUID v4 léger pour le tracking des requêtes
function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return "req-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now().toString(36)
}

// Intercepteur de requête : injection du jeton Bearer et de l'en-tête de corrélation
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Identifiant de corrélation unique pour chaque requête
    if (config.headers && !config.headers["X-Request-ID"]) {
      config.headers["X-Request-ID"] = generateRequestId()
    }

    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Intercepteur de réponse : normalisation des messages d'erreur en français
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]>; code?: string; request_id?: string }>) => {
    // Si la requête a été volontairement annulée (ex. navigation, changement de filtre, React StrictMode), ne pas la traiter comme une erreur réseau
    if (axios.isCancel(error) || error.name === "CanceledError" || error.code === "ERR_CANCELED") {
      return Promise.reject(error)
    }

    const status = error.response?.status
    const data = error.response?.data

    // Déconnexion et nettoyage en cas de 401
    if (status === 401) {
      removeAuthToken()
    }

    let defaultMsg = "Une erreur inattendue est survenue. Veuillez réessayer."

    if (!error.response) {
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        defaultMsg = "Le serveur met trop de temps à répondre. Veuillez vérifier votre connexion et réessayer."
      } else {
        defaultMsg = "Connexion au serveur impossible. Vérifiez votre connexion Internet."
      }
    } else {
      switch (status) {
        case 400:
          defaultMsg = "Requête incorrecte. Vérifiez les informations saisies."
          break
        case 401:
          defaultMsg = "Session expirée ou non autorisé. Veuillez vous reconnecter."
          break
        case 403:
          defaultMsg = "Accès refusé. Vous ne disposez pas des autorisations nécessaires."
          break
        case 404:
          defaultMsg = "Ressource introuvable ou indisponible."
          break
        case 409:
          defaultMsg = "Conflit détecté lors de l'opération."
          break
        case 422:
          defaultMsg = "Vérifiez les informations indiquées dans le formulaire."
          break
        case 429:
          defaultMsg = "Trop de requêtes. Veuillez patienter un instant avant de réessayer."
          break
        case 500:
          defaultMsg = "Une erreur interne est survenue sur le serveur. Veuillez réessayer plus tard."
          break
        case 502:
        case 503:
        case 504:
          defaultMsg = "Le service est temporairement indisponible. Veuillez réessayer dans quelques instants."
          break
      }
    }

    // Si le serveur a déjà fourni un message explicite en français, le conserver
    if (data?.message && typeof data.message === "string" && data.message.trim().length > 0) {
      defaultMsg = data.message.trim()
    }

    // Enrichir l'objet d'erreur pour les composants appelants
    if (error.response?.data) {
      error.response.data.message = defaultMsg
    }
    error.message = defaultMsg

    return Promise.reject(error)
  }
)

export default api
