<?php

namespace App\Http\Resources;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin Category
 */
class CategoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'image' => $this->image,
            'image_url' => $this->image
                ? (str_starts_with($this->image, 'http://') || str_starts_with($this->image, 'https://')
                    ? $this->image
                    : asset('storage/'.ltrim($this->image, '/')))
                : null,
            'is_active' => (bool) $this->is_active,
            'sort_order' => (int) $this->sort_order,
            'products_count' => $this->whenCounted('products'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
