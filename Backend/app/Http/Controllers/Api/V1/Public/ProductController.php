<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends ApiController
{
    /**
     * List active products for public catalog.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->input('per_page', 12), 1), 60);

        $query = Product::with(['category', 'sizes', 'images'])
            ->where('is_active', true)
            ->whereHas('category', fn ($q) => $q->where('is_active', true));

        // Filter by category ID
        if ($request->filled('category_id')) {
            $query->where('category_id', (int) $request->input('category_id'));
        }

        // Filter by category slug
        if ($request->filled('category_slug')) {
            $slug = trim((string) $request->input('category_slug'));
            $query->whereHas('category', fn ($q) => $q->where('slug', $slug));
        }

        // Search in product name or description
        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Price range
        if ($request->filled('min_price')) {
            $query->where('price', '>=', (float) $request->input('min_price'));
        }
        if ($request->filled('max_price')) {
            $query->where('price', '<=', (float) $request->input('max_price'));
        }

        // Sorting
        $sort = $request->input('sort', 'latest');
        match ($sort) {
            'price_asc' => $query->orderBy('price', 'asc'),
            'price_desc' => $query->orderBy('price', 'desc'),
            'name_asc' => $query->orderBy('name', 'asc'),
            default => $query->latest(),
        };

        $products = $query->paginate($perPage);

        return $this->success([
            'data' => ProductResource::collection($products->items())->resolve(),
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ], 'Produits récupérés avec succès.');
    }

    /**
     * Show an active product detail by its slug.
     */
    public function show(string $slug): JsonResponse
    {
        /** @var Product|null $product */
        $product = Product::with(['category', 'sizes' => fn ($q) => $q->where('is_active', true), 'images'])
            ->where('slug', $slug)
            ->where('is_active', true)
            ->whereHas('category', fn ($q) => $q->where('is_active', true))
            ->first();

        if (! $product) {
            return $this->error('Produit introuvable ou indisponible.', null, 404);
        }

        return $this->success(
            (new ProductResource($product))->resolve(),
            'Produit récupéré avec succès.'
        );
    }
}
