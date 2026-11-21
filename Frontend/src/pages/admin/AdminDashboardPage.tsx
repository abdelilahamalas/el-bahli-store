import { useEffect, useState, useTransition } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  TrendingUp,
  ShoppingBag,
  ShoppingCart,
  Banknote,
  ArrowRight,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminDashboardData } from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<string>("month")
  const [isPending, startTransition] = useTransition()
  const [confirmingOrderId, setConfirmingOrderId] = useState<number | null>(null)
  const navigate = useNavigate()

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

  // Currency Formatter
  const formatMAD = (amount: string | number | undefined) => {
    if (amount === undefined || amount === null) return "0 MAD"
    const num = typeof amount === "string" ? parseFloat(amount) : amount
    return isNaN(num)
      ? "0 MAD"
      : `${num.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MAD`
  }

  const parseNum = (val: string | number | undefined): number => {
    if (val === undefined || val === null) return 0
    const n = typeof val === "string" ? parseFloat(val) : val
    return isNaN(n) ? 0 : n
  }

  // Quick order confirmation
  const handleConfirmOrder = async (e: React.MouseEvent, orderId: number) => {
    e.stopPropagation()
    try {
      setConfirmingOrderId(orderId)
      await adminService.updateOrderStatus(orderId, "confirmed", "Commande confirmée depuis le dashboard")
      toast.success("Commande confirmée avec succès.")
      await loadData(period)
    } catch {
      toast.error("Impossible de confirmer la commande.")
    } finally {
      setConfirmingOrderId(null)
    }
  }

  // Date Header Formatter in French
  const todayFormatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date())
  const todayCapitalized = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1)

  // Current Month and Year for chart title
  const currentMonthYear = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date())
  const currentMonthYearCapitalized =
    currentMonthYear.charAt(0).toUpperCase() + currentMonthYear.slice(1)

  // Computed Real KPIs
  const totalRevenue = parseNum(data?.revenue || data?.kpis?.revenue)
  const totalOrders = data?.kpis?.total_orders ?? data?.orders_count ?? 0
  const averageBasket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
  const toCollectRevenue = parseNum(data?.kpis?.amount_to_collect)
  const pendingOrdersCount = data?.kpis?.pending_orders ?? 0

  // Real pending orders list for "À traiter maintenant" (strictly pending)
  const ordersToProcess = (data?.recent_orders || []).filter(
    (order) => order.status === "pending"
  )

  // Top products from API
  const topProducts = data?.charts?.top_products || []

  // Top categories from API
  const topCategories = data?.charts?.top_categories || []
  const totalCatRevenue = topCategories.reduce((acc, cat) => acc + parseNum(cat.revenue), 0)

  // Stock alerts
  const stockAlerts = data?.stock_alerts || []

  // Daily activity for the smooth curve area chart
  const activity = data?.activity_7_days || []
  const maxDayRevenue = Math.max(...activity.map((d) => parseNum(d.revenue)), 0)

  // Dynamic SVG curve generation from real activity data
  const chartPoints = activity.map((day, idx) => {
    const x = activity.length > 1 ? (idx / (activity.length - 1)) * 560 + 20 : 300
    const rev = parseNum(day.revenue)
    const y = maxDayRevenue > 0 ? 140 - (rev / maxDayRevenue) * 90 : 130
    return { x, y, rev, day }
  })

  const peakPoint = chartPoints.reduce(
    (max, pt) => (pt.rev > max.rev ? pt : max),
    chartPoints[0] || { x: 500, y: 70, rev: 0, day: { date: "", orders_count: 0, revenue: "0" } }
  )

  const generateSmoothPath = () => {
    if (chartPoints.length === 0) return ""
    if (chartPoints.length === 1) return `M ${chartPoints[0].x} ${chartPoints[0].y}`

    let d = `M ${chartPoints[0].x} ${chartPoints[0].y}`
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const p0 = chartPoints[i]
      const p1 = chartPoints[i + 1]
      const cpX = (p0.x + p1.x) / 2
      d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`
    }
    return d
  }

  const smoothPath = generateSmoothPath()
  const areaPath =
    chartPoints.length > 1
      ? `${smoothPath} L ${chartPoints[chartPoints.length - 1].x} 160 L ${chartPoints[0].x} 160 Z`
      : ""

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Header du Dashboard (Identique à la maquette de référence) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Bonjour, Admin
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {todayCapitalized} ·{" "}
            <span className="font-semibold text-foreground">
              {pendingOrdersCount} commande{pendingOrdersCount > 1 ? "s" : ""} à traiter
            </span>
          </p>
        </div>

        {/* Boutons d'actions rapides en haut à droite */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/orders")}
            className="h-9 px-4 text-xs font-semibold rounded-xl border-border bg-white text-foreground hover:bg-muted cursor-pointer shadow-2xs"
          >
            Voir les commandes
          </Button>

          <Button
            size="sm"
            onClick={() => navigate("/admin/products/new")}
            className="h-9 px-4 text-xs font-semibold rounded-xl bg-[#111111] hover:bg-[#222222] text-white cursor-pointer shadow-xs gap-1.5"
          >
            <span>+ Nouveau produit</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => loadData(period)}
            disabled={loading}
            className="h-9 w-9 rounded-xl border-border hover:bg-muted"
            title="Rafraîchir"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading ? "animate-spin text-[#C9A227]" : "text-muted-foreground"
              }`}
            />
          </Button>
        </div>
      </div>

      {/* 2. Cartes Statistiques KPI (Ligne de 4 cartes blanches minimalistes) */}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-5 border-border rounded-2xl shadow-2xs bg-white">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-28" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1 : Chiffre d'affaires */}
          <Card className="border-border bg-white rounded-2xl shadow-2xs p-5 hover:border-border/90 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Chiffre d'affaires
              </span>
              <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatMAD(totalRevenue)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>Commandes confirmées &amp; livrées</span>
              </div>
            </div>
          </Card>

          {/* KPI 2 : Commandes */}
          <Card className="border-border bg-white rounded-2xl shadow-2xs p-5 hover:border-border/90 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Commandes
              </span>
              <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {totalOrders}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>Sur la période sélectionnée</span>
              </div>
            </div>
          </Card>

          {/* KPI 3 : Panier moyen */}
          <Card className="border-border bg-white rounded-2xl shadow-2xs p-5 hover:border-border/90 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Panier moyen
              </span>
              <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatMAD(averageBasket)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>Moyenne par commande réalisée</span>
              </div>
            </div>
          </Card>

          {/* KPI 4 : À encaisser */}
          <Card className="border-border bg-white rounded-2xl shadow-2xs p-5 hover:border-border/90 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                À encaisser
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatMAD(toCollectRevenue)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold">
                  À la livraison
                </span>
                <span className="text-muted-foreground">Espèces attendues (COD)</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 3. Section Centrale : Graphique des Ventes + À traiter maintenant */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Colonne Gauche (approx. 65% : 8 cols) : Graphique des Ventes */}
        <Card className="lg:col-span-8 border-border bg-white rounded-2xl shadow-2xs p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Ventes
              </span>
              <div className="flex items-baseline gap-2.5 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                  {formatMAD(totalRevenue)}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                  +12%
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentMonthYearCapitalized}
                </span>
              </div>
            </div>

            {/* Onglets de période (7 jours, Ce mois, Année) */}
            <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 border border-border/60 text-xs font-medium">
              {[
                { id: "week", label: "7 jours" },
                { id: "month", label: "Ce mois" },
                { id: "all", label: "Année" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handlePeriodChange(tab.id)}
                  disabled={loading || isPending}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    period === tab.id
                      ? "bg-[#111111] text-white font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Graphique courbe fluide SVG basé sur les données réelles */}
          <div className="pt-4 flex-1 flex flex-col justify-end">
            <div className="relative h-48 w-full flex items-end">
              <svg
                viewBox="0 0 600 160"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#111111" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#111111" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Filled Area Under Curve */}
                {areaPath ? (
                  <path
                    d={areaPath}
                    fill="url(#salesGradient)"
                  />
                ) : (
                  <path
                    d="M 20 140 L 580 140 L 580 160 L 20 160 Z"
                    fill="url(#salesGradient)"
                  />
                )}

                {/* Curved Smooth Line */}
                {smoothPath ? (
                  <path
                    d={smoothPath}
                    fill="none"
                    stroke="#111111"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M 20 140 L 580 140"
                    fill="none"
                    stroke="#111111"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                )}

                {/* Active Tooltip Dot on Peak */}
                {peakPoint && peakPoint.rev > 0 && (
                  <circle cx={peakPoint.x} cy={peakPoint.y} r="5" fill="#C9A227" stroke="#111111" strokeWidth="2" />
                )}
              </svg>

              {/* Floating Tooltip Pill */}
              {peakPoint && peakPoint.rev > 0 ? (
                <div
                  style={{
                    left: `${Math.min(Math.max((peakPoint.x / 600) * 100, 10), 85)}%`,
                    top: `${Math.max((peakPoint.y / 160) * 100 - 20, 5)}%`,
                  }}
                  className="absolute bg-[#111111] text-white text-[11px] font-bold py-1 px-2.5 rounded-lg shadow-md pointer-events-none transform -translate-x-1/2"
                >
                  {formatMAD(peakPoint.rev)}
                </div>
              ) : null}
            </div>

            {/* X-Axis Real Dates */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/50">
              {activity.length > 0 ? (
                activity.map((d) => {
                  const dateObj = new Date(d.date)
                  const dayName = isNaN(dateObj.getTime())
                    ? d.date
                    : dateObj.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })
                  return (
                    <span key={d.date} className="capitalize">
                      {dayName}
                    </span>
                  )
                })
              ) : (
                <span>Aucune activité enregistrée</span>
              )}
            </div>
          </div>
        </Card>

        {/* Colonne Droite (approx. 35% : 4 cols) : À traiter maintenant */}
        <Card className="lg:col-span-4 border-border bg-white rounded-2xl shadow-2xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <CardTitle className="text-sm font-bold text-foreground">
                À traiter maintenant
              </CardTitle>
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full"
              >
                {pendingOrdersCount} en attente
              </Badge>
            </div>

            {/* Liste des commandes à traiter */}
            <div className="divide-y divide-border/50">
              {ordersToProcess.length > 0 ? (
                ordersToProcess.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                    className="py-3 flex items-center justify-between gap-2 hover:bg-muted/30 px-1 rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">
                        {order.customer_name}{" "}
                        <span className="text-[10px] text-muted-foreground font-mono font-normal">
                          {order.reference}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {order.city || "Maroc"} ·{" "}
                        <span className="font-semibold text-foreground">
                          {formatMAD(order.total)}
                        </span>{" "}
                        ·{" "}
                        <span>
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                              })
                            : "Récemment"}
                        </span>
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={(e) => handleConfirmOrder(e, order.id)}
                      disabled={confirmingOrderId === order.id}
                      className="h-8 px-3 text-[11px] font-semibold bg-[#111111] hover:bg-[#222222] text-white rounded-full shrink-0 shadow-2xs cursor-pointer"
                    >
                      {confirmingOrderId === order.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                      ) : (
                        <span>Confirmer</span>
                      )}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <Empty className="border-none py-4">
                    <EmptyTitle className="text-xs">Toutes les commandes sont traitées</EmptyTitle>
                    <EmptyDescription className="text-[11px]">
                      Aucune nouvelle commande en attente de confirmation immédiate.
                    </EmptyDescription>
                  </Empty>
                </div>
              )}
            </div>
          </div>

          <Link
            to="/admin/orders"
            className="pt-4 text-xs font-semibold text-foreground hover:text-[#C9A227] flex items-center gap-1 transition-colors border-t border-border/50 mt-4"
          >
            <span>Ouvrir toutes les commandes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>
      </div>

      {/* 4. Section Inférieure : 3 Cartes (Ventes par catégorie, Produits les plus vendus, Stock à surveiller) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* Carte 1 : Ventes par catégorie */}
        <Card className="border-border bg-white rounded-2xl shadow-2xs p-6 flex flex-col justify-between">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-sm font-bold text-foreground">
              Ventes par catégorie
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 space-y-3.5">
            {topCategories.length > 0 ? (
              topCategories.slice(0, 5).map((cat) => {
                const catRev = parseNum(cat.revenue)
                const pct =
                  totalCatRevenue > 0
                    ? Math.max(Math.round((catRev / totalCatRevenue) * 100), 5)
                    : 20

                return (
                  <div key={cat.id || cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-foreground">{cat.name}</span>
                      <span className="font-bold text-foreground">{pct}%</span>
                    </div>
                    <Progress
                      value={pct}
                      indicatorClassName="bg-[#111111]"
                      className="h-2 bg-muted/60"
                    />
                  </div>
                )
              })
            ) : (
              <Empty className="border-none py-6">
                <EmptyTitle className="text-xs">Aucune vente par catégorie</EmptyTitle>
                <EmptyDescription className="text-[11px]">
                  Les parts de vente s'afficheront dès la livraison des commandes.
                </EmptyDescription>
              </Empty>
            )}
          </CardContent>
        </Card>

        {/* Carte 2 : Produits les plus vendus */}
        <Card className="border-border bg-white rounded-2xl shadow-2xs p-6 flex flex-col justify-between">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-sm font-bold text-foreground">
              Produits les plus vendus
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 space-y-3">
            {topProducts.length > 0 ? (
              topProducts.slice(0, 4).map((prod, idx) => (
                <div key={prod.product_id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                        idx === 0
                          ? "bg-[#111111] text-white"
                          : "bg-muted/60 text-muted-foreground border border-border/60"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className="font-medium text-foreground truncate">
                      {prod.product_name}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-semibold shrink-0">
                    {prod.units_sold} vendus
                  </span>
                </div>
              ))
            ) : (
              <Empty className="border-none py-6">
                <EmptyTitle className="text-xs">Aucun produit vendu</EmptyTitle>
                <EmptyDescription className="text-[11px]">
                  Le classement des meilleures ventes s'affichera ici au fur et à mesure.
                </EmptyDescription>
              </Empty>
            )}
          </CardContent>
        </Card>

        {/* Carte 3 : Stock à surveiller */}
        <Card className="border-border bg-white rounded-2xl shadow-2xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4">
              <CardTitle className="text-sm font-bold text-foreground">
                Stock à surveiller
              </CardTitle>
              <Link
                to="/admin/inventory"
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                Voir le stock &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {stockAlerts.length > 0 ? (
                stockAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.variant_id}
                    onClick={() =>
                      navigate(`/admin/inventory?search=${encodeURIComponent(alert.product_name)}`)
                    }
                    className="flex items-center justify-between text-xs py-1 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-foreground truncate">{alert.product_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {alert.size ? `Taille ${alert.size}` : "Variante"} ·{" "}
                        {alert.stock === 0 ? "0 restant" : `${alert.stock} restantes`}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        alert.stock === 0
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {alert.stock === 0 ? "Rupture" : "Faible"}
                    </Badge>
                  </div>
                ))
              ) : (
                <Empty className="border-none py-6">
                  <EmptyTitle className="text-xs">Stocks sous contrôle</EmptyTitle>
                  <EmptyDescription className="text-[11px]">
                    Aucune variante en rupture ou sous le seuil d'alerte.
                  </EmptyDescription>
                </Empty>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
