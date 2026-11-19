import { useEffect, useState, useTransition } from "react"
import { Link } from "react-router-dom"
import {
  TrendingUp,
  ShoppingBag,
  Package,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminDashboardData } from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getOrderStatusBadge } from "@/utils/orderStatus"

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<string>("all")
  const [isPending, startTransition] = useTransition()

  const loadData = async (selectedPeriod: string) => {
    try {
      setLoading(true)
      const res = await adminService.getDashboardStats(selectedPeriod)
      setData(res)
    } catch {
      toast.error("Erreur lors de la récupération des données du dashboard.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(period)
  }, [period])

  const handlePeriodChange = (newPeriod: string) => {
    startTransition(() => {
      setPeriod(newPeriod)
    })
  }

  // Format currency
  const formatMAD = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount
    return isNaN(num) ? "0 MAD" : `${num.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MAD`
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tableau de bord</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aperçu global des ventes, commandes et niveaux de stock en temps réel.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg bg-white p-1 border border-border shadow-xs text-xs font-medium">
            {[
              { id: "all", label: "Tout" },
              { id: "today", label: "Aujourd'hui" },
              { id: "week", label: "7 jours" },
              { id: "month", label: "Ce mois" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handlePeriodChange(tab.id)}
                disabled={loading || isPending}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  period === tab.id
                    ? "bg-[#111111] text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => loadData(period)}
            disabled={loading}
            className="h-9 w-9 border-border hover:bg-muted"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#C9A227]" : "text-muted-foreground"}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-5 border-border shadow-xs bg-white">
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-8 w-36 mb-2" />
              <Skeleton className="h-3 w-48" />
            </Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue Card */}
          <Card className="border-border bg-white shadow-xs hover:border-[#C9A227]/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Chiffre d'affaires
              </span>
              <div className="w-8 h-8 rounded-full bg-[#FAF5E6] flex items-center justify-center text-[#C9A227]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatMAD(data.revenue || data.kpis.revenue)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                <span>Encaissé: {formatMAD(data.kpis.collected_revenue)}</span>
                <span className="text-amber-600 font-medium">À collecter: {formatMAD(data.kpis.amount_to_collect)}</span>
              </p>
            </CardContent>
          </Card>

          {/* Orders Card */}
          <Card className="border-border bg-white shadow-xs hover:border-[#C9A227]/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Commandes
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {data.orders_count || data.kpis.total_orders}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                <span className="text-amber-600 font-semibold">{data.kpis.pending_orders} en attente</span>
                <span>•</span>
                <span className="text-blue-600 font-medium">{data.kpis.confirmed_orders} confirmées</span>
                <span>•</span>
                <span className="text-emerald-600 font-medium">{data.kpis.delivered_orders} livrées</span>
              </p>
            </CardContent>
          </Card>

          {/* Catalog Products Card */}
          <Card className="border-border bg-white shadow-xs hover:border-[#C9A227]/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Articles en catalogue
              </span>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                <Package className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {data.kpis.active_products}
                <span className="text-sm font-normal text-muted-foreground ml-1.5">
                  / {data.kpis.total_products} au total
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {data.kpis.total_stock} pièces en stock réparties sur {data.kpis.total_variants} variantes
              </p>
            </CardContent>
          </Card>

          {/* Stock Alerts Card */}
          <Card className="border-border bg-white shadow-xs hover:border-[#C9A227]/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                État des stocks
              </span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  data.kpis.out_of_stock_variants > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {data.kpis.out_of_stock_variants}
                <span className="text-xs font-normal text-muted-foreground ml-1.5">ruptures</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                <span className="text-amber-600 font-medium">
                  {data.kpis.low_stock_variants} en stock faible (&le; {data.kpis.low_stock_threshold})
                </span>
                <Link to="/admin/inventory" className="text-[#C9A227] hover:underline flex items-center gap-0.5">
                  Gérer <ArrowUpRight className="w-3 h-3" />
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Activity Chart Section (Gradient Area Style as per inspiration) */}
      <Card className="border-border bg-white shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4">
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              Activité des ventes (7 derniers jours)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Suivi journalier du volume de commandes et du chiffre d'affaires généré.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#111111]" />
              Commandes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C9A227]" />
              Chiffre d'affaires
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <Skeleton className="h-56 w-full rounded-md" />
          ) : data && data.activity_7_days && data.activity_7_days.length > 0 ? (
            <div className="h-60 w-full relative flex flex-col justify-end pt-4">
              {/* Daily bars / visual chart */}
              <div className="grid grid-cols-7 gap-2 sm:gap-4 h-44 items-end pb-6 border-b border-border/60">
                {data.activity_7_days.map((day, idx) => {
                  const maxOrders = Math.max(...data.activity_7_days.map((d) => d.orders_count), 1)
                  const heightPercent = Math.max((day.orders_count / maxOrders) * 100, 6)
                  const dateLabel = new Date(day.date).toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                  })

                  return (
                    <div key={idx} className="flex flex-col items-center h-full justify-end group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#111111] text-white text-[10px] py-1 px-2 rounded shadow-md pointer-events-none z-10 whitespace-nowrap">
                        <span className="font-semibold">{day.orders_count} commandes</span> · {formatMAD(day.revenue)}
                      </div>

                      {/* Bar */}
                      <div className="w-full max-w-[40px] flex flex-col items-center">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-md transition-all ${
                            day.orders_count > 0
                              ? "bg-gradient-to-t from-[#111111] to-[#333333] group-hover:from-[#C9A227] group-hover:to-[#E5BD3B]"
                              : "bg-muted/60"
                          }`}
                        />
                      </div>

                      {/* Day Label */}
                      <span className="text-[10px] text-muted-foreground mt-2 uppercase font-medium">
                        {dateLabel}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Bottom Chart Footer */}
              <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
                <span>Source : Commandes enregistrées sur El Bahli Store</span>
                <span>Devise : MAD (Dirham Marocain)</span>
              </div>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
              Aucune activité enregistrée sur cette période.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two Columns Grid: Recent Orders & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Card */}
        <Card className="border-border bg-white shadow-xs flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground">Dernières commandes</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Les 5 commandes les plus récentes passées sur la boutique.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs text-[#C9A227] hover:text-[#B38F1E]">
              <Link to="/admin/orders">
                Toutes <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {loading && !data ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            ) : data?.recent_orders && data.recent_orders.length > 0 ? (
              <div className="divide-y divide-border/60">
                {data.recent_orders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/admin/orders/${order.id}`}
                    className="py-3 flex items-center justify-between hover:bg-muted/50 px-2 rounded-md transition-colors group"
                  >
                    <div className="flex flex-col min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {order.reference}
                        </span>
                        {getOrderStatusBadge(order.status, order.status_label)}
                      </div>
                      <span className="text-xs text-muted-foreground mt-0.5 truncate">
                        {order.customer_name} · {order.customer_city}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-semibold text-xs text-foreground">
                        {formatMAD(order.total)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                <ShoppingBag className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-medium text-foreground">Aucune commande enregistrée</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Les commandes passées par vos clients apparaîtront ici automatiquement.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Alerts Card */}
        <Card className="border-border bg-white shadow-xs flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground">Alertes de stock</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Variantes en rupture ou sous le seuil d'alerte.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs text-[#C9A227] hover:text-[#B38F1E]">
              <Link to="/admin/inventory">
                Inventaire <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {loading && !data ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            ) : data?.stock_alerts && data.stock_alerts.length > 0 ? (
              <div className="divide-y divide-border/60">
                {data.stock_alerts.map((alert) => (
                  <div
                    key={alert.variant_id}
                    className="py-3 flex items-center justify-between hover:bg-muted/50 px-2 rounded-md transition-colors"
                  >
                    <div className="flex flex-col min-w-0 pr-3">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {alert.product_name}
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        Taille : <span className="font-medium text-foreground">{alert.size}</span> · Couleur :{" "}
                        <span className="font-medium text-foreground">{alert.color}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {alert.stock === 0 ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold">
                          Rupture (0)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                          {alert.stock} restant(s)
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-7 px-2 text-[11px] border-border hover:border-[#C9A227]"
                      >
                        <Link to={`/admin/inventory?search=${encodeURIComponent(alert.product_name)}`}>
                          Réapprovisionner
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mb-2" />
                <p className="text-xs font-medium text-foreground">Stocks sous contrôle</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Aucun article n'est actuellement en rupture ou sous le seuil d'alerte.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
