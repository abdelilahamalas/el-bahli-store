<?php

namespace App\Enums;

enum OrderStatus: string
{
    case PENDING = 'pending';
    case CONFIRMED = 'confirmed';
    case PROCESSING = 'processing';
    case SHIPPED = 'shipped';
    case DELIVERED = 'delivered';
    case CANCELLED = 'cancelled';
    case RETURN_REQUESTED = 'return_requested';
    case RETURN_RECEIVED = 'return_received';
    case RETURNED = 'returned';

    /**
     * Get the human-readable French label for this status.
     */
    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'En attente',
            self::CONFIRMED => 'Confirmée',
            self::PROCESSING => 'En préparation',
            self::SHIPPED => 'Expédiée',
            self::DELIVERED => 'Livrée',
            self::CANCELLED => 'Annulée',
            self::RETURN_REQUESTED => 'Retour demandé',
            self::RETURN_RECEIVED => 'Retour reçu',
            self::RETURNED => 'Retour traité',
        };
    }

    /**
     * Allowed status transitions from the current status.
     *
     * @return array<OrderStatus>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::PENDING => [self::CONFIRMED, self::CANCELLED],
            self::CONFIRMED => [self::PROCESSING, self::SHIPPED, self::CANCELLED, self::RETURNED],
            self::PROCESSING => [self::SHIPPED, self::CANCELLED, self::RETURNED],
            self::SHIPPED => [self::DELIVERED, self::CANCELLED, self::RETURN_REQUESTED, self::RETURNED],
            self::DELIVERED => [self::RETURN_REQUESTED, self::RETURNED],
            self::RETURN_REQUESTED => [self::RETURN_RECEIVED, self::RETURNED, self::DELIVERED],
            self::RETURN_RECEIVED => [self::RETURNED],
            self::CANCELLED => [],
            self::RETURNED => [],
        };
    }

    /**
     * Check if transition to target status is valid.
     */
    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->allowedTransitions(), true);
    }
}
