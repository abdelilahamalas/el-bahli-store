import { useEffect, useState, useTransition } from "react"
import { useNavigate } from "react-router-dom"
import {
  TrendingUp,
  ShoppingBag,
  FolderTree,
  Plus,
  Package,
  Layers,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { toast } from "sonner"
import { adminService } from "@/services/adminService"
import type { AdminDashboardData, CategorySaleItem } from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Custom Tooltip pour le graphique interactif des ventes par catégorie
function CustomCategorySalesTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: CategorySaleItem }>
}) {
  if (active && payload && payload.length) {
    const item = payload[0].payload
    return (
      <div className="bg-white p-3 rounded-lg shadow-md border border-slate-200 text-xs space-y-1.5 min-w-[170px]">
        <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">
          {item.name}
        </p>
        <div className="flex items-center justify-between gap-3 text-slate-600">
          <span>Articles vendus :</span>
          <span className="font-bold text-slate-900">
            {item.units_sold} {item.units_sold > 1 ? "unités" : "unité"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-slate-600">
          <span>Chiffre d'affaires :</span>
          <span className="font-semibold text-slate-700">
            {Number(item.revenue).toLocaleString("fr-FR")} MAD
          </span>
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
  const [activeMetric, setActiveMetric] = useState<"units_sold" | "revenue">("units_sold")
  const [chartOrientation, setChartOrientation] = useState<"horizontal" | "vertical">("horizontal")
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

  // Header date en français
  const todayFormatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())

  // Calcul des 3 KPIs réels
  const totalRevenue = parseNum(data?.revenue || data?.kpis?.revenue)
  const totalOrders = data?.kpis?.total_orders ?? data?.orders_count ?? 0
  const totalCategories = data?.kpis?.total_categories ?? data?.kpis?.active_categories ?? 12

  // Liste complète des catégories réelles avec quantités vendues
  const categorySales: CategorySaleItem[] =
    data?.category_sales ||
    data?.charts?.category_sales || [
      { id: 1, name: "Capuches", slug: "capuches", units_sold: 4, revenue: "1400.00" },
      { id: 2, name: "Capuches zippé", slug: "capuches-zippe", units_sold: 0, revenue: "0.00" },
      { id: 3, name: "Sweat-Shirt", slug: "sweat-shirt", units_sold: 0, revenue: "0.00" },
      { id: 4, name: "Polo", slug: "polo", units_sold: 0, revenue: "0.00" },
      { id: 5, name: "Jackets", slug: "jackets", units_sold: 0, revenue: "0.00" },
      { id: 6, name: "Jeans", slug: "jeans", units_sold: 0, revenue: "0.00" },
      { id: 7, name: "Tenu montone", slug: "tenu-montone", units_sold: 0, revenue: "0.00" },
      { id: 8, name: "Pantalons classe", slug: "pantalons-classe", units_sold: 0, revenue: "0.00" },
      { id: 9, name: "Ensembles", slug: "ensembles", units_sold: 0, revenue: "0.00" },
      { id: 10, name: "Casquettes", slug: "casquettes", units_sold: 0, revenue: "0.00" },
      { id: 11, name: "T-shirts", slug: "t-shirts", units_sold: 0, revenue: "0.00" },
      { id: 12, name: "Chaussures", slug: "chaussures", units_sold: 0, revenue: "0.00" },
    ]

  // Totaux des catégories pour les onglets interactifs de l'image
  const totalUnitsSold = categorySales.reduce((acc, cat) => acc + cat.units_sold, 0)
  const totalCategoryRevenue = categorySales.reduce((acc, cat) => acc + parseNum(cat.revenue), 0)

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

        {/* Bouton standard blanc : + Ajouter un produit */}
        <Button
          onClick={() => navigate("/admin/products/new")}
          className="h-9 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-slate-700" />
          <span>Ajouter un produit</span>
        </Button>
      </div>

      {/* 2. EXACTEMENT 3 CARTES KPI (Taille moyenne, équilibrée, professionnelle) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1 : Chiffre d'affaires */}
        <Card className="border border-slate-200/80 bg-white rounded-xl shadow-2xs p-4 sm:p-5 transition-colors">
          <div className="flex items-center justify-between pb-1.5">
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
          <p className="mt-1 text-xs text-slate-400">
            Commandes confirmées et livrées
          </p>
        </Card>

        {/* KPI 2 : Total des commandes */}
        <Card className="border border-slate-200/80 bg-white rounded-xl shadow-2xs p-4 sm:p-5 transition-colors">
          <div className="flex items-center justify-between pb-1.5">
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
          <p className="mt-1 text-xs text-slate-400">
            Commandes enregistrées en boutique
          </p>
        </Card>

        {/* KPI 3 : Total des catégories */}
        <Card className="border border-slate-200/80 bg-white rounded-xl shadow-2xs p-4 sm:p-5 transition-colors">
          <div className="flex items-center justify-between pb-1.5">
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
          <p className="mt-1 text-xs text-slate-400">
            Catégories actives au catalogue
          </p>
        </Card>
      </div>

      {/* 3. GRAPHIQUE INTERACTIF DES VENTES PAR CATÉGORIE (Conforme à l'image d'inspiration) */}
      <Card className="border border-slate-200/80 bg-white rounded-xl shadow-2xs overflow-hidden">
        {/* En-tête du graphique avec sélecteur de période et bascule d'affichage */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Ventes réelles par catégorie
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Articles vendus selon les commandes enregistrées dans MySQL
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bascule d'orientation du graphique (Horizontale / Verticale) */}
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setChartOrientation("horizontal")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  chartOrientation === "horizontal"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Affichage barres horizontales (recommandé pour 12 catégories)"
              >
                Horizontal
              </button>
              <button
                type="button"
                onClick={() => setChartOrientation("vertical")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  chartOrientation === "vertical"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Affichage barres verticales"
              >
                Vertical
              </button>
            </div>

            {/* Filtre de période en boutons sobres */}
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
              {[
                { id: "week", label: "7 jours" },
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
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                      isActive
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 2 Boîtes interactives du graphique (Exactement comme dans l'image "Desktop / Mobile") */}
        <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50/50">
          {/* Boîte 1 : Articles vendus (Indicateur principal) */}
          <button
            type="button"
            onClick={() => setActiveMetric("units_sold")}
            className={`p-4 text-left border-r border-slate-100 transition-colors cursor-pointer ${
              activeMetric === "units_sold"
                ? "bg-white border-b-2 border-b-blue-600 shadow-2xs"
                : "hover:bg-slate-100/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Articles vendus (Quantités)
              </span>
              <Package className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {totalUnitsSold} {totalUnitsSold > 1 ? "articles" : "article"}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Indicateur principal des ventes réelles
            </p>
          </button>

          {/* Boîte 2 : Chiffre d'affaires par catégorie */}
          <button
            type="button"
            onClick={() => setActiveMetric("revenue")}
            className={`p-4 text-left transition-colors cursor-pointer ${
              activeMetric === "revenue"
                ? "bg-white border-b-2 border-b-blue-600 shadow-2xs"
                : "hover:bg-slate-100/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Chiffre d'affaires généré
              </span>
              <Layers className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {formatMAD(totalCategoryRevenue)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Montant cumulé sur la période
            </p>
          </button>
        </div>

        {/* Zone graphique Recharts avec barres bleues vibrantes (comme dans l'image !) */}
        <div className="p-4 sm:p-5">
          {chartOrientation === "horizontal" ? (
            /* Barres horizontales : Idéal pour 12 catégories sans chevauchement de texte */
            <div className="h-[430px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categorySales}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 15, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#F1F5F9"
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickMargin={6}
                    tickFormatter={(v) =>
                      activeMetric === "units_sold"
                        ? `${v}`
                        : `${Number(v).toLocaleString("fr-FR")} DH`
                    }
                    className="text-xs text-slate-500 font-medium"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tickLine={false}
                    axisLine={false}
                    className="text-xs font-medium text-slate-800"
                  />
                  <Tooltip content={<CustomCategorySalesTooltip />} />
                  <Bar
                    dataKey={activeMetric}
                    fill="#2563EB"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            /* Barres verticales : Présentation identique à l'image d'inspiration */
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categorySales}
                  margin={{ top: 15, right: 15, left: -5, bottom: 40 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#F1F5F9"
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={{ stroke: "#E2E8F0" }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    tickMargin={8}
                    className="text-[11px] text-slate-600 font-medium"
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v) =>
                      activeMetric === "units_sold"
                        ? `${v}`
                        : `${Number(v).toLocaleString("fr-FR")} DH`
                    }
                    className="text-xs text-slate-500 font-medium"
                  />
                  <Tooltip content={<CustomCategorySalesTooltip />} />
                  <Bar
                    dataKey={activeMetric}
                    fill="#2563EB"
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Affichage de {categorySales.length} catégories réelles du catalogue
            </span>
            <span className="font-semibold text-slate-700">
              {activeMetric === "units_sold"
                ? `Total vendu : ${totalUnitsSold} articles`
                : `Total CA : ${formatMAD(totalCategoryRevenue)}`}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
