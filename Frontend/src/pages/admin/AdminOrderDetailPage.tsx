import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Calendar,
  Phone,
  MapPin,
  AlertCircle,
  FileText,
  Save,
  Check,
  MessageCircle,
  Ban,
  Package,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type {
  AdminOrder,
  AllowedTransition,
  PaymentStatusValue,
} from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

  // Explicit label helper for order action buttons
  const getActionLabel = (value: string, defaultLabel: string) => {
    switch (value) {
      case "confirmed":
        return "Confirmer"
      case "processing":
        return "Préparer"
      case "shipped":
        return "Expédier"
      case "delivered":
        return "Marquer comme livrée"
      case "cancelled":
        return "Annuler"
      case "return_requested":
        return "Demande de retour"
      case "return_received":
        return "Réceptionner le retour"
      case "returned":
        return "Clôturer le retour"
      default:
        return defaultLabel
    }
  }

  const handleTransitionConfirm = async () => {
    if (!order || !targetTransition) return

    setIsUpdatingStatus(true)
    try {
      await adminService.updateOrderStatus(
        order.id,
        targetTransition.value,
        transitionReason.trim() || undefined
      )
      toast.success(`Statut mis à jour vers « ${getActionLabel(targetTransition.value, targetTransition.label)} ».`)
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
  const cleanPhone = (order.customer_phone || "").replace(/\s+/g, "")
  const whatsappClean = cleanPhone.replace(/^\+/, "").replace(/^0/, "212")

  // API mappings
  const displayCity = order.city || order.customer_city || "Ville non précisée"
  const displayAddress = order.address || order.customer_address || "Adresse non précisée"
  const displayNote = order.note || order.delivery_notes

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. Navigation retour */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin/orders")}
          className="h-8 px-3 rounded-xl border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour aux commandes</span>
        </Button>
      </div>

      {/* 2. En-tête de la commande */}
      <Card className="border border-zinc-200/80 shadow-2xs rounded-2xl bg-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xl sm:text-2xl font-black text-zinc-950 tracking-tight">
                {order.reference}
              </span>
              {getOrderStatusBadge(order.status, order.status_label)}
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                Paiement à la livraison (COD)
              </span>
            </div>
            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Commande passée le {formattedDate}</span>
            </p>
          </div>

          {/* Boutons d'action pour changer de statut */}
          {allowedTransitions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              {allowedTransitions.map((tr) => {
                const isCancel = tr.value === "cancelled"
                const explicitLabel = getActionLabel(tr.value, tr.label)

                return (
                  <Button
                    key={tr.value}
                    size="sm"
                    onClick={() => {
                      setTargetTransition(tr)
                      setTransitionReason("")
                    }}
                    className={`h-9 px-4 rounded-xl text-xs font-semibold shadow-xs transition-colors duration-100 cursor-pointer ${
                      isCancel
                        ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                        : "bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A]"
                    }`}
                  >
                    {isCancel ? (
                      <Ban className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                    ) : (
                      <Check className="w-3.5 h-3.5 mr-1.5 text-[#C9A227]" />
                    )}
                    {explicitLabel}
                  </Button>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      {/* 3. Contenu principal en grille épurée à 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Colonne Gauche (2 colonnes) : Client, Adresse & Articles commandés */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card Client & Coordonnées */}
          <Card className="border border-zinc-200/80 shadow-2xs rounded-2xl bg-white p-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700">
                Coordonnées du client
              </h2>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${cleanPhone}`}
                  className="h-8 px-3 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Appeler</span>
                </a>
                <a
                  href={`https://wa.me/${whatsappClean}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4">
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Nom du client
                </span>
                <p className="font-bold text-sm text-zinc-900">{order.customer_name}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Téléphone
                </span>
                <p className="font-mono font-bold text-sm text-zinc-900">{order.customer_phone}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Ville de destination
                </span>
                <p className="font-bold text-sm text-zinc-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C9A227] shrink-0" />
                  {displayCity}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Adresse de livraison
                </span>
                <p className="font-medium text-xs text-zinc-800 leading-relaxed">
                  {displayAddress}
                </p>
              </div>
            </div>

            {/* Note ou consigne client */}
            {displayNote && (
              <div className="mt-4 p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs">
                  <span className="font-bold text-zinc-100">
                    Instructions particulières laissées par le client :
                  </span>
                  <p className="text-zinc-300 leading-relaxed mt-0.5">{displayNote}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Card Articles commandés & Récapitulatif financier */}
          <Card className="border border-zinc-200/80 shadow-2xs rounded-2xl bg-white overflow-hidden">
            <div className="p-5 pb-3 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700">
                  Articles commandés
                </h2>
                <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs font-semibold">
                  {order.items?.length || 0}
                </Badge>
              </div>
              <span className="text-xs font-bold text-zinc-500">
                Sous-total : {formatMAD(order.subtotal)}
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/80 border-b border-zinc-200/80 text-[11px] uppercase font-bold text-zinc-500 hover:bg-zinc-50/80">
                  <TableHead className="py-3 px-4 font-bold text-zinc-500">Article</TableHead>
                  <TableHead className="py-3 px-4 font-bold text-zinc-500">Variante</TableHead>
                  <TableHead className="py-3 px-4 text-center font-bold text-zinc-500">Quantité</TableHead>
                  <TableHead className="py-3 px-4 text-right font-bold text-zinc-500">Prix unitaire</TableHead>
                  <TableHead className="py-3 px-4 text-right font-bold text-zinc-500">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y divide-zinc-100">
                {order.items?.map((item) => {
                  const itemImage =
                    item.product_image ||
                    item.product?.images?.find((img) => img.is_main)?.image_url ||
                    item.product?.images?.[0]?.image_url

                  return (
                    <TableRow key={item.id} className="hover:bg-zinc-50/60 transition-colors">
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 flex-shrink-0 border border-zinc-200">
                            {itemImage ? (
                              <img
                                src={itemImage}
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <span className="font-bold text-sm text-zinc-900">
                            {item.product_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-zinc-100 text-zinc-800 border border-zinc-200 px-2 py-0.5 rounded-md">
                            {item.size}
                          </span>
                          <span className="text-zinc-500 text-xs">· {item.color}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-center font-black text-sm text-zinc-900">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-right font-medium text-zinc-600">
                        {formatMAD(item.unit_price)}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-right font-black text-sm text-zinc-950">
                        {formatMAD(item.line_total)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
              <TableFooter className="border-t-2 border-zinc-200/80 bg-zinc-50/60 text-xs">
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="py-2.5 px-4 text-zinc-600">
                    Sous-total articles
                  </TableCell>
                  <TableCell colSpan={2} className="py-2.5 px-4 text-right font-semibold text-zinc-900">
                    {formatMAD(order.subtotal)}
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="py-2.5 px-4 text-zinc-600">
                    Frais de livraison (Tout le Royaume)
                  </TableCell>
                  <TableCell colSpan={2} className="py-2.5 px-4 text-right font-semibold text-emerald-600">
                    0.00 MAD (Gratuit)
                  </TableCell>
                </TableRow>
                <TableRow className="border-t border-zinc-200 font-bold bg-zinc-100/70 hover:bg-zinc-100/70">
                  <TableCell colSpan={3} className="py-3.5 px-4 text-zinc-950 font-bold text-sm">
                    Total net à encaisser à la livraison (COD)
                  </TableCell>
                  <TableCell colSpan={2} className="py-3.5 px-4 text-right text-zinc-950 font-black text-base">
                    {formatMAD(order.total)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Card>
        </div>

        {/* Colonne Droite (1 colonne) : Paiement COD, Expédition & Notes internes */}
        <div className="space-y-6">
          {/* Card Paiement à la livraison */}
          <Card className="border border-zinc-200/80 shadow-2xs rounded-2xl bg-white p-5 space-y-4">
            <div className="border-b border-zinc-100 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700">
                Paiement à la livraison (COD)
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Encaissement en espèces lors de la remise.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 font-medium">Statut encaissement :</span>
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
                    À encaisser
                  </Badge>
                )}
              </div>

              <div>
                <Select
                  value={order.payment_status}
                  disabled={isUpdatingPayment}
                  onValueChange={(val) => handlePaymentChange(val as PaymentStatusValue)}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl border-zinc-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="pending" className="text-xs">En attente (Non payé)</SelectItem>
                    <SelectItem value="paid" className="text-xs">Payé / Encaissé</SelectItem>
                    <SelectItem value="refunded" className="text-xs">Remboursé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Détails livraison */}
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Mode :</span>
                <span className="font-semibold text-zinc-800">Livraison à domicile</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Frais :</span>
                <span className="font-semibold text-emerald-600">0.00 MAD (Gratuit)</span>
              </div>
              {order.shipped_at && (
                <div className="flex items-center justify-between border-t border-zinc-200/50 pt-1.5">
                  <span className="text-zinc-500">Expédiée le :</span>
                  <span className="font-semibold text-zinc-800">
                    {new Date(order.shipped_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              )}
              {order.delivered_at && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Livrée le :</span>
                  <span className="font-semibold text-zinc-800">
                    {new Date(order.delivered_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Card Notes Administratives */}
          <Card className="border border-zinc-200/80 shadow-2xs rounded-2xl bg-white p-5 space-y-3">
            <div className="border-b border-zinc-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C9A227]" />
                  Notes administratives
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Consignes internes invisibles pour le client.
                </p>
              </div>
            </div>

            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Ex: Client joint au téléphone, confirmation de la commande..."
              rows={4}
              className="text-xs resize-none rounded-xl border-zinc-200"
            />

            <Button
              type="button"
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="w-full bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] rounded-xl h-9 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 mr-1.5 text-[#C9A227]" />
              {isSavingNotes ? "Enregistrement..." : "Enregistrer la note"}
            </Button>
          </Card>
        </div>
      </div>

      {/* Dialogue de confirmation de transition de statut */}
      {targetTransition && (
        <AlertDialog
          open={!!targetTransition}
          onOpenChange={(open) => !open && setTargetTransition(null)}
        >
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#C9A227]" />
                {getActionLabel(targetTransition.value, targetTransition.label)}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-zinc-500">
                Voulez-vous modifier le statut de la commande{" "}
                <strong className="text-zinc-900">{order.reference}</strong> vers{" "}
                <strong className="text-zinc-900">
                  {getActionLabel(targetTransition.value, targetTransition.label)}
                </strong>{" "}
                ?
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="py-2 space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-900">
                Motif ou commentaire d'opération{" "}
                <span className="text-zinc-400 font-normal">(Optionnel)</span>
              </Label>
              <Textarea
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                placeholder="Ex: Confirmation téléphonique avec le client..."
                rows={2}
                className="text-xs resize-none rounded-xl border-zinc-200"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isUpdatingStatus} className="text-xs rounded-xl">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isUpdatingStatus}
                onClick={handleTransitionConfirm}
                className="bg-[#18181B] hover:bg-[#27272A] text-white border border-[#27272A] text-xs font-semibold rounded-xl"
              >
                {isUpdatingStatus ? "Traitement..." : "Confirmer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
