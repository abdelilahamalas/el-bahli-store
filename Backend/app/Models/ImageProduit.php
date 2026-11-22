<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImageProduit extends Model
{
    use HasFactory;

    protected $table = 'images_produits';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'produit_id',
        'chemin_image',
        'chemin_miniature',
        'est_principale',
        'ordre_affichage',
        'texte_alternatif',
    ];

    /**
     * @var list<string>
     */
    protected $appends = [
        'image_url',
    ];

    /**
     * Accessor for full image URL.
     */
    public function getImageUrlAttribute(): ?string
    {
        $path = $this->attributes['chemin_image'] ?? null;
        return $path ? asset('storage/' . $path) : null;
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'est_principale' => 'boolean',
            'ordre_affichage' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'produit_id');
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function produit(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'produit_id');
    }
}
