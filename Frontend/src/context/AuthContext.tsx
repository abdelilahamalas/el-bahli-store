import { createContext, useState, type ReactNode } from "react"
import type { User } from "@/types/api"
import { getAuthToken, setAuthToken, removeAuthToken } from "@/services/api"

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(() => getAuthToken())

  const login = (newToken: string, newUser: User) => {
    setAuthToken(newToken)
    setTokenState(newToken)
    setUser(newUser)
  }

  const logout = () => {
    removeAuthToken()
    setTokenState(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
