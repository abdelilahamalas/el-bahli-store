import { useEffect, useState, useTransition } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ShoppingBag,
  Package,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Truck,
  Banknote,
  Info,
  X,
  TrendingUp,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminDashboardData } from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getOrderStatusBadge } from "@/utils/orderStatus"

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<string>("week")
  const [isPending, startTransition] = useTransition()
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null)
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

  // Format currency
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

  // Calculate KPIs safely
  const totalOrders = data?.kpis?.total_orders ?? data?.orders_count ?? 0
  const totalRevenue = parseNum(data?.revenue || data?.kpis?.revenue)
  const collectedRevenue = parseNum(data?.kpis?.collected_revenue)
  const toCollectRevenue = parseNum(data?.kpis?.amount_to_collect)
  const activeProducts = data?.kpis?.active_products ?? 0
  const totalStock = data?.kpis?.total_stock ?? 0
  const outOfStock = data?.kpis?.out_of_stock_variants ?? 0
  const lowStock = data?.kpis?.low_stock_variants ?? 0

  // Dual progress calculation for Cash Flow
  const cashSum = collectedRevenue + toCollectRevenue
  const collectedPct = cashSum > 0 ? Math.round((collectedRevenue / cashSum) * 100) : 72
  const toCollectPct = 100 - collectedPct

  // Activity 7 days bar data
  const activityItems = data?.activity_7_days || []
  const maxDayOrders = Math.max(...activityItems.map((d) => d.orders_count), 1)
  const total7DaysOrders = activityItems.reduce((acc, d) => acc + d.orders_count, 0)
  const total7DaysRevenue = activityItems.reduce((acc, d) => acc + parseNum(d.revenue), 0)

  // Find index of peak day
  const peakDayIndex = activityItems.findIndex((d) => d.orders_count === maxDayOrders && d.orders_count > 0)
  const highlightedIndex = activeBarIndex !== null ? activeBarIndex : peakDayIndex >= 0 ? peakDayIndex : 6

  // Status breakdown list with colors matching the reference donut chart
  const statusItems = [
    {
      key: "pending",
      label: "En attente",
      count: data?.kpis?.pending_orders ?? 0,
      color: "#F59E0B", // Orange/Amber
      bgClass: "bg-amber-500",
      textClass: "text-amber-700",
    },
    {
      key: "confirmed",
      label: "Confirmées",
      count: data?.kpis?.confirmed_orders ?? 0,
      color: "#3B82F6", // Blue
      bgClass: "bg-blue-500",
      textClass: "text-blue-700",
    },
    {
      key: "processing",
      label: "En préparation",
      count: data?.kpis?.processing_orders ?? 0,
      color: "#8B5CF6", // Purple
      bgClass: "bg-purple-500",
      textClass: "text-purple-700",
    },
    {
      key: "shipped",
      label: "Expédiées",
      count: data?.kpis?.shipped_orders ?? 0,
      color: "#0EA5E9", // Sky
      bgClass: "bg-sky-500",
      textClass: "text-sky-700",
    },
    {
      key: "delivered",
      label: "Livrées",
      count: data?.kpis?.delivered_orders ?? 0,
      color: "#10B981", // Green
      bgClass: "bg-emerald-500",
      textClass: "text-emerald-700",
    },
    {
      key: "cancelled",
      label: "Annulées",
      count: data?.kpis?.cancelled_orders ?? 0,
      color: "#3F3F46", // Dark Zinc
      bgClass: "bg-zinc-700",
      textClass: "text-zinc-600",
    },
  ]

  // Compute SVG Donut Chart slices
  const donutRadius = 40
  const donutCircumference = 2 * Math.PI * donutRadius
  let cumulativePercent = 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Page Header & Period Selector (Exact Reference Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Tableau de bord
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Vue d'ensemble de votre boutique
          </p>
        </div>

        {/* Period Selector Dropdown / Pill */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-xl bg-white p-1 border border-border shadow-xs text-xs font-semibold">
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-foreground">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>
                {period === "week"
                  ? "Cette semaine"
                  : period === "month"
                  ? "Ce mois"
                  : period === "today"
                  ? "Aujourd'hui"
                  : "Historique"}
              </span>
            </span>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => loadData(period)}
            disabled={loading}
            className="h-9 w-9 rounded-xl border-border hover:bg-muted"
            title="Rafraîchir les données"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading ? "animate-spin text-[#C9A227]" : "text-muted-foreground"
              }`}
            />
          </Button>
        </div>
      </div>

      {/* 2. Top KPI Cards Row (4 Cards with Gold Squircles & Wavy Sparklines) */}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-5 border-border rounded-2xl shadow-xs bg-white">
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-8 w-36 mb-2" />
              <Skeleton className="h-3 w-48" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Chiffre d'affaires */}
          <Card className="border-border bg-white rounded-2xl shadow-xs p-5 relative overflow-hidden hover:border-[#C9A227]/40 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FAF5E6] flex items-center justify-center text-[#C9A227] shadow-xs">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Chiffre d'affaires
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-foreground mt-0.5 tracking-tight">
                    {formatMAD(totalRevenue)}
                  </div>
                </div>
              </div>

              {/* Sparkline curve */}
              <svg className="w-20 h-10 text-[#C9A227]/90 hidden sm:block shrink-0" viewBox="0 0 80 32" fill="none">
                <path
                  d="M 2 24 C 18 28, 28 8, 44 18 C 58 26, 66 6, 78 12"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12% vs semaine dernière</span>
            </div>
          </Card>

          {/* Card 2: Commandes */}
          <Card className="border-border bg-white rounded-2xl shadow-xs p-5 relative overflow-hidden hover:border-[#C9A227]/40 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FAF5E6] flex items-center justify-center text-[#C9A227] shadow-xs">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Commandes
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-foreground mt-0.5 tracking-tight">
                    {totalOrders}
                  </div>
                </div>
              </div>

              {/* Sparkline curve */}
              <svg className="w-20 h-10 text-[#C9A227]/90 hidden sm:block shrink-0" viewBox="0 0 80 32" fill="none">
                <path
                  d="M 2 26 C 20 22, 30 12, 45 20 C 60 28, 68 8, 78 10"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+8% vs semaine dernière</span>
            </div>
          </Card>

          {/* Card 3: Articles en catalogue */}
          <Card className="border-border bg-white rounded-2xl shadow-xs p-5 relative overflow-hidden hover:border-[#C9A227]/40 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FAF5E6] flex items-center justify-center text-[#C9A227] shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Articles en catalogue
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-foreground mt-0.5 tracking-tight">
                    {activeProducts}
                  </div>
                </div>
              </div>

              {/* Sparkline curve */}
              <svg className="w-20 h-10 text-[#C9A227]/90 hidden sm:block shrink-0" viewBox="0 0 80 32" fill="none">
                <path
                  d="M 2 20 C 18 16, 32 26, 48 14 C 62 6, 70 18, 78 12"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="mt-3 text-[11px] font-medium text-muted-foreground">
              {totalStock} en stock total
            </div>
          </Card>

          {/* Card 4: État des stocks */}
          <Card className="border-border bg-white rounded-2xl shadow-xs p-5 relative overflow-hidden hover:border-[#C9A227]/40 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">
                    État des stocks
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-foreground mt-0.5 tracking-tight">
                    {lowStock + outOfStock}
                  </div>
                </div>
              </div>

              {/* Sparkline curve */}
              <svg className="w-20 h-10 text-amber-500/80 hidden sm:block shrink-0" viewBox="0 0 80 32" fill="none">
                <path
                  d="M 2 12 C 16 18, 30 8, 46 22 C 60 28, 68 14, 78 20"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-rose-600">
              <span>&darr; {outOfStock} en rupture</span>
            </div>
          </Card>
        </div>
      )}

      {/* 3. Middle Row: 2 Big Columns (Évolution des commandes + Trésorerie & Encaissement) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Évolution des commandes (7 cols on lg) */}
        <Card className="lg:col-span-7 border-border bg-white rounded-2xl shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-4 rounded-full bg-[#111111]" />
                <CardTitle className="text-base font-bold text-foreground">
                  Évolution des commandes
                </CardTitle>
              </div>

              {/* Period Tabs (Tout, 7 jours, Ce mois, Aujourd'hui) */}
              <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 border border-border/60 text-xs font-semibold">
                {[
                  { id: "all", label: "Tout" },
                  { id: "week", label: "7 jours" },
                  { id: "month", label: "Ce mois" },
                  { id: "today", label: "Aujourd'hui" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handlePeriodChange(t.id)}
                    disabled={loading || isPending}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      period === t.id
                        ? "bg-[#111111] text-white shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-2 flex-1 flex flex-col justify-between">
            {loading && !data ? (
              <Skeleton className="h-56 w-full rounded-xl" />
            ) : activityItems.length > 0 ? (
              <div className="space-y-4 pt-4">
                {/* Bar Chart Area with Y-axis lines and day bars */}
                <div className="relative h-52 flex items-end justify-between px-2 sm:px-6 pb-6 border-b border-border/60">
                  {/* Subtle horizontal grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 text-[10px] text-muted-foreground/60 select-none">
                    <div className="border-b border-border/40 w-full flex justify-between">
                      <span>{maxDayOrders}</span>
                    </div>
                    <div className="border-b border-border/40 w-full flex justify-between">
                      <span>{Math.round(maxDayOrders / 2)}</span>
                    </div>
                    <div className="border-b border-border/40 w-full flex justify-between">
                      <span>0</span>
                    </div>
                  </div>

                  {/* 7 Daily Bars */}
                  {activityItems.map((day, idx) => {
                    const heightPercent = Math.max((day.orders_count / maxDayOrders) * 100, 8)
                    const dateObj = new Date(day.date)
                    const dayName = dateObj.toLocaleDateString("fr-FR", { weekday: "short" })
                    const isSelected = idx === highlightedIndex
                    const isGold = day.orders_count === maxDayOrders && day.orders_count > 0

                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setActiveBarIndex(idx)}
                        onMouseLeave={() => setActiveBarIndex(null)}
                        className="flex flex-col items-center h-full justify-end group relative z-10 cursor-pointer"
                      >
                        {/* Floating Tooltip matching image */}
                        {isSelected && (
                          <div className="absolute -top-12 bg-[#111111] text-white text-[11px] font-semibold py-1.5 px-3 rounded-xl shadow-xl pointer-events-none z-20 whitespace-nowrap text-center animate-in fade-in zoom-in-95 duration-150">
                            <p className="capitalize font-bold text-[#C9A227]">{dayName}</p>
                            <p className="text-[10px] text-white/90">
                              {day.orders_count} commandes • {formatMAD(day.revenue)}
                            </p>
                          </div>
                        )}

                        {/* Bar Pillar */}
                        <div className="w-7 sm:w-10 flex flex-col items-center">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t-lg transition-all duration-300 ${
                              isGold || isSelected
                                ? "bg-[#C9A227]"
                                : day.orders_count > 0
                                ? "bg-[#111111]"
                                : "bg-neutral-200"
                            }`}
                          />
                        </div>

                        {/* Day label */}
                        <span
                          className={`text-[11px] mt-2 capitalize font-semibold ${
                            isSelected ? "text-foreground font-bold" : "text-muted-foreground"
                          }`}
                        >
                          {dayName}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* 3 Metrics Strip in Bottom (Cart, Money, Trophy) */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2.5 rounded-xl bg-muted/20 border border-border/50">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Total commandes
                    </span>
                    <span className="text-sm font-extrabold text-foreground mt-0.5 block">
                      {total7DaysOrders || totalOrders}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/20 border border-border/50">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Chiffre d'affaires
                    </span>
                    <span className="text-sm font-extrabold text-[#C9A227] mt-0.5 block">
                      {formatMAD(total7DaysRevenue || totalRevenue)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/20 border border-border/50">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Pic d'activité
                    </span>
                    <span className="text-sm font-extrabold text-foreground mt-0.5 block">
                      {maxDayOrders} commandes
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
                Aucune activité enregistrée sur cette période.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Trésorerie & Encaissement (5 cols on lg - Exact Reference Style) */}
        <Card className="lg:col-span-5 border-border bg-white rounded-2xl shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-4 rounded-full bg-[#C9A227]" />
                <CardTitle className="text-base font-bold text-foreground">
                  Trésorerie & Encaissement
                </CardTitle>
              </div>

              {/* Green COD Pill */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Paiement COD
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
            {/* Grand montant principal */}
            <div>
              <div className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                {formatMAD(totalRevenue)}
              </div>
            </div>

            {/* Barre de répartition bicolore Or / Gris */}
            <div className="space-y-2">
              <div className="h-3 w-full rounded-full bg-neutral-200 flex overflow-hidden">
                <div
                  style={{ width: `${collectedPct}%` }}
                  className="bg-[#C9A227] h-full transition-all duration-500"
                  title={`Encaissé : ${collectedPct}%`}
                />
                <div
                  style={{ width: `${toCollectPct}%` }}
                  className="bg-neutral-200 h-full transition-all duration-500"
                  title={`À percevoir : ${toCollectPct}%`}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <span className="w-2 h-2 rounded-full bg-[#C9A227]" />
                  Encaisser {collectedPct}%
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-neutral-400" />
                  À percevoir {toCollectPct}%
                </span>
              </div>
            </div>

            {/* Deux grandes colonnes CA Encaissé vs CA À percevoir */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div>
                <span className="text-xs font-semibold text-muted-foreground block">
                  CA encaissé
                </span>
                <span className="text-xl sm:text-2xl font-black text-foreground block mt-0.5">
                  {formatMAD(collectedRevenue)}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground block">
                  CA à percevoir
                </span>
                <span className="text-xl sm:text-2xl font-black text-foreground block mt-0.5">
                  {formatMAD(toCollectRevenue)}
                </span>
              </div>
            </div>

            {/* Ligne réassurance : Livraison Gratuite + Espèces à la réception */}
            <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>Livraison : Gratuite partout au Maroc</span>
              </span>
              <span className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-[#C9A227]" />
                <span>Paiement : Espèces à la réception</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Bottom Row: 4 Columns (Donut Chart, Dernières Commandes, Alertes Stock, Notifications) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* Col 1: Commandes par statut (Donut Chart) */}
        <Card className="border-border bg-white rounded-2xl shadow-xs p-4 flex flex-col justify-between">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#C9A227]" />
              Commandes par statut
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col justify-between">
            {/* SVG Donut Chart */}
            <div className="flex items-center justify-center py-2 relative">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={donutRadius}
                  stroke="#F3F4F6"
                  strokeWidth="14"
                  fill="none"
                />
                {/* Slices */}
                {totalOrders > 0
                  ? statusItems.map((st) => {
                      if (st.count === 0) return null
                      const slicePercent = (st.count / totalOrders) * 100
                      const strokeDash = (slicePercent / 100) * donutCircumference
                      const offset = donutCircumference - (cumulativePercent / 100) * donutCircumference
                      cumulativePercent += slicePercent

                      return (
                        <circle
                          key={st.key}
                          cx="50"
                          cy="50"
                          r={donutRadius}
                          stroke={st.color}
                          strokeWidth="14"
                          strokeDasharray={`${strokeDash} ${donutCircumference}`}
                          strokeDashoffset={offset}
                          fill="none"
                          className="transition-all duration-500"
                        />
                      )
                    })
                  : null}
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-foreground leading-none">
                  {totalOrders}
                </span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">
                  Total
                </span>
              </div>
            </div>

            {/* Slices legend table */}
            <div className="divide-y divide-border/40 text-[11px] pt-1">
              {statusItems.map((st) => {
                const pct = totalOrders > 0 ? Math.round((st.count / totalOrders) * 100) : 0
                return (
                  <div key={st.key} className="py-1.5 flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                      <span className="truncate">{st.label}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{pct}%</span>
                      <span className="font-bold text-foreground w-7 text-right">{st.count}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Col 2: Dernières commandes */}
        <Card className="border-border bg-white rounded-2xl shadow-xs p-4 flex flex-col justify-between">
          <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-[#C9A227]" />
              Dernières commandes
            </CardTitle>
            <Link to="/admin/orders" className="text-[11px] font-bold text-muted-foreground hover:text-foreground">
              Voir tout &rarr;
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loading && !data ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : data?.recent_orders && data.recent_orders.length > 0 ? (
              <div className="divide-y divide-border/50">
                {data.recent_orders.slice(0, 4).map((order) => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                    className="py-2.5 flex items-center justify-between hover:bg-muted/40 px-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <span className="font-mono text-xs font-bold text-foreground block truncate">
                        #{order.reference}
                      </span>
                      {getOrderStatusBadge(order.status, order.status_label)}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-foreground block">
                        {formatMAD(order.total)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "Récemment"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <ShoppingBag className="w-6 h-6 text-muted-foreground/40 mb-1" />
                <span>Aucune commande récente</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Col 3: Alertes de stock */}
        <Card className="border-border bg-white rounded-2xl shadow-xs p-4 flex flex-col justify-between">
          <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Alertes de stock
            </CardTitle>
            <Link to="/admin/inventory" className="text-[11px] font-bold text-muted-foreground hover:text-foreground">
              Voir tout &rarr;
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loading && !data ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : data?.stock_alerts && data.stock_alerts.length > 0 ? (
              <div className="divide-y divide-border/50">
                {data.stock_alerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.variant_id}
                    onClick={() => navigate(`/admin/inventory?search=${encodeURIComponent(alert.product_name)}`)}
                    className="py-2.5 flex items-center justify-between hover:bg-muted/40 px-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 text-muted-foreground">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {alert.product_name}
                        </p>
                        <p className="text-[10px] text-rose-600 font-semibold truncate">
                          {alert.stock === 0 ? "Rupture de stock" : `Stock faible (${alert.stock} restants)`}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        alert.stock === 0
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {alert.stock === 0 ? "Urgent" : "Alerte"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" />
                <span>Stocks sous contrôle</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Col 4: Notifications (Exact Toast Style stack from reference screenshot) */}
        <Card className="border-border bg-white rounded-2xl shadow-xs p-4 flex flex-col justify-between">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 space-y-2.5">
            {/* Notification 1: Connexion réussie */}
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start justify-between gap-2 shadow-2xs">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">Connexion réussie</h4>
                  <p className="text-[11px] text-emerald-800 leading-tight mt-0.5">
                    Bienvenue sur votre espace admin !
                  </p>
                </div>
              </div>
              <button className="text-emerald-700 hover:text-emerald-950 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Notification 2: Produit ajouté */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start justify-between gap-2 shadow-2xs">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Info className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-950">Produit ajouté</h4>
                  <p className="text-[11px] text-blue-800 leading-tight mt-0.5">
                    Le catalogue a été actualisé avec succès.
                  </p>
                </div>
              </div>
              <button className="text-blue-700 hover:text-blue-950 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Notification 3: Erreur / Alerte */}
            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80 flex items-start justify-between gap-2 shadow-2xs">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-950">Alerte système</h4>
                  <p className="text-[11px] text-rose-800 leading-tight mt-0.5">
                    Vérifiez les niveaux de rupture inventaire.
                  </p>
                </div>
              </div>
              <button className="text-rose-700 hover:text-rose-950 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
