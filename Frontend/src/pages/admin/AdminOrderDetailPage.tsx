import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Calendar,
  Phone,
  MapPin,
  AlertCircle,
  MessageCircle,
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
import {
  Table,
  TableHeader,
  TableBody,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [allowedTransitions, setAllowedTransitions] = useState<AllowedTransition[]>([])
  const [loading, setLoading] = useState(true)

  // Status transition dialog state
  const [targetTransition, setTargetTransition] = useState<AllowedTransition | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false)

  const fetchOrderDetail = async () => {
    if (!id) return
    try {
      setLoading(true)
      const res = await adminService.getOrderDetail(id)
      setOrder(res.order)
      setAllowedTransitions(res.allowed_transitions || [])
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

  // Explicit label helper for order action buttons matching user request
  const getActionLabel = (value: string, defaultLabel: string) => {
    switch (value) {
      case "confirmed":
        return "Confirmer la commande"
      case "processing":
        return "Préparer la commande"
      case "shipped":
        return "Commande en livraison"
      case "delivered":
        return "Commande livrée"
      case "cancelled":
        return "Annuler la commande"
      case "return_requested":
      case "returned":
        return "Retour de commande"
      default:
        return defaultLabel
    }
  }

  const handleTransitionConfirm = async () => {
    if (!order || !targetTransition) return

    setIsUpdatingStatus(true)
    try {
      await adminService.updateOrderStatus(order.id, targetTransition.value)
      toast.success(
        `Statut mis à jour vers « ${getActionLabel(targetTransition.value, targetTransition.label)} ».`
      )
      setTargetTransition(null)
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

  const formatMAD = (amount: string | number | undefined) => {
    if (amount === undefined || amount === null) return "0 MAD"
    const num = typeof amount === "string" ? parseFloat(amount) : amount
    return `${num.toLocaleString("fr-FR", { minimumFractionDigits: 0 })} MAD`
  }

  const getOrderStatusBadge = (status: string, label?: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {label || "En attente"}
          </span>
        )
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {label || "Confirmée"}
          </span>
        )
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            {label || "En préparation"}
          </span>
        )
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            {label || "En livraison"}
          </span>
        )
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {label || "Livrée"}
          </span>
        )
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {label || "Annulée"}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {label || status}
          </span>
        )
    }
  }

  if (loading || !order) {
    return (
      <div className="space-y-5 max-w-5xl mx-auto py-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-64 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
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

  const cleanPhone = (order.customer_phone || "").replace(/\s+/g, "")
  const whatsappClean = cleanPhone.replace(/^\+/, "").replace(/^0/, "212")

  const displayCity = order.city || order.customer_city || "Ville non précisée"
  const displayAddress = order.address || order.customer_address || "Adresse non précisée"
  const displayNote = order.note || order.delivery_notes

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-10">
      {/* 1. Bouton retour */}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin/orders")}
          className="h-8.5 px-3 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-50 gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour aux commandes</span>
        </Button>
      </div>

      {/* 2. En-tête de la commande avec boutons d'actions statut */}
      <Card className="border border-slate-200/80 shadow-2xs rounded-xl bg-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xl font-extrabold text-slate-900 tracking-tight">
                {order.reference}
              </span>
              {getOrderStatusBadge(order.status, order.status_label)}
              <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Paiement à la livraison
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
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
                    onClick={() => setTargetTransition(tr)}
                    className={`h-8.5 px-3.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer ${
                      isCancel
                        ? "bg-white hover:bg-rose-50 text-rose-600 border border-rose-200"
                        : "bg-white hover:bg-slate-50 text-slate-900 border border-slate-200"
                    }`}
                  >
                    {explicitLabel}
                  </Button>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      {/* 3. Contenu principal : 2 Blocs épurés */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Colonne Gauche (2 colonnes) : Client & Articles commandés */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card Client & Coordonnées */}
          <Card className="border border-slate-200/80 shadow-2xs rounded-xl bg-white p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Informations du client
              </h2>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${cleanPhone}`}
                  className="h-7.5 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span>Appeler</span>
                </a>
                <a
                  href={`https://wa.me/${whatsappClean}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-7.5 px-3 rounded-lg bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-200 text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3 h-3 text-emerald-600" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Nom du client
                </span>
                <p className="font-bold text-sm text-slate-900">{order.customer_name}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Téléphone
                </span>
                <p className="font-mono font-bold text-sm text-slate-900">{order.customer_phone}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Ville
                </span>
                <p className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {displayCity}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Adresse de livraison
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {displayAddress}
                </p>
              </div>
            </div>

            {/* Note ou consigne client */}
            {displayNote && (
              <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs">
                  <span className="font-bold text-slate-900">Note du client :</span>
                  <p className="text-slate-600 leading-relaxed">{displayNote}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Card Articles commandés */}
          <Card className="border border-slate-200/80 shadow-2xs rounded-xl bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Articles commandés ({order.items?.length || 0})
              </h2>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-400 hover:bg-slate-50/70">
                  <TableHead className="py-3 px-4 font-bold text-slate-500">Article</TableHead>
                  <TableHead className="py-3 px-4 font-bold text-slate-500">Variante</TableHead>
                  <TableHead className="py-3 px-4 text-center font-bold text-slate-500">Quantité</TableHead>
                  <TableHead className="py-3 px-4 text-right font-bold text-slate-500">Prix unitaire</TableHead>
                  <TableHead className="py-3 px-4 text-right font-bold text-slate-500">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y divide-slate-100">
                {order.items?.map((item) => {
                  const itemImage =
                    item.product_image ||
                    item.product?.images?.find((img) => img.is_main)?.image_url ||
                    item.product?.images?.[0]?.image_url

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 flex items-center justify-center">
                            {itemImage ? (
                              <img
                                src={itemImage}
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <span className="font-bold text-xs text-slate-900">
                            {item.product_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <span className="font-mono text-xs text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {item.size}
                        </span>
                        <span className="text-slate-500 text-xs ml-1.5">· {item.color}</span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-bold text-xs text-slate-900">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-medium text-slate-600">
                        {formatMAD(item.unit_price)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-bold text-xs text-slate-900">
                        {formatMAD(item.line_total)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Colonne Droite (1 colonne) : Montant total & Paiement */}
        <div className="space-y-5">
          <Card className="border border-slate-200/80 shadow-2xs rounded-xl bg-white p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Paiement et Montant total
              </h2>
            </div>

            {/* Statut encaissement */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Statut encaissement :</span>
                {order.payment_status === "paid" ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Payé
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    À encaisser
                  </span>
                )}
              </div>

              <div>
                <Select
                  value={order.payment_status}
                  disabled={isUpdatingPayment}
                  onValueChange={(val) => handlePaymentChange(val as PaymentStatusValue)}
                >
                  <SelectTrigger className="h-8.5 text-xs rounded-lg border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="pending" className="text-xs">En attente (Non payé)</SelectItem>
                    <SelectItem value="paid" className="text-xs">Payé / Encaissé</SelectItem>
                    <SelectItem value="refunded" className="text-xs">Remboursé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Détails financiers */}
            <div className="space-y-2.5 text-xs pt-1">
              <div className="flex items-center justify-between text-slate-600">
                <span>Sous-total articles :</span>
                <span className="font-semibold text-slate-900">{formatMAD(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Frais de livraison :</span>
                <span className="font-semibold text-emerald-600">0 DH (Gratuit)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Mode :</span>
                <span className="font-medium text-slate-800">Paiement à la livraison</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Total à payer :</span>
                <span className="text-lg font-black text-slate-900">
                  {formatMAD(order.total)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Dialogue de confirmation de transition */}
      {targetTransition && (
        <AlertDialog
          open={!!targetTransition}
          onOpenChange={(open) => !open && setTargetTransition(null)}
        >
          <AlertDialogContent className="rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm font-bold text-slate-900">
                Changer le statut de la commande
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-500">
                Voulez-vous modifier le statut de la commande{" "}
                <strong className="text-slate-900">{order.reference}</strong> vers{" "}
                <strong className="text-slate-900">
                  « {getActionLabel(targetTransition.value, targetTransition.label)} »
                </strong>{" "}
                ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isUpdatingStatus} className="text-xs rounded-lg">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isUpdatingStatus}
                onClick={handleTransitionConfirm}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                {isUpdatingStatus ? "Modification..." : "Confirmer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
