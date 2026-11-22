import { useState } from "react"
import { toast } from "sonner"
import { notify } from "@/lib/notifications"
import {
  Store,
  ShoppingBag,
  ShieldCheck,
  CheckCircle,
  Wifi,
  AlertCircle,
  ChevronRight,
  ExternalLink,
} from "lucide-react"

import api from "@/services/api"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function DevCheckPage() {
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [apiData, setApiData] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleTestBackend = async () => {
    setApiStatus("loading")
    try {
      const response = await api.get("/categories")
      setApiStatus("success")
      setApiData(
        JSON.stringify(
          {
            status: response.status,
            statusText: response.statusText,
            count: Array.isArray(response.data?.data)
              ? response.data.data.length
              : Array.isArray(response.data)
              ? response.data.length
              : "N/A",
            sample: response.data,
          },
          null,
          2
        )
      )
      toast.success("Connexion au backend Laravel réussie !", {
        description: "L'API a répondu avec succès sur /categories.",
      })
    } catch (err: unknown) {
      setApiStatus("error")
      const message = err instanceof Error ? err.message : "Erreur de connexion"
      setApiData(JSON.stringify({ error: message }, null, 2))
      toast.error("Échec de la connexion au backend Laravel", {
        description: message,
      })
    }
  }

  return (
    <div className="min-h-screen bg-brand-lightGray/40 text-foreground py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="bg-brand-black text-white p-8 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-brand-gold/30">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" />
              Phase 21 — Validation Environnement Frontend
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              El Bahli Store <span className="text-brand-gold">Architecture UI</span>
            </h1>
            <p className="text-brand-gray text-sm max-w-xl">
              Vérification complète de la pile React 19, TypeScript, Tailwind CSS, shadcn/ui,
              icônes Lucide, toasts Sonner et connectivité Axios.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              onClick={() =>
                notify.success(
                  "Produit ajouté avec succès",
                  "Le produit a été enregistré dans la boutique."
                )
              }
            >
              Test Succès
            </Button>
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
              onClick={() =>
                notify.error(
                  "Impossible d'ajouter le produit",
                  "Une erreur est survenue pendant l'enregistrement."
                )
              }
            >
              Test Erreur
            </Button>
            <Button
              size="sm"
              className="bg-rose-800 hover:bg-rose-900 text-white text-xs"
              onClick={() =>
                notify.refusal(
                  "Action refusée",
                  "Cette opération n'est pas autorisée pour cette commande."
                )
              }
            >
              Test Refus
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
              onClick={() =>
                notify.warning(
                  "Stock faible",
                  "Il ne reste plus que 2 unités pour cette variante."
                )
              }
            >
              Test Avertissement
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              onClick={() =>
                notify.info(
                  "Information",
                  "Mise à jour des stocks en cours de synchronisation."
                )
              }
            >
              Test Information
            </Button>
          </div>
        </div>

        {/* Section 1 : Palette officielle de la marque */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Store className="h-5 w-5 text-brand-gold" />
              1. Palette Officielle El Bahli Store
            </CardTitle>
            <CardDescription>
              Couleurs fondamentales définies dans la configuration Tailwind.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="p-4 rounded-xl bg-brand-black text-white shadow space-y-2 border border-border">
                <div className="text-xs uppercase font-semibold text-brand-gold">Noir</div>
                <div className="font-mono text-sm">#111111</div>
                <div className="text-xs opacity-70">brand-black</div>
              </div>
              <div className="p-4 rounded-xl bg-brand-gold text-brand-black font-semibold shadow space-y-2">
                <div className="text-xs uppercase text-brand-black/80">Gold</div>
                <div className="font-mono text-sm">#C9A227</div>
                <div className="text-xs text-brand-black/80">brand-gold</div>
              </div>
              <div className="p-4 rounded-xl bg-brand-white text-brand-black shadow space-y-2 border border-border">
                <div className="text-xs uppercase font-semibold text-brand-gray">Blanc</div>
                <div className="font-mono text-sm">#FFFFFF</div>
                <div className="text-xs text-brand-gray">brand-white</div>
              </div>
              <div className="p-4 rounded-xl bg-brand-lightGray text-brand-black shadow space-y-2 border border-border">
                <div className="text-xs uppercase font-semibold text-brand-gray">Gris Clair</div>
                <div className="font-mono text-sm">#F5F5F5</div>
                <div className="text-xs text-brand-gray">brand-lightGray</div>
              </div>
              <div className="p-4 rounded-xl bg-brand-gray text-white shadow space-y-2">
                <div className="text-xs uppercase font-semibold text-white/80">Gris Secondaire</div>
                <div className="font-mono text-sm">#777777</div>
                <div className="text-xs opacity-80">brand-gray</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2 : Boutons & Variantes */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-brand-gold" />
              2. Variantes de Boutons shadcn/ui
            </CardTitle>
            <CardDescription>
              Composants Button personnalisés intégrant la charte graphique de la boutique.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Button variant="default">Default (Noir)</Button>
            <Button variant="gold">Gold (Boutique)</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </CardContent>
        </Card>

        {/* Section 3 : Badges, Icônes et Dialogues */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-brand-gold" />
                3. Badges & Icônes Lucide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="gold">Gold Officiel</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Épuisé</Badge>
              </div>
              <div className="p-4 rounded-lg bg-muted flex items-center justify-around">
                <div className="flex flex-col items-center gap-1 text-xs">
                  <Store className="h-6 w-6 text-brand-gold" />
                  <span>Store</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-xs">
                  <ShoppingBag className="h-6 w-6 text-brand-black" />
                  <span>ShoppingBag</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-xs">
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                  <span>ShieldCheck</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-xs">
                  <CheckCircle className="h-6 w-6 text-brand-gold" />
                  <span>CheckCircle</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-brand-gold" />
                4. Composants Interactifs (Dialog & Dropdown)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 items-center">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Ouvrir Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Validation Modal shadcn/ui</DialogTitle>
                    <DialogDescription>
                      Cette boîte de dialogue confirme le fonctionnement correct des primitives Radix UI
                      dans l'environnement React 19 d'El Bahli Store.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-3">
                    <Label htmlFor="sample-input">Champ de saisie test</Label>
                    <Input id="sample-input" placeholder="Ex. Taille XL ou Code Promo" />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Fermer
                    </Button>
                    <Button variant="gold" onClick={() => setIsDialogOpen(false)}>
                      Confirmer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Menu Déroulant <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions Rapides</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toast.info("Option Catalogue sélectionnée")}>
                    Voir Catalogue
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info("Option Panier sélectionnée")}>
                    Mon Panier
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toast.info("Option Admin sélectionnée")}>
                    Accès Administration
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        </div>

        {/* Section 4 : Onglets & Tableaux */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">5. Onglets (Tabs) & Tableaux (Table)</CardTitle>
            <CardDescription>
              Vérification des structures de données et de navigation par onglets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview">
              <TabsList className="mb-4">
                <TabsTrigger value="preview">Aperçu Variantes</TabsTrigger>
                <TabsTrigger value="specs">Spécifications UI</TabsTrigger>
              </TabsList>
              <TabsContent value="preview">
                <Table>
                  <TableCaption>Exemple de structure des variantes et stocks</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Taille</TableHead>
                      <TableHead>Couleur</TableHead>
                      <TableHead>Stock Disponible</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold">M</TableCell>
                      <TableCell>Noir classique</TableCell>
                      <TableCell>14 unités</TableCell>
                      <TableCell>
                        <Badge variant="gold">En Stock</Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">L</TableCell>
                      <TableCell>Noir classique</TableCell>
                      <TableCell>2 unités</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Stock Faible</Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">XL</TableCell>
                      <TableCell>Noir classique</TableCell>
                      <TableCell>0 unité</TableCell>
                      <TableCell>
                        <Badge variant="destructive">Épuisé</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="specs">
                <div className="p-4 bg-muted rounded-lg text-sm space-y-1">
                  <p><strong>Stack :</strong> React 19 + TypeScript + Vite + Tailwind CSS</p>
                  <p><strong>Composants :</strong> shadcn/ui avec Radix Primitives</p>
                  <p><strong>API Client :</strong> Axios avec intercepteur Bearer Sanctum</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Section 5 : Test de Connectivité Backend Laravel */}
        <Card className="border-brand-gold/40 shadow-md">
          <CardHeader className="bg-brand-black text-white rounded-t-xl">
            <CardTitle className="text-xl flex items-center gap-2">
              <Wifi className="h-5 w-5 text-brand-gold" />
              6. Test de Connectivité API Backend Laravel
            </CardTitle>
            <CardDescription className="text-brand-gray">
              Requête Axios réelle vers <code>GET /categories</code> sur{" "}
              <span className="text-brand-gold">
                {import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1"}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <Button
                variant="gold"
                disabled={apiStatus === "loading"}
                onClick={handleTestBackend}
              >
                {apiStatus === "loading" ? "Connexion en cours..." : "Tester GET /categories"}
              </Button>
              {apiStatus === "success" && (
                <div className="inline-flex items-center gap-2 text-green-600 font-medium text-sm">
                  <CheckCircle className="h-5 w-5" />
                  API accessible et fonctionnelle
                </div>
              )}
              {apiStatus === "error" && (
                <div className="inline-flex items-center gap-2 text-red-600 font-medium text-sm">
                  <AlertCircle className="h-5 w-5" />
                  Erreur de communication API
                </div>
              )}
            </div>

            {apiData && (
              <pre className="p-4 rounded-lg bg-brand-black text-emerald-400 font-mono text-xs overflow-x-auto max-h-64 border border-border">
                {apiData}
              </pre>
            )}
          </CardContent>
          <CardFooter className="bg-muted/40 text-xs text-muted-foreground flex justify-between">
            <span>Environnement : {import.meta.env.MODE}</span>
            <span>Domaine de dev : http://localhost:5173</span>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
