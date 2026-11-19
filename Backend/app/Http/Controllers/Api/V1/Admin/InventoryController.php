<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\AdjustStockRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Models\ProductSize;
use App\Models\StockMovement;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends ApiController
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    /**
     * Get paginated inventory dashboard with stats and filters.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'category_id' => $request->input('category_id', ''),
            'search' => $request->input('search', ''),
            'stock_status' => $request->input('stock_status', ''),
        ];

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $paginatedInventory = $this->inventoryService->getInventoryListing($filters, $perPage);
        $stats = $this->inventoryService->getInventoryStats();
        $categories = Category::orderBy('name')->get();

        return $this->success([
            'inventory' => [
                'data' => $paginatedInventory->items(),
                'pagination' => [
                    'current_page' => $paginatedInventory->currentPage(),
                    'last_page' => $paginatedInventory->lastPage(),
                    'per_page' => $paginatedInventory->perPage(),
                    'total' => $paginatedInventory->total(),
                ],
            ],
            'categories' => CategoryResource::collection($categories)->resolve(),
            'stats' => $stats,
            'filters' => $filters,
        ], 'Inventaire récupéré.');
    }

    /**
     * Manually adjust stock for a specific variant.
     */
    public function adjust(AdjustStockRequest $request, ProductSize $variant): JsonResponse
    {
        $validated = $request->validated();

        $movement = $this->inventoryService->adjustStock(
            $variant,
            (int) $validated['new_stock'],
            $validated['reason'] ?? null,
            $request->user()?->id
        );

        $variant->load('product');
        $productName = $variant->product?->name ?? 'Produit';

        return $this->success([
            'variant_id' => $variant->id,
            'size' => $variant->size,
            'color' => $variant->color,
            'stock' => $variant->fresh()->stock,
            'movement' => [
                'id' => $movement->id,
                'quantity_before' => $movement->quantity_before,
                'quantity_delta' => $movement->quantity_delta,
                'quantity_after' => $movement->quantity_after,
                'reason' => $movement->reason,
                'created_at' => $movement->created_at?->toIso8601String(),
            ],
        ], "Stock ajusté pour « {$productName} » ({$variant->size} / {$variant->color}) : {$movement->quantity_after} unités.");
    }

    /**
     * Get paginated stock movements audit trail.
     */
    public function movements(Request $request): JsonResponse
    {
        $query = StockMovement::with(['variant.product', 'user', 'order']);

        if ($request->filled('variant_id')) {
            $query->where('product_size_id', (int) $request->input('variant_id'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $movements = $query->latest()->paginate($perPage);

        return $this->success([
            'data' => collect($movements->items())->map(fn ($m) => [
                'id' => $m->id,
                'variant_id' => $m->product_size_id,
                'product_name' => $m->variant?->product?->name,
                'size' => $m->variant?->size,
                'color' => $m->variant?->color,
                'type' => $m->type,
                'quantity_before' => $m->quantity_before,
                'quantity_delta' => $m->quantity_delta,
                'quantity_after' => $m->quantity_after,
                'reason' => $m->reason,
                'admin_name' => $m->user?->name,
                'order_reference' => $m->order?->reference,
                'created_at' => $m->created_at?->toIso8601String(),
            ])->values(),
            'pagination' => [
                'current_page' => $movements->currentPage(),
                'last_page' => $movements->lastPage(),
                'per_page' => $movements->perPage(),
                'total' => $movements->total(),
            ],
        ], 'Mouvements de stock récupérés.');
    }

    /**
     * Toggle active status of a variant.
     */
    public function toggle(ProductSize $variant): JsonResponse
    {
        $variant->update([
            'is_active' => ! $variant->is_active,
        ]);

        $variant->load('product');
        $productName = $variant->product?->name ?? 'Produit';
        $statusLabel = $variant->is_active ? 'activée' : 'désactivée';

        return $this->success([
            'variant_id' => $variant->id,
            'product_id' => $variant->product_id,
            'size' => $variant->size,
            'color' => $variant->color,
            'stock' => (int) $variant->stock,
            'is_active' => (bool) $variant->is_active,
        ], "Variante {$variant->size} / {$variant->color} de « {$productName} » {$statusLabel}.");
    }
}
