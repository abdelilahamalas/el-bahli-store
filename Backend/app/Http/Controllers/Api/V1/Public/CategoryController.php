<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CategoryController extends ApiController
{
    /**
     * List all active categories in display order.
     */
    public function index(): JsonResponse
    {
        $categories = Cache::rememberForever('active_categories', function () {
            $items = Category::where('is_active', true)
                ->orderBy('sort_order', 'asc')
                ->get();

            return CategoryResource::collection($items)->resolve();
        });

        return $this->success(
            $categories,
            'Catégories récupérées avec succès.'
        );
    }

    /**
     * List active products belonging to an active category.
     */
    public function products(Request $request, string $slug): JsonResponse
    {
        /** @var Category $category */
        $category = Category::where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (! $category) {
            return $this->error('Catégorie introuvable ou inactive.', null, 404);
        }

        $perPage = min(max((int) $request->input('per_page', 24), 1), 60);

        $products = Product::with(['category', 'sizes', 'images'])
            ->where('category_id', $category->id)
            ->where('is_active', true)
            ->latest()
            ->paginate($perPage);

        return $this->success([
            'category' => (new CategoryResource($category))->resolve(),
            'products' => [
                'data' => ProductResource::collection($products->items())->resolve(),
                'pagination' => [
                    'current_page' => $products->currentPage(),
                    'last_page' => $products->lastPage(),
                    'per_page' => $products->perPage(),
                    'total' => $products->total(),
                ],
            ],
        ], 'Produits de la catégorie récupérés avec succès.');
    }
}
