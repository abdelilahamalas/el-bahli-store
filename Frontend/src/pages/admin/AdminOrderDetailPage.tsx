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
  Check,
  Truck,
  PackageCheck,
  RotateCcw,
  XCircle,
  CreditCard,
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

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [allowedTransitions, setAllowedTransitions] = useState<AllowedTransition[]>([])
  const [loading, setLoading] = useState(true)

  // Status transition dialog state
  const [targetTransition, setTargetTransition] = useState<AllowedTransition | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Payment transition dialog state
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false)
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

  // Libellés courts et icônes claires pour les actions autorisées
  const getActionConfig = (value: string, defaultLabel: string) => {
    switch (value) {
      case "confirmed":
        return { label: "Confirmer la commande", icon: Check, isDestructive: false }
      case "processing":
        return { label: "Préparer la commande", icon: Package, isDestructive: false }
      case "shipped":
        return { label: "Passer en livraison", icon: Truck, isDestructive: false }
      case "delivered":
        return { label: "Marquer comme livrée", icon: PackageCheck, isDestructive: false }
      case "return_requested":
      case "return_received":
      case "returned":
        return { label: "Marquer comme retournée", icon: RotateCcw, isDestructive: false }
      case "cancelled":
        return { label: "Annuler la commande", icon: XCircle, isDestructive: true }
      default:
        return { label: defaultLabel, icon: Check, isDestructive: false }
    }
  }

  const handleTransitionConfirm = async () => {
    if (!order || !targetTransition) return

    setIsUpdatingStatus(true)
    try {
      await adminService.updateOrderStatus(order.id, targetTransition.value)
      const config = getActionConfig(targetTransition.value, targetTransition.label)
      toast.success("Statut mis à jour", {
        description: `La commande est passée à l'état « ${config.label} ».`,
      })
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
      toast.error("Action impossible", {
        description: msg,
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handlePaymentConfirm = async () => {
    if (!order) return
    setIsUpdatingPayment(true)
    try {
      await adminService.updatePaymentStatus(order.id, "paid" as PaymentStatusValue)
      toast.success("Paiement enregistré", {
        description: "La commande a été marquée comme payée (encaissée en espèces).",
      })
      setShowPaymentConfirm(false)
      fetchOrderDetail()
    } catch {
      toast.error("Action impossible", {
        description: "Impossible de mettre à jour le statut du paiement.",
      })
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
      case "return_requested":
      case "returned":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            {label || "Retournée"}
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
      <div className="space-y-4 max-w-5xl mx-auto py-6">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
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
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      {/* 1. Bouton « Retour aux commandes » (Design net, fond blanc, ne bouge pas au hover) */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin/orders")}
          className="h-8 px-3 rounded-lg border-slate-200 bg-white text-slate-900 hover:bg-slate-50 gap-1.5 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
          <span>Retour aux commandes</span>
        </Button>
      </div>

      {/* 2. En-tête de la commande avec boutons d'actions statut épurés */}
      <Card className="border border-slate-200/80 shadow-2xs rounded-xl bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-lg font-bold text-slate-900 tracking-tight">
                {order.reference}
              </span>
              {getOrderStatusBadge(order.status, order.status_label)}
              {order.payment_status === "paid" ? (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Payé (Encaissé)
                </span>
              ) : (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  À encaisser à la livraison
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Commande passée le {formattedDate}</span>
            </p>
          </div>

          {/* Boutons d'action statut autorisés (Boutons blancs compacts, sans doré, sans animation) */}
          <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
            {allowedTransitions.map((tr) => {
              const config = getActionConfig(tr.value, tr.label)
              const IconComp = config.icon

              return (
                <Button
                  key={tr.value}
                  size="sm"
                  variant="outline"
                  onClick={() => setTargetTransition(tr)}
                  className={`h-8 px-3 rounded-lg text-xs font-medium bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer ${
                    config.isDestructive ? "hover:text-rose-600 hover:border-rose-200" : ""
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${config.isDestructive ? "text-rose-500" : "text-slate-600"}`} />
                  <span>{config.label}</span>
                </Button>
              )
            })}

            {/* Bouton direct « Marquer comme payée » si non payé */}
            {order.payment_status !== "paid" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPaymentConfirm(true)}
                className="h-8 px-3 rounded-lg text-xs font-medium bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>Marquer comme payée</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 3. TROIS SECTIONS SIMPLES ET CLAIRES */}
      <div className="space-y-4">
        {/* SECTION A : Informations du client */}
        <Card className="border border-slate-200/80 shadow-2xs rounded-xl bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              A. Informations du client
            </h2>
            <div className="flex items-center gap-2">
              <a
                href={`tel:${cleanPhone}`}
                className="h-7.5 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
            <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-100 space-y-0.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Nom complet
              </span>
              <p className="font-bold text-xs sm:text-sm text-slate-900">{order.customer_name}</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-100 space-y-0.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Téléphone
              </span>
              <p className="font-mono font-bold text-xs sm:text-sm text-slate-900">
                {order.customer_phone || "—"}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-100 space-y-0.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Ville
              </span>
              <p className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {displayCity}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-100 space-y-0.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Adresse de livraison
              </span>
              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                {displayAddress}
              </p>
            </div>
          </div>

          {/* Note éventuelle */}
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

        {/* SECTION B : Articles commandés */}
        <Card className="border border-slate-200/80 shadow-2xs rounded-xl bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              B. Articles commandés ({order.items?.length || 0})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 border-b border-slate-100 text-[11px] uppercase font-bold text-slate-400 hover:bg-slate-50/70">
                  <TableHead className="py-2.5 px-4 font-bold text-slate-500">Image</TableHead>
                  <TableHead className="py-2.5 px-4 font-bold text-slate-500">Nom du produit</TableHead>
                  <TableHead className="py-2.5 px-4 font-bold text-slate-500">Taille</TableHead>
                  <TableHead className="py-2.5 px-4 font-bold text-slate-500">Couleur</TableHead>
                  <TableHead className="py-2.5 px-4 text-center font-bold text-slate-500">Quantité</TableHead>
                  <TableHead className="py-2.5 px-4 text-right font-bold text-slate-500">Prix unitaire</TableHead>
                  <TableHead className="py-2.5 px-4 text-right font-bold text-slate-500">Total</TableHead>
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
                      {/* Image du produit */}
                      <TableCell className="py-2.5 px-4 w-14">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
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
                      </TableCell>

                      {/* Nom */}
                      <TableCell className="py-2.5 px-4 font-bold text-slate-900">
                        {item.product_name}
                      </TableCell>

                      {/* Taille */}
                      <TableCell className="py-2.5 px-4">
                        <span className="font-mono text-xs text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {item.size}
                        </span>
                      </TableCell>

                      {/* Couleur */}
                      <TableCell className="py-2.5 px-4 text-slate-600">
                        {item.color}
                      </TableCell>

                      {/* Quantité */}
                      <TableCell className="py-2.5 px-4 text-center font-bold text-xs text-slate-900">
                        {item.quantity}
                      </TableCell>

                      {/* Prix unitaire */}
                      <TableCell className="py-2.5 px-4 text-right font-medium text-slate-600">
                        {formatMAD(item.unit_price)}
                      </TableCell>

                      {/* Total */}
                      <TableCell className="py-2.5 px-4 text-right font-bold text-xs text-slate-900">
                        {formatMAD(item.line_total)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* SECTION C : Récapitulatif de la commande */}
        <Card className="border border-slate-200/80 shadow-2xs rounded-xl bg-white p-4 sm:p-5">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              C. Récapitulatif de la commande
            </h2>
            <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Paiement à la livraison
            </span>
          </div>

          <div className="pt-3 max-w-md ml-auto space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Sous-total articles :</span>
              <span className="font-semibold text-slate-900">{formatMAD(order.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Frais de livraison (Maroc entier) :</span>
              <span className="font-semibold text-emerald-600">0 DH (Gratuit)</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Mode de règlement :</span>
              <span className="font-medium text-slate-900">Paiement à la livraison (Cash on Delivery)</span>
            </div>

            <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">Total à payer :</span>
              <span className="text-xl font-black text-slate-900">
                {formatMAD(order.total)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Dialogue de confirmation de transition de statut */}
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
                  « {getActionConfig(targetTransition.value, targetTransition.label).label} »
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

      {/* Dialogue de confirmation de paiement */}
      {showPaymentConfirm && (
        <AlertDialog
          open={showPaymentConfirm}
          onOpenChange={(open) => !open && setShowPaymentConfirm(false)}
        >
          <AlertDialogContent className="rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm font-bold text-slate-900">
                Marquer la commande comme payée
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-500">
                Confirmez-vous la réception du paiement de{" "}
                <strong className="text-slate-900">{formatMAD(order.total)}</strong> pour la commande{" "}
                <strong className="text-slate-900">{order.reference}</strong> ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isUpdatingPayment} className="text-xs rounded-lg">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isUpdatingPayment}
                onClick={handlePaymentConfirm}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg"
              >
                {isUpdatingPayment ? "Validation..." : "Confirmer le paiement"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
