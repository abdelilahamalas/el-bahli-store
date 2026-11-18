<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Product extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'category_id',
        'name',
        'slug',
        'description',
        'price',
        'promotional_price',
        'image',
        'thumbnail',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'promotional_price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    /**
     * @return HasMany<ProductSize, $this>
     */
    public function sizes(): HasMany
    {
        return $this->hasMany(ProductSize::class, 'product_id');
    }

    /**
     * @return HasMany<VarianteProduit, $this>
     */
    public function variants(): HasMany
    {
        return $this->hasMany(VarianteProduit::class, 'product_id');
    }

    /**
     * @return HasMany<VarianteProduit, $this>
     */
    public function variantes(): HasMany
    {
        return $this->variants();
    }

    /**
     * @return HasMany<ImageProduit, $this>
     */
    public function images(): HasMany
    {
        return $this->hasMany(ImageProduit::class, 'produit_id')->orderBy('ordre_affichage', 'asc');
    }

    /**
     * @return HasOne<ImageProduit, $this>
     */
    public function mainImage(): HasOne
    {
        return $this->hasOne(ImageProduit::class, 'produit_id')->where('est_principale', true);
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'product_id');
    }

    /**
     * Calculate total stock across all active/available variants.
     */
    public function getTotalStockAttribute(): int
    {
        return (int) $this->sizes()->sum('stock');
    }

    /**
     * Resolve public image URL.
     */
    public function getImageUrlAttribute(): ?string
    {
        return $this->image ? asset('storage/'.$this->image) : null;
    }
}
