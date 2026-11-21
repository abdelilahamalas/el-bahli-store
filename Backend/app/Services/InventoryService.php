<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderReturn;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\StockMovement;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public const DEFAULT_LOW_STOCK_THRESHOLD = 5;

    public function __construct(
        protected SettingService $settingService,
        protected AuditService $auditService
    ) {}

    /**
     * Get the configured low stock threshold.
     */
    public function getLowStockThreshold(): int
    {
        $threshold = $this->settingService->get('low_stock_threshold');

        return $threshold !== null ? max(1, (int) $threshold) : self::DEFAULT_LOW_STOCK_THRESHOLD;
    }

    /**
     * Atomically verify and decrement stock upon order confirmation by administrator.
     * Idempotent: will not decrement again if already processed.
     *
     * @throws ValidationException
     */
    public function confirmOrderStock(Order $order, ?int $userId = null): void
    {
        // Idempotency: verify if this order has already had its stock decremented
        $alreadyConfirmed = StockMovement::where('order_id', $order->id)
            ->where('type', StockMovement::TYPE_ORDER_CONFIRMATION)
            ->exists();

        if ($alreadyConfirmed || $order->confirmed_at !== null) {
            return;
        }

        // Lock variants in stable order by product_id, size, color to prevent deadlocks
        $sortedItems = $order->items
            ->sortBy(fn ($item) => "{$item->product_id}_{$item->size}_{$item->couleur_copie}")
            ->values();

        // Pass 1: Verify all variants and stocks with lockForUpdate before modifying anything
        $variantsToProcess = [];

        foreach ($sortedItems as $item) {
            if (! $item->product_id) {
                continue;
            }

            $color = $item->couleur_copie ?: 'Standard';

            /** @var ProductSize|null $variant */
            $variant = ProductSize::where('product_id', $item->product_id)
                ->where('size', $item->size)
                ->where('color', $color)
                ->lockForUpdate()
                ->first();

            if (! $variant) {
                $colorLabel = $color !== 'Standard' ? " / {$color}" : '';
                throw ValidationException::withMessages([
                    'stock' => "La variante « {$item->size}{$colorLabel} » du produit « {$item->product_name} » n'existe plus en stock.",
                ]);
            }

            if ($variant->stock < $item->quantity) {
                $colorLabel = $color !== 'Standard' ? " en couleur « {$color} »" : '';
                throw ValidationException::withMessages([
                    'stock' => "Stock insuffisant pour « {$item->product_name} » en taille « {$item->size} »{$colorLabel} (stock disponible : {$variant->stock}, quantité requise : {$item->quantity}). La commande reste en attente.",
                ]);
            }

            $variantsToProcess[] = [
                'variant' => $variant,
                'quantity' => (int) $item->quantity,
            ];
        }

        // Pass 2: Atomically decrement all variants and write stock movement records
        foreach ($variantsToProcess as $entry) {
            /** @var ProductSize $variant */
            $variant = $entry['variant'];
            $qty = $entry['quantity'];

            $before = $variant->stock;
            $after = $before - $qty;

            $variant->decrement('stock', $qty);

            StockMovement::create([
                'product_size_id' => $variant->id,
                'order_id' => $order->id,
                'user_id' => $userId,
                'type' => StockMovement::TYPE_ORDER_CONFIRMATION,
                'quantity_before' => $before,
                'quantity_delta' => -$qty,
                'quantity_after' => $after,
                'reason' => "Confirmation de la commande {$order->reference}",
            ]);
        }
    }

    /**
     * Atomically restore stock upon order cancellation.
     * Only restores if stock was previously decremented during confirmation!
     * Idempotent: will not restore twice.
     */
    public function restoreOrderStock(Order $order, ?int $userId = null): void
    {
        // Only restore if confirmation movement exists or order was confirmed
        $wasConfirmed = StockMovement::where('order_id', $order->id)
            ->where('type', StockMovement::TYPE_ORDER_CONFIRMATION)
            ->exists() || ($order->confirmed_at !== null);

        if (! $wasConfirmed) {
            // Order was still pending: stock was never decremented, nothing to restore!
            return;
        }

        // Idempotency: verify if cancellation movement already exists
        $alreadyRestored = StockMovement::where('order_id', $order->id)
            ->where('type', StockMovement::TYPE_ORDER_CANCELLATION)
            ->exists();

        if ($alreadyRestored || $order->cancelled_at !== null) {
            return;
        }

        $sortedItems = $order->items
            ->sortBy(fn ($item) => "{$item->product_id}_{$item->size}_{$item->couleur_copie}")
            ->values();

        foreach ($sortedItems as $item) {
            if (! $item->product_id) {
                continue;
            }

            $color = $item->couleur_copie ?: 'Standard';

            /** @var ProductSize|null $variant */
            $variant = ProductSize::where('product_id', $item->product_id)
                ->where('size', $item->size)
                ->where('color', $color)
                ->lockForUpdate()
                ->first();

            if ($variant) {
                $before = $variant->stock;
                $after = $before + $item->quantity;

                $variant->increment('stock', $item->quantity);

                StockMovement::create([
                    'product_size_id' => $variant->id,
                    'order_id' => $order->id,
                    'user_id' => $userId,
                    'type' => StockMovement::TYPE_ORDER_CANCELLATION,
                    'quantity_before' => $before,
                    'quantity_delta' => +$item->quantity,
                    'quantity_after' => $after,
                    'reason' => "Annulation de la commande {$order->reference}",
                ]);
            }
        }
    }

    /**
     * Atomically restore stock for returned items that are declared resellable.
     * Damaged items are recorded but NEVER restored to available stock.
     *
     * @param  array<int, array{order_item_id: int, quantity_returned: int, quantity_resellable?: int, quantity_damaged?: int, reason?: string|null}>  $returnsData
     * @return array<int, OrderReturn>
     *
     * @throws ValidationException
     */
    public function restockReturnedItems(Order $order, array $returnsData, ?int $userId = null): array
    {
        $createdReturns = [];

        foreach ($returnsData as $returnData) {
            /** @var OrderItem $orderItem */
            $orderItem = OrderItem::where('order_id', $order->id)
                ->where('id', $returnData['order_item_id'])
                ->firstOrFail();

            $qtyReturned = (int) $returnData['quantity_returned'];
            $qtyResellable = isset($returnData['quantity_resellable'])
                ? (int) $returnData['quantity_resellable']
                : $qtyReturned;
            $qtyDamaged = isset($returnData['quantity_damaged'])
                ? (int) $returnData['quantity_damaged']
                : ($qtyReturned - $qtyResellable);

            if (($qtyResellable + $qtyDamaged) !== $qtyReturned) {
                throw ValidationException::withMessages([
                    'returns' => 'La somme des articles revendables et endommagés doit être exactement égale à la quantité retournée.',
                ]);
            }

            if ($qtyReturned > $orderItem->quantity) {
                throw ValidationException::withMessages([
                    'returns' => "La quantité retournée ({$qtyReturned}) dépasse la quantité commandée ({$orderItem->quantity}).",
                ]);
            }

            $color = $orderItem->couleur_copie ?: 'Standard';

            /** @var ProductSize|null $variant */
            $variant = ProductSize::where('product_id', $orderItem->product_id)
                ->where('size', $orderItem->size)
                ->where('color', $color)
                ->lockForUpdate()
                ->first();

            $variantId = $variant?->id ?? $orderItem->product_size_id;

            // Restock only resellable units
            if ($qtyResellable > 0 && $variant) {
                $before = $variant->stock;
                $after = $before + $qtyResellable;
                $variant->increment('stock', $qtyResellable);

                StockMovement::create([
                    'product_size_id' => $variant->id,
                    'order_id' => $order->id,
                    'user_id' => $userId,
                    'type' => StockMovement::TYPE_RETURN_RESTOCK,
                    'quantity_before' => $before,
                    'quantity_delta' => $qtyResellable,
                    'quantity_after' => $after,
                    'reason' => "Retour commande #{$order->reference} (quantité revendable réintégrée: {$qtyResellable})",
                ]);
            }

            $orderReturn = OrderReturn::create([
                'order_id' => $order->id,
                'order_item_id' => $orderItem->id,
                'product_size_id' => $variantId,
                'quantity_returned' => $qtyReturned,
                'quantity_resellable' => $qtyResellable,
                'quantity_damaged' => $qtyDamaged,
                'restocked' => ($qtyResellable > 0),
                'reason' => $returnData['reason'] ?? null,
                'user_id' => $userId,
            ]);

            $createdReturns[] = $orderReturn;
        }

        return $createdReturns;
    }

    /**
     * Manually adjust stock for a variant with audit trail and movement recording.
     *
     * @throws ValidationException
     */
    public function adjustStock(ProductSize $variant, int $newStock, ?string $reason = null, ?int $userId = null): StockMovement
    {
        if ($newStock < 0) {
            throw ValidationException::withMessages([
                'stock' => 'Le stock ne peut pas être négatif.',
            ]);
        }

        return DB::transaction(function () use ($variant, $newStock, $reason, $userId) {
            /** @var ProductSize $locked */
            $locked = ProductSize::with('product')->where('id', $variant->id)->lockForUpdate()->firstOrFail();

            $before = $locked->stock;
            $delta = $newStock - $before;
            $after = $newStock;

            $locked->update(['stock' => $newStock]);

            $movement = StockMovement::create([
                'product_size_id' => $locked->id,
                'order_id' => null,
                'user_id' => $userId,
                'type' => StockMovement::TYPE_MANUAL_ADJUSTMENT,
                'quantity_before' => $before,
                'quantity_delta' => $delta,
                'quantity_after' => $after,
                'reason' => $reason ?: 'Ajustement manuel administratif',
            ]);

            $this->auditService->log('inventory.adjusted', $locked, [
                'product_name' => $locked->product?->name,
                'size' => $locked->size,
                'color' => $locked->color,
                'before' => $before,
                'new_stock' => $newStock,
                'delta' => $delta,
                'reason' => $reason,
            ], $userId);

            return $movement;
        });
    }

    /**
     * Compute comprehensive inventory and stock KPIs.
     *
     * @return array<string, mixed>
     */
    public function getInventoryStats(): array
    {
        $lowThreshold = $this->getLowStockThreshold();

        $totalProducts = Product::count();
        $totalVariants = ProductSize::count();
        $totalStock = (int) ProductSize::sum('stock');
        $outOfStockCount = ProductSize::where('stock', '<=', 0)->count();
        $lowStockCount = ProductSize::where('stock', '>', 0)->where('stock', '<=', $lowThreshold)->count();
        $inStockCount = ProductSize::where('stock', '>', $lowThreshold)->count();

        // Products with total variant stock = 0
        $productsOutOfStock = Product::whereDoesntHave('sizes', function ($query) {
            $query->where('stock', '>', 0);
        })->count();

        // Products having at least one variant with stock > 0 but total <= threshold, or having a low-stock variant
        $productsLowStock = Product::whereHas('sizes', function ($query) {
            $query->where('stock', '>', 0);
        })->whereHas('sizes', function ($query) use ($lowThreshold) {
            $query->where('stock', '>', 0)->where('stock', '<=', $lowThreshold);
        })->count();

        $estimatedStockValue = (float) DB::table('product_sizes')
            ->join('products', 'products.id', '=', 'product_sizes.product_id')
            ->selectRaw('COALESCE(SUM(products.price * product_sizes.stock), 0) as val')
            ->value('val');

        $pendingOrders = Order::where('status', 'pending')->count();
        $confirmedOrders = Order::where('status', 'confirmed')->count();

        return [
            'total_units' => $totalStock,
            'total_stock' => $totalStock,
            'total_products' => $totalProducts,
            'total_variants' => $totalVariants,
            'in_stock_count' => $inStockCount,
            'low_stock_count' => $lowStockCount,
            'out_of_stock_count' => $outOfStockCount,
            'products_out_of_stock' => $productsOutOfStock,
            'products_low_stock' => $productsLowStock,
            'estimated_stock_value' => number_format($estimatedStockValue, 2, '.', ''),
            'pending_orders' => $pendingOrders,
            'confirmed_orders' => $confirmedOrders,
            'low_stock_threshold' => $lowThreshold,
        ];
    }

    /**
     * Retrieve paginated inventory grouped by product, including category, variants, and stock status.
     *
     * @param  array{category_id?: mixed, search?: mixed, stock_status?: mixed}  $filters
     */
    public function getInventoryListing(array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $lowThreshold = $this->getLowStockThreshold();

        $query = Product::with(['category', 'sizes', 'mainImage'])
            ->withSum('sizes as total_stock', 'stock');

        if (! empty($filters['category_id'])) {
            $query->where('category_id', (int) $filters['category_id']);
        }

        if (! empty($filters['search'])) {
            $search = '%'.trim((string) $filters['search']).'%';
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', $search)
                    ->orWhereHas('category', fn ($c) => $c->where('name', 'like', $search));
            });
        }

        if (! empty($filters['stock_status'])) {
            $status = $filters['stock_status'];
            if ($status === 'rupture') {
                $query->whereDoesntHave('sizes', fn ($q) => $q->where('stock', '>', 0));
            } elseif ($status === 'stock_faible') {
                $query->whereHas('sizes', fn ($q) => $q->where('stock', '>', 0))
                    ->where(function ($q) use ($lowThreshold) {
                        $q->whereRaw('(SELECT COALESCE(SUM(stock), 0) FROM product_sizes WHERE product_sizes.product_id = products.id) <= ?', [$lowThreshold]);
                    });
            } elseif ($status === 'disponible') {
                $query->where(function ($q) use ($lowThreshold) {
                    $q->whereRaw('(SELECT COALESCE(SUM(stock), 0) FROM product_sizes WHERE product_sizes.product_id = products.id) > ?', [$lowThreshold]);
                });
            }
        }

        $paginator = $query->latest('id')->paginate($perPage)->withQueryString();

        // Transform collection to include calculated stock status
        $paginator->getCollection()->transform(function (Product $product) use ($lowThreshold) {
            $totalStock = (int) ($product->total_stock ?? $product->sizes->sum('stock'));

            if ($totalStock <= 0) {
                $stockStatus = 'rupture';
                $stockStatusLabel = 'Rupture de stock';
            } elseif ($totalStock <= $lowThreshold) {
                $stockStatus = 'stock_faible';
                $stockStatusLabel = 'Stock faible';
            } else {
                $stockStatus = 'disponible';
                $stockStatusLabel = 'Disponible';
            }

            return [
                'id' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'category_id' => $product->category_id,
                'category_name' => $product->category?->name,
                'price' => number_format((float) $product->price, 2, '.', ''),
                'is_active' => (bool) $product->is_active,
                'image_url' => $product->mainImage?->chemin_image ? asset('storage/'.$product->mainImage->chemin_image) : ($product->image ? asset('storage/'.$product->image) : null),
                'thumbnail_url' => $product->mainImage?->chemin_miniature ? asset('storage/'.$product->mainImage->chemin_miniature) : ($product->thumbnail ? asset('storage/'.$product->thumbnail) : null),
                'total_stock' => $totalStock,
                'stock_status' => $stockStatus,
                'stock_status_label' => $stockStatusLabel,
                'variants' => $product->sizes->map(fn (ProductSize $v) => [
                    'id' => $v->id,
                    'size' => $v->size,
                    'color' => $v->color,
                    'stock' => (int) $v->stock,
                    'is_active' => (bool) ($v->is_active ?? true),
                    'is_low_stock' => (int) $v->stock > 0 && (int) $v->stock <= $lowThreshold,
                    'is_out_of_stock' => (int) $v->stock <= 0,
                ])->values(),
            ];
        });

        return $paginator;
    }
}
