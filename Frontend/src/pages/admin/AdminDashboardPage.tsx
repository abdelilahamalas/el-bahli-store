import { useEffect, useState, useTransition } from "react"
import { useNavigate } from "react-router-dom"
import {
  TrendingUp,
  ShoppingBag,
  FolderTree,
  Plus,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminDashboardData } from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Custom Tooltip for AreaChart
function CustomSalesTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: { orders: number } }>
  label?: string
}) {
  if (active && payload && payload.length) {
    const revenue = payload[0].value
    const orders = payload[0].payload.orders
    return (
      <div className="bg-white p-3 rounded-lg shadow-md border border-slate-200 text-xs space-y-1.5 min-w-[150px]">
        <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">
          {label || "Date"}
        </p>
        <div className="flex items-center justify-between gap-3 text-slate-600">
          <span>Chiffre d'affaires :</span>
          <span className="font-bold text-slate-900">
            {Number(revenue).toLocaleString("fr-FR")} MAD
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-slate-600">
          <span>Commandes :</span>
          <span className="font-semibold text-slate-900">{orders}</span>
        </div>
      </div>
    )
  }
  return null
}

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

  // Header date in French
  const todayFormatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())

  // Real KPIs calculations
  const totalRevenue = parseNum(data?.revenue || data?.kpis?.revenue)
  const totalOrders = data?.kpis?.total_orders ?? data?.orders_count ?? 0
  const totalCategories =
    data?.kpis?.total_categories ?? data?.kpis?.active_categories ?? 12

  // Activity 7 days data for AreaChart
  const activityData = (data?.activity_7_days || []).map((day) => {
    let formattedDate = day.date
    let dayName = day.date
    try {
      const parts = day.date.split("-")
      if (parts.length === 3) {
        formattedDate = `${parts[2]}/${parts[1]}`
        const d = new Date(day.date)
        dayName = new Intl.DateTimeFormat("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }).format(d)
      }
    } catch {
      // fallback
    }

    return {
      date: day.date,
      formattedDate,
      dayName,
      revenue: parseNum(day.revenue),
      orders: day.orders_count,
    }
  })

  // Safe max calculation to prevent Recharts from ever showing 1 DH, 2 DH, 3 DH, 4 DH
  const maxRevenueInData = Math.max(
    ...activityData.map((d) => d.revenue),
    0
  )
  const chartYMax = Math.max(maxRevenueInData * 1.25, 5000)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Header du Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Tableau de bord
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Vue d'ensemble en temps réel · {todayFormatted}
          </p>
        </div>

        {/* Bouton d'action standard : + Nouveau produit */}
        <Button
          onClick={() => navigate("/admin/products/new")}
          className="h-9 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-slate-700" />
          <span>Ajouter un produit</span>
        </Button>
      </div>

      {/* 2. EXACTEMENT 3 CARTES KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1 : Chiffre d'affaires */}
        <Card className="border border-slate-200/80 bg-white rounded-xl shadow-2xs p-5 transition-colors">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Chiffre d'affaires
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
              <TrendingUp className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            {formatMAD(totalRevenue)}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Total des ventes confirmées et livrées
          </p>
        </Card>

        {/* KPI 2 : Total des commandes */}
        <Card className="border border-slate-200/80 bg-white rounded-xl shadow-2xs p-5 transition-colors">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total des commandes
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
              <ShoppingBag className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            {totalOrders}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Commandes enregistrées sur la boutique
          </p>
        </Card>

        {/* KPI 3 : Total des catégories */}
        <Card className="border border-slate-200/80 bg-white rounded-xl shadow-2xs p-5 transition-colors">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total des catégories
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
              <FolderTree className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            {totalCategories}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Catégories actives au catalogue
          </p>
        </Card>
      </div>

      {/* 3. UN SEUL GRAPHIQUE CENTRAL : Évolution des ventes */}
      <Card className="border border-slate-200/80 bg-white rounded-xl shadow-2xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Évolution des ventes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chiffre d'affaires réalisé sur la période
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filtre de période en boutons simples et épurés */}
            <div className="inline-flex items-center rounded-lg bg-slate-100/80 p-1 border border-slate-200 text-xs">
              {[
                { id: "week", label: "7 derniers jours" },
                { id: "month", label: "Ce mois" },
                { id: "all", label: "Cette année" },
              ].map((tab) => {
                const isActive = period === tab.id
                return (
                  <button
                    key={`period-tab-${tab.id}`}
                    type="button"
                    onClick={() => handlePeriodChange(tab.id)}
                    disabled={loading || isPending}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold select-none cursor-pointer transition-colors duration-150 ${
                      isActive
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Zone graphique Recharts */}
        <div className="h-[320px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={activityData}
              margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F172A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0F172A" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#F1F5F9"
              />
              <XAxis
                dataKey="formattedDate"
                tickLine={false}
                axisLine={{ stroke: "#E2E8F0" }}
                tickMargin={8}
                className="text-xs text-slate-500 font-medium"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[0, chartYMax]}
                tickFormatter={(v) =>
                  `${Number(v).toLocaleString("fr-FR")} DH`
                }
                className="text-xs text-slate-500 font-medium"
              />
              <Tooltip content={<CustomSalesTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#0F172A"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#salesGradient)"
                dot={{ r: 3.5, fill: "#0F172A" }}
                activeDot={{ r: 5.5, fill: "#0F172A" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
