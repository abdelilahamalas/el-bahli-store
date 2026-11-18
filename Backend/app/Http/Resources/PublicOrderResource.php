<?php

namespace App\Http\Resources;

use App\Enums\PaymentStatus;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Order
 */
class PublicOrderResource extends JsonResource
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
            'reference' => $this->reference,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'payment_method' => $this->payment_method ?? 'cash_on_delivery',
            'payment_method_label' => 'Paiement à la réception',
            'payment_status' => $paymentStatus->value,
            'payment_status_label' => $paymentStatus->label(),
            'subtotal' => number_format((float) $this->subtotal, 2, '.', ''),
            'delivery_fee' => '0.00',
            'is_delivery_free' => true,
            'total' => number_format((float) $this->total, 2, '.', ''),
            'created_at' => $this->created_at?->toIso8601String(),
            'items' => $this->items->map(fn ($item) => [
                'product_name' => $item->product_name,
                'size' => $item->size,
                'color' => $item->couleur_copie ?: 'Standard',
                'quantity' => (int) $item->quantity,
                'unit_price' => number_format((float) $item->unit_price, 2, '.', ''),
                'line_total' => number_format((float) $item->line_total, 2, '.', ''),
            ])->values(),
        ];
    }
}
