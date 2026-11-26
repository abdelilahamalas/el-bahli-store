<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ProductSize;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public const MAX_ITEMS = 20;

    public const MAX_QUANTITY_PER_ITEM = 10;

    public function __construct(
        protected SettingService $settingService,
        protected AuditService $auditService,
        protected InventoryService $inventoryService
    ) {}

    /**
     * Create a new customer order within a database transaction.
     *
     * @param array{
     *     customer_name: string,
     *     customer_phone: string,
     *     city: string,
     *     address: string,
     *     note?: string|null
     * } $customerData
     * @param  array<int, array{product_id: int, size: string, color?: string|null, quantity: int}>  $rawItems
     *
     * @throws ValidationException
     */
    public function createOrder(array $customerData, array $rawItems, ?string $ip = null): Order
    {
        $normalizedPhone = $this->normalizeMoroccanPhone($customerData['customer_phone'] ?? '');
        if (! $normalizedPhone) {
            throw ValidationException::withMessages([
                'customer_phone' => 'Le numéro de téléphone doit être un numéro marocain valide (ex : 0612345678, +212612345678).',
            ]);
        }

        $items = $this->mergeAndValidateItems($rawItems);

        return DB::transaction(function () use ($customerData, $normalizedPhone, $items, $ip) {
            $subtotalCents = 0;
            $orderItemsToCreate = [];

            // Stable lock ordering by product_id, size, color to prevent deadlocks
            $sortedItems = collect($items)->sortBy(fn ($i) => "{$i['product_id']}_{$i['size']}_{$i['color']}")->values();

            foreach ($sortedItems as $item) {
                // Reload product with category
                $product = Product::with('category')->find($item['product_id']);

                if (! $product || ! $product->is_active || ! $product->category || ! $product->category->is_active) {
                    $name = $product?->name ?? 'Article sélectionné';
                    throw ValidationException::withMessages([
                        'items' => "L'article « {$name} » n'est plus disponible actuellement.",
                    ]);
                }

                // Lock the exact variant stock row
                $variant = ProductSize::where('product_id', $product->id)
                    ->where('size', $item['size'])
                    ->where('color', $item['color'])
                    ->lockForUpdate()
                    ->first();

                if (! $variant || ! $variant->is_active || $variant->stock <= 0) {
                    throw ValidationException::withMessages([
                        'items' => "La taille {$item['size']} de ce produit n'est plus disponible. Veuillez sélectionner une autre taille.",
                    ]);
                }

                if ($variant->stock < $item['quantity']) {
                    $colorLabel = $item['color'] !== 'Standard' ? " en couleur « {$item['color']} »" : '';
                    throw ValidationException::withMessages([
                        'items' => "Stock insuffisant pour « {$product->name} » en taille « {$item['size']} »{$colorLabel} (stock restant : {$variant->stock}). Quantité disponible : {$variant->stock}.",
                    ]);
                }

                // Règle métier : Le stock n'est pas décrémenté à la création en attente (PENDING).
                // La décrémentation intervient exclusivement lors de la confirmation par l'administrateur.

                // Calculate amounts in integer centimes (utilise le prix promo si défini, sinon prix normal)
                $unitPriceCents = (int) round($product->getEffectivePrice() * 100);
                $lineTotalCents = $unitPriceCents * $item['quantity'];
                $subtotalCents += $lineTotalCents;

                $orderItemsToCreate[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'size' => $item['size'],
                    'couleur_copie' => $item['color'],
                    'unit_price' => number_format($unitPriceCents / 100, 2, '.', ''),
                    'quantity' => $item['quantity'],
                    'line_total' => number_format($lineTotalCents / 100, 2, '.', ''),
                ];
            }

            // Règle commerciale : La livraison est TOUJOURS gratuite (0.00 MAD)
            // Total de la commande = Sous-total des articles recalculé côté serveur
            $totalCents = $subtotalCents;

            $reference = $this->generateUniqueReference();

            $order = Order::create([
                'reference' => $reference,
                'customer_name' => trim(strip_tags($customerData['customer_name'])),
                'customer_phone' => $normalizedPhone,
                'city' => trim(strip_tags($customerData['city'])),
                'address' => trim(strip_tags($customerData['address'])),
                'note' => ! empty($customerData['note']) ? trim(strip_tags((string) $customerData['note'])) : null,
                'status' => OrderStatus::PENDING,
                'payment_method' => 'cash_on_delivery',
                'payment_status' => PaymentStatus::PENDING,
                'subtotal' => number_format($subtotalCents / 100, 2, '.', ''),
                'delivery_fee' => '0.00',
                'total' => number_format($totalCents / 100, 2, '.', ''),
                'ip_address' => $ip,
            ]);

            foreach ($orderItemsToCreate as $itemData) {
                $order->items()->create($itemData);
            }

            // Audit log without personal details
            $this->auditService->log('order.created', $order, [
                'reference' => $order->reference,
                'subtotal' => $order->subtotal,
                'delivery_fee' => $order->delivery_fee,
                'total' => $order->total,
                'items_count' => count($orderItemsToCreate),
            ], null, $ip);

            return $order;
        });
    }

    /**
     * Transition an order to a new status.
     *
     * @throws ValidationException
     */
    public function transitionStatus(Order $order, OrderStatus $newStatus, ?int $userId = null, ?string $reason = null): Order
    {
        return DB::transaction(function () use ($order, $newStatus, $userId, $reason) {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::with('items')->where('id', $order->id)->lockForUpdate()->firstOrFail();

            if (! $lockedOrder->status->canTransitionTo($newStatus)) {
                throw ValidationException::withMessages([
                    'status' => "Transition de statut non autorisée de « {$lockedOrder->status->label()} » vers « {$newStatus->label()} ».",
                ]);
            }

            $oldStatus = $lockedOrder->status;

            // Handle transitions with stock logic and idempotency
            if ($newStatus === OrderStatus::CONFIRMED) {
                // Atomically verify variant stocks and decrement with StockMovement recording
                $this->inventoryService->confirmOrderStock($lockedOrder, $userId);
                $lockedOrder->confirmed_at = now();
            } elseif ($newStatus === OrderStatus::PROCESSING) {
                $lockedOrder->processing_at = now();
            } elseif ($newStatus === OrderStatus::SHIPPED) {
                $lockedOrder->shipped_at = now();
            } elseif ($newStatus === OrderStatus::DELIVERED) {
                $lockedOrder->delivered_at = now();
            } elseif ($newStatus === OrderStatus::CANCELLED) {
                // Restore stock ONLY if it was previously confirmed/decremented
                $this->inventoryService->restoreOrderStock($lockedOrder, $userId);
                $lockedOrder->cancelled_at = now();
            } elseif ($newStatus === OrderStatus::RETURN_REQUESTED) {
                $lockedOrder->return_requested_at = now();
            } elseif ($newStatus === OrderStatus::RETURN_RECEIVED) {
                $lockedOrder->return_received_at = now();
            } elseif ($newStatus === OrderStatus::RETURNED) {
                // Restore stock back to inventory if order was confirmed and not already restocked
                $this->inventoryService->restoreReturnedOrderStock($lockedOrder, $userId);
                $lockedOrder->returned_at = now();
            }

            $lockedOrder->status = $newStatus;
            $lockedOrder->save();

            // Log status history
            OrderStatusHistory::create([
                'order_id' => $lockedOrder->id,
                'user_id' => $userId,
                'from_status' => $oldStatus->value,
                'to_status' => $newStatus->value,
                'reason' => $reason,
            ]);

            $this->auditService->log('order.status_transition', $lockedOrder, [
                'reference' => $lockedOrder->reference,
                'from_status' => $oldStatus->value,
                'to_status' => $newStatus->value,
                'reason' => $reason,
            ], $userId);

            return $lockedOrder;
        });
    }

    /**
     * Process return of order items with inspection (resellable vs damaged).
     *
     * @param  array<int, array{order_item_id: int, quantity_returned: int, quantity_resellable?: int, quantity_damaged?: int, reason?: string|null}>  $returnsData
     *
     * @throws ValidationException
     */
    public function processReturn(Order $order, array $returnsData, ?int $userId = null, ?string $reason = null): Order
    {
        return DB::transaction(function () use ($order, $returnsData, $userId, $reason) {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::with('items')->where('id', $order->id)->lockForUpdate()->firstOrFail();

            if (! in_array($lockedOrder->status, [OrderStatus::DELIVERED, OrderStatus::RETURN_REQUESTED, OrderStatus::RETURN_RECEIVED], true)) {
                throw ValidationException::withMessages([
                    'status' => "Impossible de traiter un retour pour une commande au statut « {$lockedOrder->status->label()} ».",
                ]);
            }

            $oldStatus = $lockedOrder->status;

            // Restock resellable items and create return records
            $this->inventoryService->restockReturnedItems($lockedOrder, $returnsData, $userId);

            $lockedOrder->status = OrderStatus::RETURNED;
            $lockedOrder->returned_at = now();
            $lockedOrder->save();

            // Log status history
            OrderStatusHistory::create([
                'order_id' => $lockedOrder->id,
                'user_id' => $userId,
                'from_status' => $oldStatus->value,
                'to_status' => OrderStatus::RETURNED->value,
                'reason' => $reason ?: 'Retour d\'articles traité et inspecté.',
            ]);

            $this->auditService->log('order.return_processed', $lockedOrder, [
                'reference' => $lockedOrder->reference,
                'from_status' => $oldStatus->value,
                'to_status' => OrderStatus::RETURNED->value,
                'returned_items_count' => count($returnsData),
            ], $userId);

            return $lockedOrder;
        });
    }

    /**
     * Update internal administrative notes on an order.
     */
    public function updateAdminNotes(Order $order, string $notes, ?int $userId = null): Order
    {
        $order->admin_notes = $notes;
        $order->save();

        $this->auditService->log('order.admin_notes_updated', $order, [
            'reference' => $order->reference,
        ], $userId);

        return $order;
    }

    /**
     * Compute estimate / quotation for a cart without modifying stocks.
     * Livraison TOUJOURS gratuite (0.00 MAD).
     *
     * @param  array<int, array{product_id: int, size: string, color?: string|null, quantity: int}>  $rawItems
     * @return array<string, mixed>
     */
    public function estimateCart(array $rawItems): array
    {
        if (empty($rawItems)) {
            return [
                'items' => [],
                'subtotal' => '0.00',
                'delivery_fee' => '0.00',
                'total' => '0.00',
                'payment_method' => 'cash_on_delivery',
                'payment_method_label' => 'Paiement à la réception',
                'is_delivery_free' => true,
                'is_valid' => true,
            ];
        }

        $items = $this->mergeAndValidateItems($rawItems);
        $verifiedItems = [];
        $subtotalCents = 0;
        $allAvailable = true;

        foreach ($items as $item) {
            $product = Product::with('category')->find($item['product_id']);
            $isProductAvailable = $product && $product->is_active && $product->category && $product->category->is_active;

            $variant = null;
            if ($isProductAvailable) {
                $variant = ProductSize::where('product_id', $product->id)
                    ->where('size', $item['size'])
                    ->where('color', $item['color'])
                    ->first();
            }

            $stockAvailable = $variant ? (int) $variant->stock : 0;
            $isVariantActive = $variant ? (bool) ($variant->is_active ?? true) : false;
            $isAvailable = $isProductAvailable && $variant && $isVariantActive && ($stockAvailable >= $item['quantity']);

            if (! $isAvailable) {
                $allAvailable = false;
            }

            $errorMessage = null;
            if (! $isProductAvailable) {
                $errorMessage = "Ce produit n'est plus disponible.";
            } elseif (! $variant || ! $isVariantActive || $stockAvailable <= 0) {
                $errorMessage = "La taille {$item['size']} de ce produit n'est plus disponible. Veuillez sélectionner une autre taille.";
            } elseif ($stockAvailable < $item['quantity']) {
                $errorMessage = "Stock insuffisant pour cette variante. Quantité disponible : {$stockAvailable}.";
            }

            $unitPriceCents = $product ? (int) round($product->getEffectivePrice() * 100) : 0;
            $lineTotalCents = $unitPriceCents * $item['quantity'];

            if ($isAvailable) {
                $subtotalCents += $lineTotalCents;
            }

            $verifiedItems[] = [
                'product_id' => $item['product_id'],
                'product_name' => $product?->name ?? 'Article inconnu',
                'size' => $item['size'],
                'color' => $item['color'],
                'quantity' => $item['quantity'],
                'unit_price' => number_format($unitPriceCents / 100, 2, '.', ''),
                'line_total' => number_format($lineTotalCents / 100, 2, '.', ''),
                'available_stock' => $stockAvailable,
                'is_available' => $isAvailable,
                'error_message' => $errorMessage,
            ];
        }

        // Règle commerciale : La livraison est TOUJOURS gratuite (0.00 MAD)
        $totalCents = $subtotalCents;

        return [
            'items' => $verifiedItems,
            'subtotal' => number_format($subtotalCents / 100, 2, '.', ''),
            'delivery_fee' => '0.00',
            'total' => number_format($totalCents / 100, 2, '.', ''),
            'payment_method' => 'cash_on_delivery',
            'payment_method_label' => 'Paiement à la réception',
            'is_delivery_free' => true,
            'is_valid' => $allAvailable,
        ];
    }

    /**
     * Update the payment status of an order independently of its fulfillment status.
     */
    public function updatePaymentStatus(Order $order, PaymentStatus $newStatus, ?int $userId = null): Order
    {
        $oldStatus = $order->payment_status;

        $order->payment_status = $newStatus;
        if ($newStatus === PaymentStatus::PAID && $order->paid_at === null) {
            $order->paid_at = now();
        } elseif ($newStatus === PaymentStatus::REFUNDED) {
            // Retain paid_at timestamp to know when it was paid, or keep state
        }
        $order->save();

        $this->auditService->log('order.payment_status_updated', $order, [
            'reference' => $order->reference,
            'from_status' => $oldStatus instanceof PaymentStatus ? $oldStatus->value : (string) $oldStatus,
            'to_status' => $newStatus->value,
            'paid_at' => $order->paid_at?->toIso8601String(),
        ], $userId);

        return $order;
    }

    /**
     * Merge duplicate lines (same product_id + same size + same color) and validate limits.
     *
     * @param  array<int, array{product_id: int, size: string, color?: string|null, quantity: int}>  $rawItems
     * @return array<string, array{product_id: int, size: string, color: string, quantity: int}>
     *
     * @throws ValidationException
     */
    public function mergeAndValidateItems(array $rawItems): array
    {
        if (empty($rawItems)) {
            throw ValidationException::withMessages([
                'items' => 'Votre panier est vide.',
            ]);
        }

        $merged = [];

        foreach ($rawItems as $item) {
            $productId = (int) ($item['product_id'] ?? 0);
            $size = trim((string) ($item['size'] ?? ''));
            $color = ! empty($item['color']) ? trim((string) $item['color']) : 'Standard';
            $quantity = (int) ($item['quantity'] ?? 0);

            if ($productId <= 0 || empty($size) || $quantity <= 0) {
                throw ValidationException::withMessages([
                    'items' => 'Les articles du panier comportent des valeurs invalides.',
                ]);
            }

            $key = "{$productId}_{$size}_{$color}";

            if (! isset($merged[$key])) {
                $merged[$key] = [
                    'product_id' => $productId,
                    'size' => $size,
                    'color' => $color,
                    'quantity' => 0,
                ];
            }

            $merged[$key]['quantity'] += $quantity;

            if ($merged[$key]['quantity'] > self::MAX_QUANTITY_PER_ITEM) {
                throw ValidationException::withMessages([
                    'items' => 'La quantité maximale par article est de '.self::MAX_QUANTITY_PER_ITEM.' unités.',
                ]);
            }
        }

        if (count($merged) > self::MAX_ITEMS) {
            throw ValidationException::withMessages([
                'items' => 'Une commande ne peut pas contenir plus de '.self::MAX_ITEMS.' articles distincts.',
            ]);
        }

        return $merged;
    }

    /**
     * Normalize Moroccan phone number to +212XXXXXXXXX format.
     */
    public static function normalizeMoroccanPhone(string $phone): ?string
    {
        $cleaned = preg_replace('/[\s\-\.]/', '', trim($phone));

        // Format 0612345678, 0712345678, 0512345678 (10 digits starting with 0)
        if (preg_match('/^0([567]\d{8})$/', $cleaned, $matches)) {
            return '+212'.$matches[1];
        }

        // Format 00212612345678, 00212712345678, 00212512345678
        if (preg_match('/^00212([567]\d{8})$/', $cleaned, $matches)) {
            return '+212'.$matches[1];
        }

        // Format +212612345678, +212712345678, +212512345678
        if (preg_match('/^\+212([567]\d{8})$/', $cleaned, $matches)) {
            return '+212'.$matches[1];
        }

        return null;
    }

    /**
     * Generate an unguessable unique reference in format EB-XXXXXXXX.
     */
    public function generateUniqueReference(): string
    {
        do {
            $ref = 'EB-'.strtoupper(Str::random(8));
        } while (Order::where('reference', $ref)->exists());

        return $ref;
    }
}
