<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    use HasFactory;

    public const TYPE_ORDER_CONFIRMATION = 'order_confirmation';

    public const TYPE_ORDER_CANCELLATION = 'order_cancellation';

    public const TYPE_MANUAL_ADJUSTMENT = 'manual_adjustment';

    public const TYPE_INITIAL_STOCK = 'initial_stock';

    public const TYPE_RETURN_RESTOCK = 'return_restock';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'product_size_id',
        'order_id',
        'user_id',
        'type',
        'quantity_before',
        'quantity_delta',
        'quantity_after',
        'reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity_before' => 'integer',
            'quantity_delta' => 'integer',
            'quantity_after' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<ProductSize, $this>
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductSize::class, 'product_size_id');
    }

    /**
     * Alias français pour la variante.
     *
     * @return BelongsTo<ProductSize, $this>
     */
    public function variante(): BelongsTo
    {
        return $this->variant();
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    /**
     * Alias français pour la commande.
     *
     * @return BelongsTo<Order, $this>
     */
    public function commande(): BelongsTo
    {
        return $this->order();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Libellé en français du type de mouvement.
     */
    public function typeLabel(): string
    {
        return match ($this->type) {
            self::TYPE_ORDER_CONFIRMATION => 'Confirmation de commande',
            self::TYPE_ORDER_CANCELLATION => 'Annulation de commande',
            self::TYPE_MANUAL_ADJUSTMENT => 'Ajustement manuel',
            self::TYPE_INITIAL_STOCK => 'Stock initial',
            default => $this->type,
        };
    }
}
