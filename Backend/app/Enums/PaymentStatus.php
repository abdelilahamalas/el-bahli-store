<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case PENDING = 'pending';
    case PAID = 'paid';
    case REFUNDED = 'refunded';

    /**
     * Get the human-readable French label for this payment status.
     */
    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Paiement en attente',
            self::PAID => 'Paiement encaissé',
            self::REFUNDED => 'Paiement remboursé',
        };
    }
}
