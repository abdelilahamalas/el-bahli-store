import { useState, type FormEvent } from "react"
import { useNavigate, useLocation, Navigate } from "react-router-dom"
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { adminService } from "@/services/adminService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import logoImg from "@/images/logo store.jpeg"

export default function AdminLoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
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
        remember: rememberMe,
      })

      login(response.token, response.user, rememberMe)
      toast.success("Connexion réussie", {
        description: `Bienvenue dans l'espace administration, ${response.user.name}.`,
      })

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
      toast.error("Erreur de connexion", {
        description: msg,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F5F5F5] p-4 sm:p-6 select-none">
      <div className="w-full max-w-[420px] space-y-4">
        {/* Card centrale unique */}
        <Card className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <CardHeader className="items-center space-y-3 text-center pt-8 pb-4">
            {/* Logo officiel circulaire avec anneau or */}
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#C9A227] bg-black p-0.5 shadow-sm transition-transform hover:scale-105 duration-200">
              <img
                src={logoImg}
                alt="Logo officiel El Bahli Store"
                className="w-full h-full object-cover rounded-full"
              />
            </div>

            <div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Connexion administrateur
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Accédez à votre espace de gestion.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-6 sm:px-8 py-2">
            {/* Message d'erreur en alerte shadcn/ui */}
            {errorMessage && (
              <Alert variant="destructive" className="mb-5">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <AlertTitle>Erreur de connexion</AlertTitle>
                <AlertDescription className="alert-desc">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Champ Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                  Adresse e-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@elbahli.ma"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-10 text-xs bg-white border-border rounded-xl focus-visible:ring-[#C9A227] focus-visible:border-[#C9A227]"
                />
              </div>

              {/* Champ Mot de passe avec toggle Eye / EyeOff */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                    Mot de passe
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="h-10 pr-10 text-xs bg-white border-border rounded-xl focus-visible:ring-[#C9A227] focus-visible:border-[#C9A227]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Se souvenir de moi & Mot de passe oublié */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label
                    htmlFor="remember-me"
                    className="text-xs font-normal text-muted-foreground hover:text-foreground cursor-pointer select-none"
                  >
                    Se souvenir de moi
                  </Label>
                </div>

                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => toast.info("Contactez l'administrateur système pour réinitialiser vos identifiants.")}
                  className="text-xs text-[#C9A227] hover:underline p-0 h-auto font-medium"
                >
                  Mot de passe oublié ?
                </Button>
              </div>

              {/* Bouton de connexion */}
              <Button
                type="submit"
                disabled={isLoading}
                variant="gold"
                className="w-full h-10 text-xs font-bold rounded-xl shadow-xs transition-all mt-3 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#111111]" />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <span>Se connecter</span>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="px-6 sm:px-8 pt-4 pb-6 border-t border-border/50 justify-center">
            {/* Note de sécurité officielle */}
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Accès réservé à l'administrateur. Après plusieurs tentatives échouées, la connexion est bloquée quelques minutes.
            </p>
          </CardFooter>
        </Card>

        {/* Copyright discret en bas */}
        <div className="text-center text-[11px] text-muted-foreground">
          © 2026 El Bahli Store · Tous droits réservés
        </div>
      </div>
    </div>
  )
}
