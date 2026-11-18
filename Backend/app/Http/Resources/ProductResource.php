<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'category_name' => $this->category?->name,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'price' => number_format((float) $this->price, 2, '.', ''),
            'promotional_price' => $this->promotional_price !== null ? number_format((float) $this->promotional_price, 2, '.', '') : null,
            'image_url' => $this->image ? asset('storage/'.$this->image) : null,
            'thumbnail_url' => $this->thumbnail ? asset('storage/'.$this->thumbnail) : null,
            'is_active' => (bool) $this->is_active,
            'variants' => $this->sizes->map(fn ($s) => [
                'id' => $s->id,
                'size' => $s->size,
                'color' => $s->color ?? 'Standard',
                'stock' => (int) $s->stock,
                'is_active' => (bool) ($s->is_active ?? true),
            ])->values(),
            // Backward-compatible alias
            'sizes' => $this->sizes->map(fn ($s) => [
                'id' => $s->id,
                'size' => $s->size,
                'color' => $s->color ?? 'Standard',
                'stock' => (int) $s->stock,
            ])->values(),
            'images' => $this->relationLoaded('images') ? $this->images->map(fn ($img) => [
                'id' => $img->id,
                'image_url' => asset('storage/'.$img->chemin_image),
                'thumbnail_url' => asset('storage/'.$img->chemin_miniature),
                'is_main' => (bool) $img->est_principale,
                'sort_order' => (int) $img->ordre_affichage,
                'alt_text' => $img->texte_alternatif,
            ])->values() : [],
            'total_stock' => (int) $this->sizes->sum('stock'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
