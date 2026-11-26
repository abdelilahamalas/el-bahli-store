import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  eventId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    eventId: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    const eventId = "ERR-" + Math.random().toString(36).substring(2, 9).toUpperCase()
    return { hasError: true, error, eventId }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an error]", error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, eventId: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Une difficulté d'affichage est survenue
          </h2>
          <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
            La page a rencontré une difficulté technique temporaire. Vous pouvez actualiser la page pour relancer le chargement ou revenir à la boutique.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={this.handleReset}
              variant="outline"
              className="gap-2 rounded-xl text-xs font-semibold h-10 px-4 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualiser la page</span>
            </Button>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null, eventId: null })
                window.location.href = "/"
              }}
              variant="gold"
              className="gap-2 rounded-xl text-xs font-bold h-10 px-4 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Retour à l'accueil</span>
            </Button>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <details className="mt-8 text-left max-w-xl w-full p-4 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono overflow-auto border border-slate-800">
              <summary className="cursor-pointer font-bold text-amber-400 mb-2">
                Détails techniques (Visible uniquement en développement - Code: {this.state.eventId})
              </summary>
              <p className="font-semibold text-rose-400 mb-2">{this.state.error.toString()}</p>
              <pre className="whitespace-pre-wrap text-[11px] text-slate-400">{this.state.error.stack}</pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
