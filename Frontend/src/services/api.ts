import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://el-bahli-store.test/api/v1"

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
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export const setAuthToken = (token: string): void => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export const removeAuthToken = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

// Intercepteur de requête : injection automatique du jeton Bearer
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Intercepteur de réponse : gestion globale des erreurs (ex. 401 non autorisé)
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      removeAuthToken()
    }
    return Promise.reject(error)
  }
)

export default api
