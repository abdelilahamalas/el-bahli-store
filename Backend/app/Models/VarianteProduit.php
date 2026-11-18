<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VarianteProduit extends Model
{
    use HasFactory;

    protected $table = 'product_sizes';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'product_id',
        'size',
        'color',
        'stock',
    ];

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'color' => 'Standard',
        'stock' => 0,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'stock' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
