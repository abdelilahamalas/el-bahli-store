<?php

namespace App\Http\Resources;

use App\Enums\PaymentStatus;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $paymentStatus = $this->payment_status instanceof PaymentStatus
            ? $this->payment_status
            : PaymentStatus::tryFrom((string) $this->payment_status) ?? PaymentStatus::PENDING;

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'city' => $this->city,
            'address' => $this->address,
            'note' => $this->note,
            'admin_notes' => $this->admin_notes,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'payment_method' => $this->payment_method ?? 'cash_on_delivery',
            'payment_method_label' => 'Paiement à la réception',
            'payment_status' => $paymentStatus->value,
            'payment_status_label' => $paymentStatus->label(),
            'paid_at' => $this->paid_at?->toIso8601String(),
            'subtotal' => number_format((float) $this->subtotal, 2, '.', ''),
            'delivery_fee' => '0.00',
            'is_delivery_free' => true,
            'total' => number_format((float) $this->total, 2, '.', ''),
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'processing_at' => $this->processing_at?->toIso8601String(),
            'shipped_at' => $this->shipped_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'return_requested_at' => $this->return_requested_at?->toIso8601String(),
            'return_received_at' => $this->return_received_at?->toIso8601String(),
            'returned_at' => $this->returned_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'status_history' => $this->whenLoaded('statusHistories', fn () => $this->statusHistories->map(fn ($history) => [
                'id' => $history->id,
                'from_status' => $history->from_status,
                'to_status' => $history->to_status,
                'reason' => $history->reason,
                'admin_name' => $history->user?->name,
                'created_at' => $history->created_at?->toIso8601String(),
            ])->values()),
            'returns' => $this->whenLoaded('returns', fn () => $this->returns->map(fn ($ret) => [
                'id' => $ret->id,
                'order_item_id' => $ret->order_item_id,
                'product_size_id' => $ret->product_size_id,
                'quantity_returned' => $ret->quantity_returned,
                'quantity_resellable' => $ret->quantity_resellable,
                'quantity_damaged' => $ret->quantity_damaged,
                'restocked' => $ret->restocked,
                'reason' => $ret->reason,
                'admin_name' => $ret->user?->name,
                'created_at' => $ret->created_at?->toIso8601String(),
            ])->values()),
            'items' => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'size' => $item->size,
                'color' => $item->couleur_copie ?: 'Standard',
                'couleur_copie' => $item->couleur_copie ?: 'Standard',
                'unit_price' => number_format((float) $item->unit_price, 2, '.', ''),
                'quantity' => (int) $item->quantity,
                'line_total' => number_format((float) $item->line_total, 2, '.', ''),
            ])->values(),
        ];
    }
}
