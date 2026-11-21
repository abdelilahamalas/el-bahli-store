import { useState, type FormEvent } from "react"
import { useNavigate, useLocation, Navigate } from "react-router-dom"
import { Check, Loader2, AlertCircle } from "lucide-react"
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
    <div className="min-h-screen w-full flex bg-[#F9F9F8]">
      {/* 1. Colonne Gauche Sombre — Identique à la maquette de référence */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0D0D0D] text-white p-12 xl:p-16 flex-col justify-between select-none relative overflow-hidden">
        {/* Logo officiel en médaillon circulaire avec bordure or */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden border border-[#C9A227]/70 bg-black flex items-center justify-center p-0.5 shadow-sm">
            <img
              src={logoImg}
              alt="Logo officiel El Bahli Store"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-widest text-[#C9A227] uppercase block">
              EL BAHLI
            </span>
            <span className="font-bold text-xs tracking-wider text-white uppercase block">
              STORE
            </span>
          </div>
        </div>

        {/* Bloc central avec titre et checkmarks */}
        <div className="max-w-md space-y-6 my-auto py-12">
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Espace administrateur
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Gérez vos commandes, vos produits, vos catégories et votre stock depuis un seul endroit.
          </p>

          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-3 text-sm text-neutral-200">
              <span className="w-5 h-5 rounded-full bg-[#C9A227]/20 text-[#C9A227] flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </span>
              <span>Voir et confirmer les commandes</span>
            </div>

            <div className="flex items-center gap-3 text-sm text-neutral-200">
              <span className="w-5 h-5 rounded-full bg-[#C9A227]/20 text-[#C9A227] flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </span>
              <span>Ajouter ou supprimer des produits par catégorie</span>
            </div>

            <div className="flex items-center gap-3 text-sm text-neutral-200">
              <span className="w-5 h-5 rounded-full bg-[#C9A227]/20 text-[#C9A227] flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </span>
              <span>Suivre le stock et les encaissements</span>
            </div>
          </div>
        </div>

        {/* Copyright conforme à la maquette */}
        <div className="text-xs text-neutral-500">
          © 2026 El Bahli Store · Tous droits réservés
        </div>
      </div>

      {/* 2. Colonne Droite Claire — Formulaire de connexion propre */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md bg-white rounded-2xl border-border/70 shadow-xs">
          <CardHeader className="space-y-1 pb-4">
            {/* Mobile Header (Affiché uniquement sur petits écrans) */}
            <div className="lg:hidden text-center pb-2">
              <div className="w-14 h-14 mx-auto rounded-full overflow-hidden border border-[#C9A227]/70 bg-black flex items-center justify-center p-0.5 mb-2 shadow-sm">
                <img
                  src={logoImg}
                  alt="Logo officiel El Bahli Store"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="font-extrabold text-sm tracking-widest text-[#C9A227] uppercase">
                EL BAHLI STORE
              </span>
            </div>

            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Connexion
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Entrez votre email et votre mot de passe administrateur.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive" className="py-2.5 px-3">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <div className="ml-2">
                  <AlertTitle className="text-xs font-bold">Erreur de connexion</AlertTitle>
                  <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                </div>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                  Email
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

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                  Mot de passe
                </Label>
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
                    className="h-10 pr-20 text-xs bg-white border-border rounded-xl focus-visible:ring-[#C9A227] focus-visible:border-[#C9A227]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#C9A227] hover:text-[#B38F1E] cursor-pointer"
                  >
                    {showPassword ? "Masquer" : "Afficher"}
                  </button>
                </div>
              </div>

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

                <button
                  type="button"
                  onClick={() => toast.info("Contactez l'administrateur principal pour réinitialiser vos identifiants.")}
                  className="text-[#C9A227] hover:underline font-semibold"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                variant="gold"
                className="w-full h-11 text-xs rounded-xl shadow-xs transition-colors mt-2 flex items-center justify-center gap-2 cursor-pointer"
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

          <CardFooter className="pt-2 pb-6 border-t border-border/50 justify-center">
            {/* Note de sécurité conforme à la maquette */}
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Accès réservé à l'administrateur. Après plusieurs tentatives échouées, la connexion est bloquée quelques minutes.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
