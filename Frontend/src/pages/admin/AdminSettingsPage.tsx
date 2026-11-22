import { useEffect, useState, type FormEvent } from "react"
import { Store, Phone, AlertCircle, Check, Info } from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { StoreSettings } from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [storeName, setStoreName] = useState("")
  const [storePhone, setStorePhone] = useState("")
  const [storeEmail, setStoreEmail] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [instagramUrl, setInstagramUrl] = useState("")
  const [tiktokUrl, setTiktokUrl] = useState("")
  const [storeCity, setStoreCity] = useState("")
  const [storeAddress, setStoreAddress] = useState("")
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await adminService.getSettings()
      setSettings(res)
      setStoreName(res.store_name)
      setStorePhone(res.store_phone || "")
      setStoreEmail(res.store_email || "")
      setWhatsappNumber(res.whatsapp_number || "")
      setInstagramUrl(res.instagram_url || "")
      setTiktokUrl(res.tiktok_url || "")
      setStoreCity(res.store_city || "Tanger")
      setStoreAddress(res.store_address || "Tanger, Maroc")
      setLowStockThreshold(res.low_stock_threshold || 5)
    } catch {
      toast.error("Chargement impossible", {
        description: "Erreur lors de la récupération des paramètres de la boutique.",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!storeName.trim()) {
      toast.warning("Champ obligatoire", {
        description: "Le nom de la boutique est obligatoire.",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const updated = await adminService.updateSettings({
        store_name: storeName.trim(),
        store_phone: storePhone.trim() || undefined,
        store_email: storeEmail.trim() || undefined,
        whatsapp_number: whatsappNumber.trim() || undefined,
        instagram_url: instagramUrl.trim() || undefined,
        tiktok_url: tiktokUrl.trim() || undefined,
        store_city: storeCity.trim() || undefined,
        store_address: storeAddress.trim() || undefined,
        low_stock_threshold: lowStockThreshold,
      })
      setSettings(updated)
      toast.success("Paramètres enregistrés", {
        description: "Les paramètres de la boutique ont été mis à jour avec succès.",
      })
    } catch {
      toast.error("Enregistrement impossible", {
        description: "Une erreur est survenue lors de la sauvegarde des paramètres.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="space-y-6 max-w-4xl py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Paramètres de la boutique
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Informations générales, coordonnées du service client et alertes d'inventaire.
          </p>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#111111] hover:bg-[#252525] text-white text-xs font-semibold h-9 px-5 gap-1.5 shadow-xs"
        >
          {isSubmitting ? (
            <div className="w-3.5 h-3.5 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5 text-[#C9A227]" />
          )}
          {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </div>

      {/* Main Settings Card */}
      <Card className="border-border bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Store className="w-4 h-4 text-[#C9A227]" />
            Identité de la boutique
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Nom affiché sur le site et informations publiques.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="storeName" className="text-xs font-semibold">
                Nom officiel de la marque <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="storeCity" className="text-xs font-semibold">
                Ville principale
              </Label>
              <Input
                id="storeCity"
                value={storeCity}
                onChange={(e) => setStoreCity(e.target.value)}
                placeholder="Ex: Tanger"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="storeAddress" className="text-xs font-semibold">
              Adresse physique ou siège
            </Label>
            <Input
              id="storeAddress"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              placeholder="Ex: Tanger, Maroc"
              className="h-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact & Social Links Card */}
      <Card className="border-border bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#C9A227]" />
            Service client et Réseaux sociaux
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Coordonnées utilisées pour rassurer les clients et répondre à leurs questions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="storePhone" className="text-xs font-semibold">
                Numéro de téléphone
              </Label>
              <Input
                id="storePhone"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="Ex: +212 600 000000"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatsappNumber" className="text-xs font-semibold">
                Numéro WhatsApp officiel
              </Label>
              <Input
                id="whatsappNumber"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="Ex: 212600000000"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="storeEmail" className="text-xs font-semibold">
                Adresse e-mail de contact
              </Label>
              <Input
                id="storeEmail"
                type="email"
                value={storeEmail}
                onChange={(e) => setStoreEmail(e.target.value)}
                placeholder="contact@exemple.com"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instagramUrl" className="text-xs font-semibold">
                Lien Instagram
              </Label>
              <Input
                id="instagramUrl"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/..."
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tiktokUrl" className="text-xs font-semibold">
              Lien TikTok
            </Label>
            <Input
              id="tiktokUrl"
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
              placeholder="https://tiktok.com/@..."
              className="h-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stock Alerts & Rules Card */}
      <Card className="border-border bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#C9A227]" />
            Seuil d'alerte de stock
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Niveau en deçà duquel un article est considéré en « stock faible ».
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="lowStockThreshold" className="text-xs font-semibold">
              Seuil de stock faible (unités)
            </Label>
            <Input
              id="lowStockThreshold"
              type="number"
              min="1"
              max="50"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-9 text-xs"
            />
          </div>

          <Alert className="border-border bg-muted/30">
            <Info className="w-4 h-4 text-[#C9A227]" />
            <AlertTitle className="text-xs font-semibold text-foreground">
              Politique de livraison et paiement :
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground space-y-1 mt-1">
              <p>• Paiement : Exclusivement à la livraison (Cash on Delivery - COD)</p>
              <p>• Frais de port : 0.00 MAD (Livraison gratuite dans tout le Royaume du Maroc)</p>
              <p>• Devise officielle : MAD (Dirham Marocain)</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </form>
  )
}
