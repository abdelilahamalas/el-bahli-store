import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
  ShieldCheck,
  Truck,
  Banknote,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { useCart } from "@/hooks/useCart"
import orderService from "@/services/orderService"
import AnnouncementBar from "@/components/layout/AnnouncementBar"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { items, totalCount, subtotal, deliveryFee, total, clearCart } = useCart()

  // Formulaire client
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    city: "",
    address: "",
    note: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  // Validation locale en français
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.customer_name.trim() || formData.customer_name.trim().length < 2) {
      newErrors.customer_name = "Veuillez saisir votre nom complet (au moins 2 caractères)."
    }

    const phoneCleaned = formData.customer_phone.replace(/[\s\-.]/g, "").trim()
    const isMoroccan =
      /^0[567]\d{8}$/.test(phoneCleaned) ||
      /^\+212[567]\d{8}$/.test(phoneCleaned) ||
      /^00212[567]\d{8}$/.test(phoneCleaned)

    if (!phoneCleaned) {
      newErrors.customer_phone = "Le numéro de téléphone est obligatoire pour la livraison."
    } else if (!isMoroccan) {
      newErrors.customer_phone =
        "Veuillez saisir un numéro de téléphone marocain valide (ex : 0612345678 ou +212612345678)."
    }

    if (!formData.city.trim() || formData.city.trim().length < 2) {
      newErrors.city = "La ville de livraison est obligatoire."
    }

    if (!formData.address.trim() || formData.address.trim().length < 5) {
      newErrors.address = "Veuillez préciser votre adresse complète de livraison (au moins 5 caractères)."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError(null)

    if (items.length === 0) {
      toast.warning("Panier vide", {
        description: "Votre panier est vide. Veuillez ajouter des articles avant de commander.",
      })
      navigate("/products")
      return
    }

    if (!validateForm()) {
      toast.warning("Formulaire incomplet", {
        description: "Veuillez vérifier et renseigner correctement vos coordonnées de livraison.",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const orderResult = await orderService.createOrder(formData, items)

      // Stocker les détails de la commande pour la page de confirmation
      sessionStorage.setItem("last_order_data", JSON.stringify(orderResult))

      // Vider le panier UNIQUEMENT après la confirmation effective de Laravel
      clearCart()

      toast.success("Commande enregistrée avec succès", {
        description: `Référence : ${orderResult.reference} · Paiement prévu à la livraison.`,
      })

      // Redirection vers la page de confirmation
      navigate(`/order-success?ref=${encodeURIComponent(orderResult.reference)}`)
    } catch (err: unknown) {
      console.error("Échec de création de la commande :", err)

      // Gestion fine des erreurs Laravel 422 ou 409
      let errorMessage = "Une erreur est survenue lors de l'enregistrement de votre commande. Veuillez réessayer."

      if (typeof err === "object" && err !== null && "response" in err) {
        const axiosErr = err as {
          response?: {
            status?: number
            data?: {
              message?: string
              errors?: Record<string, string[]>
            }
          }
        }

        if (axiosErr.response?.data?.errors) {
          const apiErrors: Record<string, string> = {}
          for (const [key, msgs] of Object.entries(axiosErr.response.data.errors)) {
            apiErrors[key] = Array.isArray(msgs) ? msgs[0] : String(msgs)
          }
          setErrors(apiErrors)
        }

        if (axiosErr.response?.data?.message) {
          errorMessage = axiosErr.response.data.message
        }
      }

      setGeneralError(errorMessage)
      toast.error("Échec de la commande", {
        description: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Redirection si panier vide
  if (items.length === 0 && !isSubmitting) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <AnnouncementBar />
        <Navbar categories={[]} />
        <main className="flex-1 py-16 container mx-auto px-4 flex items-center justify-center">
          <div className="max-w-md w-full p-8 rounded-2xl border border-border text-center space-y-4">
            <h1 className="text-xl font-bold">Votre panier est vide</h1>
            <p className="text-xs text-muted-foreground">
              Vous devez avoir au moins un article dans votre panier pour passer commande.
            </p>
            <div className="pt-2">
              <Link to="/products">
                <Button variant="gold" size="sm" className="font-bold">
                  Retour au catalogue
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer categories={[]} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-brand-gold/30">
      <AnnouncementBar />
      <Navbar categories={[]} />

      <main className="flex-1 py-8 sm:py-12">
        <div className="container mx-auto px-4 space-y-8">
          {/* Fil d'Ariane */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-brand-gold transition-colors">
              Accueil
            </Link>
            <span>/</span>
            <Link to="/cart" className="hover:text-brand-gold transition-colors">
              Mon Panier
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Finaliser la commande</span>
          </nav>

          <div className="border-b pb-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Finaliser ma commande
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Commande express sans inscription. Livraison gratuite partout au Maroc avec règlement en espèces à la livraison.
            </p>
          </div>

          {generalError && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitOrder}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Colonne Gauche : Formulaire de livraison */}
              <div className="lg:col-span-7 space-y-8">
                {/* 1. Coordonnées de livraison */}
                <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-xs">
                  <div className="flex items-center gap-2 border-b pb-3">
                    <span className="h-6 w-6 rounded-full bg-brand-black text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h2 className="font-bold text-base text-foreground">
                      Adresse de Livraison au Maroc
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nom complet */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="customer_name" className="text-xs font-semibold">
                        Nom et Prénom <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="customer_name"
                        placeholder="Ex. Mohammed Alami"
                        value={formData.customer_name}
                        onChange={(e) =>
                          setFormData({ ...formData, customer_name: e.target.value })
                        }
                        className={errors.customer_name ? "border-destructive" : ""}
                        disabled={isSubmitting}
                      />
                      {errors.customer_name && (
                        <p className="text-[11px] text-destructive">{errors.customer_name}</p>
                      )}
                    </div>

                    {/* Téléphone */}
                    <div className="space-y-1.5">
                      <Label htmlFor="customer_phone" className="text-xs font-semibold">
                        Numéro de Téléphone <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="customer_phone"
                        type="tel"
                        placeholder="Ex. 06XXXXXXXX"
                        value={formData.customer_phone}
                        onChange={(e) =>
                          setFormData({ ...formData, customer_phone: e.target.value })
                        }
                        className={errors.customer_phone ? "border-destructive" : ""}
                        disabled={isSubmitting}
                      />
                      {errors.customer_phone ? (
                        <p className="text-[11px] text-destructive">{errors.customer_phone}</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">
                          Le livreur vous appellera avant la livraison.
                        </p>
                      )}
                    </div>

                    {/* Ville */}
                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-xs font-semibold">
                        Ville <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="city"
                        placeholder="Ex. Casablanca"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                        className={errors.city ? "border-destructive" : ""}
                        disabled={isSubmitting}
                      />
                      {errors.city && (
                        <p className="text-[11px] text-destructive">{errors.city}</p>
                      )}
                    </div>

                    {/* Adresse complète */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="address" className="text-xs font-semibold">
                        Adresse complète de livraison <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="address"
                        placeholder="Ex. Quartier, rue et numéro"
                        rows={3}
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        className={errors.address ? "border-destructive" : ""}
                        disabled={isSubmitting}
                      />
                      {errors.address && (
                        <p className="text-[11px] text-destructive">{errors.address}</p>
                      )}
                    </div>

                    {/* Instructions complémentaires */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="note" className="text-xs font-semibold text-muted-foreground">
                        Instructions complémentaires pour le livreur (Optionnel)
                      </Label>
                      <Input
                        id="note"
                        placeholder="Ex. Appeler à l'arrivée, sonner à la porte"
                        value={formData.note}
                        onChange={(e) =>
                          setFormData({ ...formData, note: e.target.value })
                        }
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Mode de Paiement Exclusif */}
                <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xs">
                  <div className="flex items-center gap-2 border-b pb-3">
                    <span className="h-6 w-6 rounded-full bg-brand-black text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h2 className="font-bold text-base text-foreground">
                      Mode de Paiement
                    </h2>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-brand-black bg-brand-lightGray/40 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-brand-gold/20 text-brand-gold flex items-center justify-center shrink-0 mt-0.5">
                        <Banknote className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">
                          Paiement en espèces à la livraison
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                          Vous réglez le montant exact de votre commande ({total.toFixed(2)} MAD) directement au livreur lors de la remise de votre colis en mains propres.
                        </p>
                      </div>
                    </div>
                    <div className="h-5 w-5 rounded-full bg-brand-black text-white flex items-center justify-center shrink-0">
                      <CheckCircle className="h-3.5 w-3.5 text-brand-gold" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Colonne Droite : Récapitulatif et Bouton de confirmation */}
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-xs">
                  <h2 className="font-bold text-base text-foreground border-b pb-3">
                    Articles commandés ({totalCount})
                  </h2>

                  {/* Liste compacte des articles */}
                  <div className="divide-y divide-border/40 max-h-72 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div
                        key={`${item.productId}-${item.size}-${item.color}`}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.size} • {item.color} • Qté: {item.quantity}
                          </p>
                        </div>
                        <span className="font-bold text-foreground shrink-0">
                          {(item.price * item.quantity).toFixed(2)} MAD
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Décompte financier */}
                  <div className="pt-3 border-t space-y-2 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Sous-total</span>
                      <span className="font-medium text-foreground">{subtotal.toFixed(2)} MAD</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5 text-brand-gold" />
                        <span>Livraison partout au Maroc</span>
                      </span>
                      <span className="font-bold text-green-600">
                        {deliveryFee === 0 ? "GRATUITE (0,00 DH)" : `${deliveryFee} MAD`}
                      </span>
                    </div>
                    <div className="pt-2 border-t flex justify-between items-baseline text-base">
                      <span className="font-bold text-foreground">Total à régler</span>
                      <span className="font-black text-xl text-brand-black">
                        {total.toFixed(2)} <span className="text-xs font-semibold">MAD</span>
                      </span>
                    </div>
                  </div>

                  {/* Bouton de confirmation anti-double soumission */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="gold"
                      size="lg"
                      disabled={isSubmitting || items.length === 0}
                      className="w-full h-12 text-sm font-bold gap-2 shadow-md"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Validation en cours...</span>
                        </>
                      ) : (
                        <span>Confirmer ma commande ({total.toFixed(2)} MAD)</span>
                      )}
                    </Button>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-muted-foreground text-center">
                    <ShieldCheck className="h-4 w-4 text-brand-gold shrink-0" />
                    <span>Livraison rapide et sécurisée avec paiement à la réception.</span>
                  </div>
                </div>

                <Link to="/cart" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Modifier les articles du panier</span>
                </Link>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer categories={[]} />
    </div>
  )
}
