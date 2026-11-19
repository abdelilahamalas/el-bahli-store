import { createContext, useState, useEffect, type ReactNode } from "react"
import type { AdminUser } from "@/types/admin"
import { getAuthToken, setAuthToken, removeAuthToken } from "@/services/api"
import { adminService } from "@/services/adminService"

const USER_STORAGE_KEY = "el_bahli_user"

interface AuthContextType {
  user: AdminUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: AdminUser) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [token, setTokenState] = useState<string | null>(() => getAuthToken())
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const verifyAuth = async () => {
      const currentToken = getAuthToken()
      if (!currentToken) {
        setIsLoading(false)
        return
      }

      try {
        const adminUser = await adminService.getMe()
        setUser(adminUser)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(adminUser))
      } catch {
        // Token invalid or expired
        removeAuthToken()
        localStorage.removeItem(USER_STORAGE_KEY)
        setTokenState(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    verifyAuth()
  }, [])

  const login = (newToken: string, newUser: AdminUser) => {
    setAuthToken(newToken)
    setTokenState(newToken)
    setUser(newUser)
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser))
  }

  const logout = () => {
    adminService.logout().catch(() => {})
    removeAuthToken()
    localStorage.removeItem(USER_STORAGE_KEY)
    setTokenState(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
