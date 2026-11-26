import { Link } from "react-router-dom"
import { ArrowLeft, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full space-y-6">
        <div className="space-y-2">
          <p className="text-6xl font-black tracking-tight text-[#111111]">404</p>
          <h1 className="text-xl font-bold text-slate-900">Page introuvable</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            La page que vous recherchez n'existe pas, a été déplacée ou son URL est incorrecte.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            className="w-full sm:w-auto bg-[#111111] hover:bg-slate-800 text-white text-xs font-semibold h-10 px-5 rounded-lg shadow-xs"
          >
            <Link to="/" className="inline-flex items-center gap-2">
              <Home className="w-4 h-4" />
              <span>Retour à l'accueil</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto text-xs font-semibold h-10 px-4 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5 text-slate-500" />
            <span>Page précédente</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
