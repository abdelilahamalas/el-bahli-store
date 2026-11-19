import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Calendar,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle2,
  FileText,
  Save,
  Check,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type {
  AdminOrder,
  AllowedTransition,
  PaymentStatusValue,
} from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { getOrderStatusBadge } from "@/utils/orderStatus"

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [allowedTransitions, setAllowedTransitions] = useState<AllowedTransition[]>([])
  const [loading, setLoading] = useState(true)

  // Status transition dialog state
  const [targetTransition, setTargetTransition] = useState<AllowedTransition | null>(null)
  const [transitionReason, setTransitionReason] = useState("")
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Admin notes state
  const [adminNotes, setAdminNotes] = useState("")
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // Payment status state
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false)

  const fetchOrderDetail = async () => {
    if (!id) return
    try {
      setLoading(true)
      const res = await adminService.getOrderDetail(id)
      setOrder(res.order)
      setAllowedTransitions(res.allowed_transitions || [])
      setAdminNotes(res.order.admin_notes || "")
    } catch {
      toast.error("Impossible de récupérer les détails de la commande.")
      navigate("/admin/orders")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrderDetail()
  }, [id])

  const handleTransitionConfirm = async () => {
    if (!order || !targetTransition) return

    setIsUpdatingStatus(true)
    try {
      await adminService.updateOrderStatus(
        order.id,
        targetTransition.value,
        transitionReason.trim() || undefined
      )
      toast.success(`Statut mis à jour vers « ${targetTransition.label} ».`)
      setTargetTransition(null)
      setTransitionReason("")
      fetchOrderDetail()
    } catch (err: unknown) {
      let msg = "Impossible de changer le statut de la commande."
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { message?: string } } }
        if (axErr.response?.data?.message) {
          msg = axErr.response.data.message
        }
      }
      toast.error(msg)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!order) return
    setIsSavingNotes(true)
    try {
      await adminService.updateOrderNotes(order.id, adminNotes)
      toast.success("Notes administratives enregistrées.")
    } catch {
      toast.error("Impossible de sauvegarder les notes.")
    } finally {
      setIsSavingNotes(false)
    }
  }

  const handlePaymentChange = async (newPaymentStatus: PaymentStatusValue) => {
    if (!order) return
    setIsUpdatingPayment(true)
    try {
      await adminService.updatePaymentStatus(order.id, newPaymentStatus)
      toast.success("Statut de paiement mis à jour.")
      fetchOrderDetail()
    } catch {
      toast.error("Impossible de mettre à jour le statut du paiement.")
    } finally {
      setIsUpdatingPayment(false)
    }
  }

  const formatMAD = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount
    return `${num.toLocaleString("fr-FR", { minimumFractionDigits: 0 })} MAD`
  }

  if (loading || !order) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    )
  }

  const formattedDate = new Date(order.created_at).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  // Format phone for direct WhatsApp or tel click
  const cleanPhone = order.customer_phone.replace(/\s+/g, "")

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin/orders")}
            className="h-9 w-9 border-border"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
                {order.reference}
              </h1>
              {getOrderStatusBadge(order.status, order.status_label)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Commande passée le {formattedDate}
            </p>
          </div>
        </div>

        {/* Action Buttons for Allowed Transitions */}
        {allowedTransitions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {allowedTransitions.map((tr) => {
              const isCancel = tr.value === "cancelled"
              return (
                <Button
                  key={tr.value}
                  size="sm"
                  onClick={() => {
                    setTargetTransition(tr)
                    setTransitionReason("")
                  }}
                  className={`text-xs h-9 font-semibold ${
                    isCancel
                      ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                      : "bg-[#111111] hover:bg-[#252525] text-white shadow-xs"
                  }`}
                >
                  {!isCancel && <Check className="w-3.5 h-3.5 mr-1.5 text-[#C9A227]" />}
                  {tr.label}
                </Button>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Items & Customer Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Table Card */}
          <Card className="border-border bg-white shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                <span>Articles commandés ({order.items?.length || 0})</span>
                <span className="text-sm font-semibold text-[#C9A227]">
                  Total : {formatMAD(order.total)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase border-b border-border/60">
                    <tr>
                      <th className="py-3 px-4">Article</th>
                      <th className="py-3 px-4">Taille / Couleur</th>
                      <th className="py-3 px-4 text-center">Quantité</th>
                      <th className="py-3 px-4 text-right">Prix unitaire</th>
                      <th className="py-3 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {order.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-foreground">
                            {item.product_name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground">{item.size}</span>
                          <span className="text-muted-foreground"> · {item.color}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-foreground">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground">
                          {formatMAD(item.unit_price)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-foreground">
                          {formatMAD(item.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-border/80 bg-muted/20 font-medium">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-4 text-muted-foreground">
                        Sous-total articles
                      </td>
                      <td colSpan={2} className="py-2.5 px-4 text-right font-semibold">
                        {formatMAD(order.subtotal)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-2.5 px-4 text-muted-foreground">
                        Frais de livraison
                      </td>
                      <td colSpan={2} className="py-2.5 px-4 text-right font-semibold text-emerald-600">
                        {parseFloat(order.delivery_fee) === 0 ? "Gratuit" : formatMAD(order.delivery_fee)}
                      </td>
                    </tr>
                    <tr className="border-t border-border font-bold text-sm bg-muted/40">
                      <td colSpan={3} className="py-3 px-4 text-foreground">
                        Total à régler à la livraison
                      </td>
                      <td colSpan={2} className="py-3 px-4 text-right text-foreground">
                        {formatMAD(order.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Delivery Information Card */}
          <Card className="border-border bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground">
                Informations client et livraison
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Coordonnées pour confirmation téléphonique et bordereau de transport.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Nom du destinataire
                  </span>
                  <p className="font-bold text-sm text-foreground">{order.customer_name}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Téléphone de contact
                  </span>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-foreground">{order.customer_phone}</p>
                    <a
                      href={`tel:${cleanPhone}`}
                      className="text-xs text-[#C9A227] hover:underline font-semibold flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" /> Appeler
                    </a>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Ville de destination
                  </span>
                  <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#C9A227]" />
                    {order.customer_city}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Adresse complète
                  </span>
                  <p className="text-foreground">{order.customer_address}</p>
                </div>
              </div>

              {order.delivery_notes && (
                <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/80 text-xs">
                  <span className="font-semibold text-amber-900 block mb-0.5">
                    Instructions particulières du client :
                  </span>
                  <p className="text-amber-800">{order.delivery_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status History Timeline */}
          {((order.status_histories && order.status_histories.length > 0) ||
            (order.statusHistories && order.statusHistories.length > 0)) && (
            <Card className="border-border bg-white shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-foreground">
                  Historique des étapes de la commande
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {(order.status_histories || order.statusHistories || []).map((h, i) => {
                    const hDate = new Date(h.created_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })

                    return (
                      <div key={i} className="flex items-start gap-4 relative z-10">
                        <div className="w-6 h-6 rounded-full bg-white border-2 border-[#C9A227] flex items-center justify-center flex-shrink-0 text-[#C9A227]">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                        <div className="flex-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground capitalize">
                              {h.to_status}
                            </span>
                            <span className="text-[11px] text-muted-foreground">{hDate}</span>
                          </div>
                          {h.reason && (
                            <p className="text-muted-foreground mt-0.5 italic">« {h.reason} »</p>
                          )}
                          {h.user?.name && (
                            <span className="text-[10px] text-muted-foreground">
                              Par : {h.user.name}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (1 col): Payment & Internal Notes */}
        <div className="space-y-6">
          {/* Payment Status Card */}
          <Card className="border-border bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground">
                Paiement à la livraison (COD)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Encaissement lors de la remise du colis par le livreur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Statut de l'encaissement :</span>
                  {order.payment_status === "paid" ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                      Encaissé (Payé)
                    </Badge>
                  ) : order.payment_status === "refunded" ? (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold">
                      Remboursé
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold">
                      En attente de paiement
                    </Badge>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <select
                    value={order.payment_status}
                    disabled={isUpdatingPayment}
                    onChange={(e) => handlePaymentChange(e.target.value as PaymentStatusValue)}
                    className="w-full h-8 px-2 text-xs bg-white border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
                  >
                    <option value="pending">En attente (Non payé)</option>
                    <option value="paid">Payé / Encaissé</option>
                    <option value="refunded">Remboursé</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Internal Administrative Notes Card */}
          <Card className="border-border bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C9A227]" />
                Notes administratives internes
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Ces commentaires sont strictement privés et invisibles pour le client.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Ex: Client appelé à 11h, a demandé une livraison après 17h..."
                rows={5}
                className="text-xs resize-none"
              />
              <Button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="w-full bg-[#111111] hover:bg-[#252525] text-white text-xs font-semibold h-8 shadow-xs"
              >
                <Save className="w-3.5 h-3.5 mr-1.5 text-[#C9A227]" />
                {isSavingNotes ? "Enregistrement..." : "Enregistrer la note"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog for Status Transitions */}
      <AlertDialog
        open={!!targetTransition}
        onOpenChange={(open) => !open && setTargetTransition(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#C9A227]" />
              Confirmer le passage à : « {targetTransition?.label} »
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Voulez-vous modifier le statut de la commande{" "}
              <strong className="text-foreground">{order.reference}</strong> vers{" "}
              <strong className="text-foreground">{targetTransition?.label}</strong> ?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2 space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Motif ou commentaire administratif{" "}
              <span className="text-muted-foreground font-normal">(Optionnel)</span>
            </label>
            <Textarea
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              placeholder="Ex: Confirmation reçue par téléphone / Colis remis au transporteur..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus} className="text-xs">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isUpdatingStatus}
              onClick={handleTransitionConfirm}
              className="bg-[#111111] hover:bg-[#222222] text-white text-xs font-semibold"
            >
              {isUpdatingStatus ? "Traitement..." : "Confirmer le changement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
