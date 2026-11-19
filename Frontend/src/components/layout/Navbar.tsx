import { Link } from "react-router-dom"
import { Store, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Store className="h-6 w-6 text-brand-gold" />
          <span className="font-extrabold tracking-tight text-lg">
            EL BAHLI <span className="text-brand-gold">STORE</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            to="/dev-check"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Vérification UI
          </Link>
          <Button variant="outline" size="sm" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            <span>Panier</span>
          </Button>
        </nav>
      </div>
    </header>
  )
}
