import { useEffect, useState, useTransition } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Layers,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Phone,
  Calendar,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminDashboardData } from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Empty, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { getOrderStatusBadge } from "@/utils/orderStatus"

const chartConfig = {
  revenue: {
    label: "Chiffre d'affaires",
    color: "#C9A227",
  },
  orders: {
    label: "Commandes",
    color: "#111111",
  },
} satisfies ChartConfig

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<string>("month")
  const [isPending, startTransition] = useTransition()
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

  // Formatage monétaire
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

  // Données calculées réelles
  const totalRevenue = parseNum(data?.revenue || data?.kpis?.revenue)
  const totalOrders = data?.kpis?.total_orders ?? data?.orders_count ?? 0
  const totalProducts = data?.kpis?.total_products ?? 0
  const activeProducts = data?.kpis?.active_products ?? 0
  const activeCategories = data?.kpis?.active_categories ?? 0

  // Top products from API
  const topProducts = data?.charts?.top_products || []

  // Top categories from API
  const topCategories = data?.charts?.top_categories || []
  const totalCatRevenue = topCategories.reduce((acc, cat) => acc + parseNum(cat.revenue), 0)

  // Stock alerts
  const stockAlerts = data?.stock_alerts || []

  // Données formatées pour le graphique Recharts
  const activityData = (data?.activity_7_days || []).map((day) => {
    let formattedDate = day.date
    try {
      const parts = day.date.split("-")
      if (parts.length === 3) {
        formattedDate = `${parts[2]}/${parts[1]}`
      }
    } catch {
      // fallback
    }

    return {
      date: day.date,
      formattedDate,
      revenue: parseNum(day.revenue),
      orders: day.orders_count,
    }
  })

  const hasActivityData = activityData.some((d) => d.revenue > 0 || d.orders > 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header du Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Tableau de bord
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Vue d'ensemble en temps réel · {todayCapitalized} · El Bahli Store
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
              className={`w-4 h-4 ${loading ? "animate-spin text-[#C9A227]" : "text-muted-foreground"
                }`}
            />
          </Button>
        </div>
      </div>

      {/* =========================================================================
          PREMIÈRE SECTION : 4 CARTES KPI (Conformes à la section 3.3)
          1. Chiffre d'affaires
          2. Nombre de commandes
          3. Nombre de produits
          4. Nombre de catégories
         ========================================================================= */}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={`kpi-skeleton-${i}`} className="p-5 border-border rounded-2xl shadow-2xs bg-white">
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
            <CardHeader className="p-0 flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Chiffre d'affaires
              </CardTitle>
              <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-[#C9A227]" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {formatMAD(totalRevenue)}
              </div>
              <CardDescription className="mt-1.5 text-[11px] text-muted-foreground">
                Commandes confirmées &amp; livrées
              </CardDescription>
            </CardContent>
          </Card>

          {/* KPI 2 : Nombre de commandes */}
          <Card className="border-border bg-white rounded-2xl shadow-2xs p-5 hover:border-border/90 transition-colors">
            <CardHeader className="p-0 flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Commandes
              </CardTitle>
              <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground">
                <ShoppingBag className="w-4 h-4 text-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {totalOrders}
              </div>
              <CardDescription className="mt-1.5 text-[11px] text-muted-foreground">
                Sur la période sélectionnée
              </CardDescription>
            </CardContent>
          </Card>

          {/* KPI 3 : Nombre de produits */}
          <Card className="border-border bg-white rounded-2xl shadow-2xs p-5 hover:border-border/90 transition-colors">
            <CardHeader className="p-0 flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Produits au catalogue
              </CardTitle>
              <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground">
                <Package className="w-4 h-4 text-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {totalProducts}
              </div>
              <CardDescription className="mt-1.5 text-[11px] text-muted-foreground">
                {activeProducts} article{activeProducts > 1 ? "s" : ""} actif{activeProducts > 1 ? "s" : ""} en boutique
              </CardDescription>
            </CardContent>
          </Card>

          {/* KPI 4 : Nombre de catégories */}
          <Card className="border-border bg-white rounded-2xl shadow-2xs p-5 hover:border-border/90 transition-colors">
            <CardHeader className="p-0 flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Catégories
              </CardTitle>
              <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground">
                <Layers className="w-4 h-4 text-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {activeCategories}
              </div>
              <CardDescription className="mt-1.5 text-[11px] text-muted-foreground">
                Rayons streetwear organisés
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          DEUXIÈME SECTION : GRAPHIQUE DES VENTES (Recharts + Chart shadcn/ui)
         ========================================================================= */}
      <Card className="border-border bg-white rounded-2xl shadow-2xs p-6">
        <CardHeader className="p-0 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-foreground">
              Graphique des ventes
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Évolution du chiffre d'affaires sur la période sélectionnée ({period === "week" ? "7 derniers jours" : period === "month" ? currentMonthYearCapitalized : "Année en cours"})
            </CardDescription>
          </div>

          {/* Sélecteur de période shadcn segmenté & Affichage du Chiffre d'Affaires */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs flex items-center gap-2">
              <span className="text-muted-foreground text-[11px]">Total période :</span>
              <span className="font-extrabold text-sm text-[#C9A227]">{formatMAD(totalRevenue)}</span>
            </div>

            <div className="inline-flex items-center rounded-xl bg-muted/50 p-1 border border-border/70 text-xs font-medium self-start sm:self-auto">
              {[
                { id: "week", label: "7 derniers jours" },
                { id: "month", label: "Ce mois" },
                { id: "all", label: "Cette année" },
              ].map((tab) => (
                <Button
                  key={`period-tab-${tab.id}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePeriodChange(tab.id)}
                  disabled={loading || isPending}
                  className={`px-3 py-1.5 h-auto rounded-lg text-xs font-semibold cursor-pointer transition-all ${period === tab.id
                    ? "bg-[#18181B] text-white shadow-xs hover:bg-[#27272A]"
                    : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                    }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="h-[280px] w-full flex items-center justify-center">
              <Skeleton className="h-full w-full rounded-xl" />
            </div>
          ) : hasActivityData ? (
            <ChartContainer config={chartConfig} className="h-[290px] w-full">
              <AreaChart
                data={activityData}
                margin={{ top: 15, right: 25, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A227" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C9A227" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/60" />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  className="text-xs font-medium fill-muted-foreground"
                />
                <YAxis
                  width={75}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(v) => `${Number(v).toLocaleString("fr-FR")} DH`}
                  className="text-xs font-bold fill-foreground"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      labelFormatter={(val) => `Date : ${val}`}
                      formatter={(val) => [
                        <span key="val-tip" className="font-bold text-sm text-[#C9A227]">
                          {Number(val).toLocaleString("fr-FR")} MAD
                        </span>,
                        "Recettes",
                      ]}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#C9A227"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#fillRevenue)"
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center">
              <Empty className="border-none py-6">
                <EmptyMedia>
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle className="text-sm">Aucune donnée de ventes</EmptyTitle>
                <EmptyDescription className="text-xs">
                  Aucun chiffre d'affaires n'a été enregistré pour la période sélectionnée.
                </EmptyDescription>
              </Empty>
            </div>
          )}
        </CardContent>
      </Card>

      {/* =========================================================================
          TROISIÈME SECTION : DERNIÈRES COMMANDES (Table shadcn/ui)
         ========================================================================= */}
      <Card className="border-border bg-white rounded-2xl shadow-2xs overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-border/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              Dernières commandes enregistrées
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Historique récent des commandes passées par les clients sur la boutique
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/orders")}
            className="text-xs rounded-xl h-8 border-border hover:border-[#C9A227] hover:text-[#C9A227]"
          >
            Toutes les commandes &rarr;
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/60 bg-muted/20 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                <TableHead className="py-2.5 px-4 font-bold">Référence</TableHead>
                <TableHead className="py-2.5 px-4 font-bold">Client</TableHead>
                <TableHead className="py-2.5 px-4 font-bold">Téléphone</TableHead>
                <TableHead className="py-2.5 px-4 font-bold">Ville</TableHead>
                <TableHead className="py-2.5 px-4 font-bold">Date</TableHead>
                <TableHead className="py-2.5 px-4 font-bold">Montant</TableHead>
                <TableHead className="py-2.5 px-4 font-bold">Statut</TableHead>
                <TableHead className="py-2.5 px-4 text-right font-bold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-border/50">
              {loading ? (
                [...Array(5)].map((_, idx) => (
                  <TableRow key={`order-skeleton-${idx}`}>
                    <TableCell className="py-3 px-4"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="py-3 px-4"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="py-3 px-4"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="py-3 px-4"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="py-3 px-4"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="py-3 px-4"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="py-3 px-4"><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell className="py-3 px-4 text-right"><Skeleton className="h-7 w-16 ml-auto rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : data?.recent_orders && data.recent_orders.length > 0 ? (
                data.recent_orders.slice(0, 5).map((order) => (
                  <TableRow
                    key={`order-row-${order.id}`}
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <TableCell className="py-3 px-4 font-mono font-bold text-foreground">
                      {order.reference}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-semibold text-foreground">
                      {order.customer_name}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                      {order.customer_phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground/60" />
                          {order.customer_phone}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground">
                      {order.city || order.customer_city || "Maroc"}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                        : "Récemment"}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-bold text-foreground">
                      {formatMAD(order.total)}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      {getOrderStatusBadge(order.status)}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/admin/orders/${order.id}`)
                        }}
                        className="h-7 text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        Détails &rarr;
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center">
                    <Empty className="border-none py-4">
                      <EmptyTitle className="text-xs">Aucune commande récente</EmptyTitle>
                      <EmptyDescription className="text-[11px]">
                        Les commandes passées par les clients s'afficheront ici.
                      </EmptyDescription>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* =========================================================================
          QUATRIÈME SECTION : INFORMATIONS COMPLÉMENTAIRES (3 Cartes)
          1. Produits les plus vendus
          2. Alertes de stock
          3. Répartition des ventes par catégorie (AVEC CLÉ UNIQUE CORRIGÉE)
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* Carte 1 : Produits les plus vendus */}
        <Card className="border-border bg-white rounded-2xl shadow-2xs p-6 flex flex-col justify-between">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-sm font-bold text-foreground">
              Produits les plus vendus
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Articles les plus commandés
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 space-y-3">
            {topProducts.length > 0 ? (
              topProducts.slice(0, 4).map((prod, idx) => (
                <div
                  key={`top-product-${prod.product_id ?? idx}`}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${idx === 0
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
                  <div className="text-right shrink-0">
                    <span className="font-bold text-foreground block">
                      {formatMAD(prod.revenue)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {prod.units_sold} vente{prod.units_sold > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <Empty className="border-none py-6">
                <EmptyTitle className="text-xs">Aucune vente enregistrée</EmptyTitle>
                <EmptyDescription className="text-[11px]">
                  Le classement s'établira dès la confirmation des commandes.
                </EmptyDescription>
              </Empty>
            )}
          </CardContent>
          <div className="pt-4 border-t border-border/50 mt-4">
            <Link
              to="/admin/products"
              className="text-xs font-semibold text-foreground hover:text-[#C9A227] flex items-center justify-between transition-colors"
            >
              <span>Gérer le catalogue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Carte 2 : Alertes de stock */}
        <Card className="border-border bg-white rounded-2xl shadow-2xs p-6 flex flex-col justify-between">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Stocks à surveiller</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Ruptures et stocks &le; 5 unités
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="space-y-2.5">
              {stockAlerts.length > 0 ? (
                stockAlerts.slice(0, 4).map((alert, idx) => (
                  <div
                    key={`stock-alert-${alert.product_id}-${alert.variant_id ?? idx}`}
                    onClick={() => navigate(`/admin/inventory?search=${encodeURIComponent(alert.product_name)}`)}
                    className="flex items-center justify-between text-xs py-1 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-foreground truncate">{alert.product_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {alert.size ? `Taille ${alert.size}` : "Variante"}
                        {alert.color && alert.color !== "Standard" ? ` (${alert.color})` : ""} ·{" "}
                        {alert.stock === 0 ? "0 restant" : `${alert.stock} restantes`}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${alert.stock === 0
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
          </CardContent>
          <div className="pt-4 border-t border-border/50 mt-4">
            <Link
              to="/admin/inventory"
              className="text-xs font-semibold text-foreground hover:text-[#C9A227] flex items-center justify-between transition-colors"
            >
              <span>Ouvrir l'inventaire</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Carte 3 : Répartition des ventes par catégorie (AVEC CLÉ UNIQUE CORRIGÉE) */}
        <Card className="border-border bg-white rounded-2xl shadow-2xs p-6 flex flex-col justify-between">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-sm font-bold text-foreground">
              Ventes par catégorie
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Part de chiffre d'affaires
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 space-y-3.5">
            {topCategories.length > 0 ? (
              topCategories.slice(0, 5).map((cat, idx) => {
                const catId = cat.category_id ?? cat.id ?? idx
                const catName = cat.category_name || cat.name || `Catégorie #${catId}`
                const catRev = parseNum(cat.revenue)
                const pct =
                  totalCatRevenue > 0
                    ? Math.max(Math.round((catRev / totalCatRevenue) * 100), 5)
                    : 20

                return (
                  <div key={`category-row-${catId}`} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-foreground font-semibold">{catName}</span>
                      <span className="font-bold text-foreground">{pct}%</span>
                    </div>
                    <Progress
                      value={pct}
                      indicatorClassName="bg-[#C9A227]"
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
          <div className="pt-4 border-t border-border/50 mt-4">
            <Link
              to="/admin/categories"
              className="text-xs font-semibold text-foreground hover:text-[#C9A227] flex items-center justify-between transition-colors"
            >
              <span>Voir les catégories</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
