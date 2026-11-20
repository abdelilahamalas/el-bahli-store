import { useState, type FormEvent } from "react"
import { useNavigate, useLocation, Navigate } from "react-router-dom"
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { adminService } from "@/services/adminService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import logoImg from "@/images/logo store.jpeg"

export default function AdminLoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Redirection si déjà authentifié
  if (isAuthenticated) {
    const destination = (location.state as { from?: { pathname: string } })?.from?.pathname || "/admin"
    return <Navigate to={destination} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !password) {
      setErrorMessage("Veuillez renseigner votre adresse e-mail et votre mot de passe.")
      return
    }

    setIsLoading(true)

    try {
      const response = await adminService.login({
        email: email.trim(),
        password,
      })

      login(response.token, response.user)
      toast.success(`Bienvenue, ${response.user.name}`)

      const destination = (location.state as { from?: { pathname: string } })?.from?.pathname || "/admin"
      navigate(destination, { replace: true })
    } catch (err: unknown) {
      let msg = "Identifiants invalides ou accès non autorisé."
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { message?: string } } }
        if (axErr.response?.data?.message) {
          msg = axErr.response.data.message
        }
      }
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0E0E0E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-[#141414] border-[#262626] text-white shadow-xl">
          <CardHeader className="text-center pb-6 pt-8">
            <div className="mx-auto w-16 h-16 rounded-full overflow-hidden border border-[#C9A227]/60 mb-4 bg-black">
              <img src={logoImg} alt="El Bahli Store" className="w-full h-full object-cover" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              EL BAHLI <span className="text-[#C9A227]">STORE</span>
            </CardTitle>
            <CardDescription className="text-xs text-[#888888] tracking-wider uppercase font-medium mt-1">
              Espace d'administration
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMessage && (
              <div className="mb-5 p-3 rounded-md bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-[#CCCCCC]">
                  Adresse e-mail
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="contact@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pl-9 bg-[#1A1A1A] border-[#333333] text-white placeholder:text-[#666666] focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227] h-10 text-xs rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-[#CCCCCC]">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pl-9 pr-9 bg-[#1A1A1A] border-[#333333] text-white placeholder:text-[#666666] focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227] h-10 text-xs rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777777] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-[#C9A227] hover:bg-[#B38F1E] text-black font-semibold text-xs tracking-wider uppercase transition-colors shadow-xs mt-2 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#222222] flex items-center justify-center gap-2 text-[11px] text-[#777777]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Authentification sécurisée par jeton chiffré</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
