<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\OrderResource;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\StockMovement;
use App\Services\InventoryService;
use App\Services\SettingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends ApiController
{
    public function __construct(
        protected InventoryService $inventoryService,
        protected SettingService $settingService
    ) {}

    /**
     * Return consolidated administrator dashboard analytics, KPIs and chart data.
     */
    public function index(Request $request): JsonResponse
    {
        $period = $request->input('period', 'all');
        $startDate = null;
        $endDate = Carbon::now()->endOfDay();

        if ($period === 'today') {
            $startDate = Carbon::today()->startOfDay();
        } elseif ($period === 'week') {
            $startDate = Carbon::now()->startOfWeek();
        } elseif ($period === 'month') {
            $startDate = Carbon::now()->startOfMonth();
        } elseif ($period === 'year') {
            $startDate = Carbon::now()->startOfYear();
        } elseif ($period === 'custom' && $request->filled('from')) {
            $startDate = Carbon::parse($request->input('from'))->startOfDay();
            if ($request->filled('to')) {
                $endDate = Carbon::parse($request->input('to'))->endOfDay();
            }
        }

        // Base order query with date scope
        $orderQuery = Order::query();
        if ($startDate) {
            $orderQuery->whereBetween('created_at', [$startDate, $endDate]);
        }

        $ordersCount = (clone $orderQuery)->count();

        // Count per status
        $statusCounts = (clone $orderQuery)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $ordersByStatus = [];
        foreach (OrderStatus::cases() as $case) {
            $ordersByStatus[$case->value] = [
                'label' => $case->label(),
                'count' => $statusCounts[$case->value] ?? 0,
            ];
        }

        // Realized revenue: only orders confirmed, in preparation, shipped or delivered
        // Strictly excludes pending, cancelled, return_requested, return_received, returned
        $realizedStatuses = [
            OrderStatus::CONFIRMED->value,
            OrderStatus::PROCESSING->value,
            OrderStatus::SHIPPED->value,
            OrderStatus::DELIVERED->value,
        ];

        $revenue = (clone $orderQuery)
            ->whereIn('status', $realizedStatuses)
            ->sum('total');

        // Low stock threshold from settings
        $lowStockThreshold = (int) $this->settingService->get('low_stock_threshold', 5);

        // Catalog & Inventory KPIs
        $totalProducts = Product::count();
        $activeProducts = Product::where('is_active', true)->count();
        $activeCategories = Category::where('is_active', true)->count();
        $totalVariants = ProductSize::count();
        $availableVariants = ProductSize::where('stock', '>', 0)->where('is_active', true)->count();
        $totalStock = (int) ProductSize::sum('stock');
        $outOfStockVariants = ProductSize::where('stock', 0)->count();
        $lowStockVariants = ProductSize::where('stock', '>', 0)
            ->where('stock', '<=', $lowStockThreshold)
            ->count();

        // 7-day activity chart
        $sevenDaysAgo = Carbon::now()->subDays(6)->startOfDay();
        $dailyData = Order::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('count(*) as count'),
            DB::raw('SUM(CASE WHEN status IN ("confirmed", "processing", "shipped", "delivered") THEN total ELSE 0 END) as revenue')
        )
            ->where('created_at', '>=', $sevenDaysAgo)
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date', 'asc')
            ->get()
            ->keyBy('date');

        $activityLast7Days = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = Carbon::now()->subDays($i)->format('Y-m-d');
            $row = $dailyData->get($day);
            $activityLast7Days[] = [
                'date' => $day,
                'orders_count' => $row ? (int) $row->count : 0,
                'revenue' => $row ? number_format((float) $row->revenue, 2, '.', '') : '0.00',
            ];
        }

        // Top 5 selling products
        $topProducts = OrderItem::select(
            'product_id',
            'product_name',
            DB::raw('SUM(quantity) as units_sold'),
            DB::raw('SUM(line_total) as revenue')
        )
            ->whereHas('order', function ($q) use ($startDate, $endDate, $realizedStatuses) {
                $q->whereIn('status', $realizedStatuses);
                if ($startDate) {
                    $q->whereBetween('created_at', [$startDate, $endDate]);
                }
            })
            ->groupBy('product_id', 'product_name')
            ->orderByDesc('units_sold')
            ->take(5)
            ->get()
            ->map(fn ($item) => [
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'units_sold' => (int) $item->units_sold,
                'revenue' => number_format((float) $item->revenue, 2, '.', ''),
            ]);

        // Top 5 selling categories
        $topCategories = OrderItem::join('products', 'order_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->whereIn('orders.status', $realizedStatuses)
            ->when($startDate, fn ($q) => $q->whereBetween('orders.created_at', [$startDate, $endDate]))
            ->select(
                'categories.id',
                'categories.name',
                DB::raw('SUM(order_items.line_total) as revenue'),
                DB::raw('SUM(order_items.quantity) as units_sold')
            )
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('revenue')
            ->take(5)
            ->get()
            ->map(fn ($cat) => [
                'category_id' => $cat->id,
                'category_name' => $cat->name,
                'units_sold' => (int) $cat->units_sold,
                'revenue' => number_format((float) $cat->revenue, 2, '.', ''),
            ]);

        // Stock alerts (out of stock and low stock)
        $stockAlerts = ProductSize::with('product')
            ->where('stock', '<=', $lowStockThreshold)
            ->orderBy('stock', 'asc')
            ->take(10)
            ->get()
            ->map(fn ($variant) => [
                'variant_id' => $variant->id,
                'product_id' => $variant->product_id,
                'product_name' => $variant->product?->name,
                'size' => $variant->size,
                'color' => $variant->color,
                'stock' => $variant->stock,
                'status' => $variant->stock === 0 ? 'out_of_stock' : 'low_stock',
            ]);

        $recentOrders = Order::with('items')
            ->latest()
            ->take(5)
            ->get();

        $inventoryStats = $this->inventoryService->getInventoryStats();

        // Stock détaillé par taille
        $stockBySize = ProductSize::select('size', DB::raw('SUM(stock) as total_stock'), DB::raw('COUNT(*) as variants_count'))
            ->groupBy('size')
            ->orderByDesc('total_stock')
            ->get()
            ->map(fn ($r) => [
                'size' => $r->size,
                'total_stock' => (int) $r->total_stock,
                'variants_count' => (int) $r->variants_count,
            ]);

        // Stock détaillé par couleur
        $stockByColor = ProductSize::select('color', DB::raw('SUM(stock) as total_stock'), DB::raw('COUNT(*) as variants_count'))
            ->groupBy('color')
            ->orderByDesc('total_stock')
            ->get()
            ->map(fn ($r) => [
                'color' => $r->color,
                'total_stock' => (int) $r->total_stock,
                'variants_count' => (int) $r->variants_count,
            ]);

        // 10 derniers mouvements de stock
        $recentMovements = StockMovement::with(['variant.product', 'user', 'order'])
            ->latest()
            ->take(10)
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'product_name' => $m->variant?->product?->name ?? 'Produit',
                'size' => $m->variant?->size,
                'color' => $m->variant?->color,
                'type' => $m->type,
                'quantity_before' => $m->quantity_before,
                'quantity_delta' => $m->quantity_delta,
                'quantity_after' => $m->quantity_after,
                'reason' => $m->reason,
                'admin_name' => $m->user?->name,
                'created_at' => $m->created_at?->toIso8601String(),
            ]);

        // Indicateurs du paiement à la réception (COD)
        $amountToCollect = (clone $orderQuery)
            ->whereNotIn('status', [OrderStatus::CANCELLED->value, OrderStatus::RETURNED->value])
            ->where('payment_status', PaymentStatus::PENDING->value)
            ->sum('total');

        $collectedRevenue = (clone $orderQuery)
            ->where('payment_status', PaymentStatus::PAID->value)
            ->sum('total');

        // Consolidated KPIs dictionary
        $kpis = [
            'total_orders' => $ordersCount,
            'pending_orders' => $statusCounts[OrderStatus::PENDING->value] ?? 0,
            'confirmed_orders' => $statusCounts[OrderStatus::CONFIRMED->value] ?? 0,
            'processing_orders' => $statusCounts[OrderStatus::PROCESSING->value] ?? 0,
            'shipped_orders' => $statusCounts[OrderStatus::SHIPPED->value] ?? 0,
            'delivered_orders' => $statusCounts[OrderStatus::DELIVERED->value] ?? 0,
            'cancelled_orders' => $statusCounts[OrderStatus::CANCELLED->value] ?? 0,
            'return_requested_orders' => $statusCounts[OrderStatus::RETURN_REQUESTED->value] ?? 0,
            'return_received_orders' => $statusCounts[OrderStatus::RETURN_RECEIVED->value] ?? 0,
            'returned_orders' => $statusCounts[OrderStatus::RETURNED->value] ?? 0,
            'revenue' => number_format((float) $revenue, 2, '.', ''),
            'amount_to_collect' => number_format((float) $amountToCollect, 2, '.', ''),
            'collected_revenue' => number_format((float) $collectedRevenue, 2, '.', ''),
            'payment_method' => 'cash_on_delivery',
            'is_delivery_free' => true,
            'currency' => 'MAD',
            'total_products' => $totalProducts,
            'active_products' => $activeProducts,
            'active_categories' => $activeCategories,
            'total_variants' => $totalVariants,
            'available_variants' => $availableVariants,
            'total_stock' => $totalStock,
            'out_of_stock_variants' => $outOfStockVariants,
            'low_stock_variants' => $lowStockVariants,
            'low_stock_threshold' => $lowStockThreshold,
        ];

        return $this->success([
            'period' => [
                'type' => $period,
                'start_date' => $startDate?->toDateString(),
                'end_date' => $endDate->toDateString(),
            ],
            'kpis' => $kpis,
            'orders_count' => $ordersCount,
            'orders_by_status' => $ordersByStatus,
            'revenue' => number_format((float) $revenue, 2, '.', ''),
            'activity_7_days' => $activityLast7Days,
            'charts' => [
                'activity_evolution' => $activityLast7Days,
                'status_distribution' => $ordersByStatus,
                'top_products' => $topProducts,
                'top_categories' => $topCategories,
            ],
            'stock_alerts' => $stockAlerts,
            'stock_by_size' => $stockBySize,
            'stock_by_color' => $stockByColor,
            'recent_movements' => $recentMovements,
            'recent_orders' => OrderResource::collection($recentOrders)->resolve(),
            'inventory' => $inventoryStats,
        ], 'Statistiques du tableau de bord récupérées.');
    }
}
