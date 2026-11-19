import { Badge } from "@/components/ui/badge"
import {
  Clock,
  CheckCircle2,
  Package,
  Truck,
  XCircle,
} from "lucide-react"
import type { OrderStatusValue } from "@/types/admin"

export function getOrderStatusBadge(status: OrderStatusValue, label?: string) {
  switch (status) {
    case "pending":
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] font-medium gap-1"
        >
          <Clock className="w-3 h-3 text-amber-500" />
          {label || "En attente"}
        </Badge>
      )
    case "confirmed":
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-medium gap-1"
        >
          <CheckCircle2 className="w-3 h-3 text-blue-500" />
          {label || "Confirmée"}
        </Badge>
      )
    case "processing":
      return (
        <Badge
          variant="outline"
          className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px] font-medium gap-1"
        >
          <Package className="w-3 h-3 text-indigo-500" />
          {label || "En préparation"}
        </Badge>
      )
    case "shipped":
      return (
        <Badge
          variant="outline"
          className="bg-purple-50 text-purple-700 border-purple-200 text-[11px] font-medium gap-1"
        >
          <Truck className="w-3 h-3 text-purple-500" />
          {label || "Expédiée"}
        </Badge>
      )
    case "delivered":
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-medium gap-1"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          {label || "Livrée"}
        </Badge>
      )
    case "cancelled":
      return (
        <Badge
          variant="outline"
          className="bg-rose-50 text-rose-700 border-rose-200 text-[11px] font-medium gap-1"
        >
          <XCircle className="w-3 h-3 text-rose-500" />
          {label || "Annulée"}
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground text-[11px]">
          {label || status}
        </Badge>
      )
  }
}
