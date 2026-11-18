<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\ImageProduit;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\StockMovement;
use App\Services\AuditService;
use App\Services\ImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductController extends ApiController
{
    public function __construct(
        protected ImageService $imageService,
        protected AuditService $auditService
    ) {}

    /**
     * List products with admin filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);

        $query = Product::with(['category', 'sizes', 'images']);

        if ($request->filled('category_id')) {
            $query->where('category_id', (int) $request->input('category_id'));
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $products = $query->latest()->paginate($perPage);

        return $this->success([
            'data' => ProductResource::collection($products->items())->resolve(),
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ], 'Produits récupérés.');
    }

    /**
     * Show single product with variants and images.
     */
    public function show(Product $product): JsonResponse
    {
        $product->load(['category', 'sizes', 'images']);

        return $this->success(
            (new ProductResource($product))->resolve(),
            'Produit récupéré.'
        );
    }

    /**
     * Create product, variants, and initial stock movements.
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $product = DB::transaction(function () use ($validated, $request) {
            $name = trim(strip_tags((string) $validated['name']));
            $baseSlug = Str::slug($name);
            $slug = $baseSlug;
            $counter = 1;

            while (Product::where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }

            $product = Product::create([
                'category_id' => $validated['category_id'],
                'name' => $name,
                'slug' => $slug,
                'description' => ! empty($validated['description']) ? trim(strip_tags((string) $validated['description'])) : null,
                'price' => number_format((float) $validated['price'], 2, '.', ''),
                'promotional_price' => ! empty($validated['promotional_price']) ? number_format((float) $validated['promotional_price'], 2, '.', '') : null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            foreach ($validated['sizes'] as $variantData) {
                $stock = max(0, (int) $variantData['stock']);
                $variant = ProductSize::create([
                    'product_id' => $product->id,
                    'size' => trim($variantData['size']),
                    'color' => ! empty($variantData['color']) ? trim($variantData['color']) : 'Standard',
                    'stock' => $stock,
                    'is_active' => true,
                ]);

                if ($stock > 0) {
                    StockMovement::create([
                        'product_size_id' => $variant->id,
                        'order_id' => null,
                        'user_id' => $request->user()?->id,
                        'type' => StockMovement::TYPE_INITIAL_STOCK,
                        'quantity_before' => 0,
                        'quantity_delta' => $stock,
                        'quantity_after' => $stock,
                        'reason' => 'Stock initial lors de la création du produit',
                    ]);
                }
            }

            if ($request->hasFile('image')) {
                $this->imageService->addImageToProduct($product, $request->file('image'), true);
            }

            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $file) {
                    $this->imageService->addImageToProduct($product, $file);
                }
            }

            return $product;
        });

        $this->auditService->log('product.created', $product, [
            'name' => $product->name,
            'price' => $product->price,
            'category_id' => $product->category_id,
        ]);

        $product->load(['category', 'sizes', 'images']);

        return $this->created(
            (new ProductResource($product))->resolve(),
            'Produit créé avec succès.'
        );
    }

    /**
     * Update product, variants, and handle stock adjustment tracking.
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($product, $validated, $request) {
            $name = trim(strip_tags((string) $validated['name']));

            $product->update([
                'category_id' => $validated['category_id'],
                'name' => $name,
                'description' => ! empty($validated['description']) ? trim(strip_tags((string) $validated['description'])) : null,
                'price' => number_format((float) $validated['price'], 2, '.', ''),
                'promotional_price' => ! empty($validated['promotional_price']) ? number_format((float) $validated['promotional_price'], 2, '.', '') : null,
                'is_active' => $validated['is_active'] ?? $product->is_active,
            ]);

            $existingVariants = $product->sizes()->get()->keyBy(function (ProductSize $item) {
                return strtolower($item->size).'|'.strtolower($item->color ?? 'standard');
            });

            $submittedVariants = collect($validated['sizes'])->keyBy(function (array $item) {
                $color = ! empty($item['color']) ? trim($item['color']) : 'Standard';

                return strtolower(trim($item['size'])).'|'.strtolower($color);
            });

            // Safe deactivation or deletion of omitted variants
            foreach ($existingVariants as $key => $model) {
                if (! $submittedVariants->has($key)) {
                    $hasOrders = OrderItem::where('product_id', $product->id)->where('size', $model->size)->exists();
                    $hasMovements = $model->stockMovements()->exists();

                    if ($hasOrders || $hasMovements) {
                        $model->update(['is_active' => false]);
                    } else {
                        $model->delete();
                    }
                }
            }

            // Upsert submitted variants
            foreach ($submittedVariants as $key => $variantData) {
                $color = ! empty($variantData['color']) ? trim($variantData['color']) : 'Standard';
                $size = trim($variantData['size']);
                $submittedStock = max(0, (int) $variantData['stock']);

                if ($existingVariants->has($key)) {
                    /** @var ProductSize $existing */
                    $existing = $existingVariants->get($key);
                    $existing->update(['is_active' => true]);

                    if ($existing->stock !== $submittedStock) {
                        $before = $existing->stock;
                        $delta = $submittedStock - $before;
                        $existing->update(['stock' => $submittedStock]);

                        StockMovement::create([
                            'product_size_id' => $existing->id,
                            'order_id' => null,
                            'user_id' => $request->user()?->id,
                            'type' => StockMovement::TYPE_MANUAL_ADJUSTMENT,
                            'quantity_before' => $before,
                            'quantity_delta' => $delta,
                            'quantity_after' => $submittedStock,
                            'reason' => 'Ajustement lors de la modification du produit',
                        ]);
                    }
                } else {
                    $newVariant = ProductSize::create([
                        'product_id' => $product->id,
                        'size' => $size,
                        'color' => $color,
                        'stock' => $submittedStock,
                        'is_active' => true,
                    ]);

                    if ($submittedStock > 0) {
                        StockMovement::create([
                            'product_size_id' => $newVariant->id,
                            'order_id' => null,
                            'user_id' => $request->user()?->id,
                            'type' => StockMovement::TYPE_INITIAL_STOCK,
                            'quantity_before' => 0,
                            'quantity_delta' => $submittedStock,
                            'quantity_after' => $submittedStock,
                            'reason' => 'Stock initial de la nouvelle variante',
                        ]);
                    }
                }
            }

            if ($request->hasFile('image')) {
                $this->imageService->addImageToProduct($product, $request->file('image'), true);
            }

            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $file) {
                    $this->imageService->addImageToProduct($product, $file);
                }
            }
        });

        $this->auditService->log('product.updated', $product, [
            'name' => $product->name,
            'price' => $product->price,
        ]);

        $product->load(['category', 'sizes', 'images']);

        return $this->success(
            (new ProductResource($product))->resolve(),
            'Produit modifié avec succès.'
        );
    }

    /**
     * Toggle product active state.
     */
    public function toggle(Product $product): JsonResponse
    {
        $product->is_active = ! $product->is_active;
        $product->save();

        $this->auditService->log('product.toggled', $product, [
            'is_active' => $product->is_active,
        ]);

        $statusText = $product->is_active ? 'activé' : 'désactivé';

        return $this->success(
            (new ProductResource($product->load(['category', 'sizes', 'images'])))->resolve(),
            "Produit {$statusText} avec succès."
        );
    }

    /**
     * Delete product or soft-deactivate if order history exists.
     */
    public function destroy(Product $product): JsonResponse
    {
        $hasOrders = OrderItem::where('product_id', $product->id)->exists();

        if ($hasOrders) {
            $product->update(['is_active' => false]);
            $this->auditService->log('product.deactivated_on_delete_attempt', $product, [
                'reason' => 'Order history exists',
            ]);

            return $this->success(
                (new ProductResource($product->load(['category', 'sizes', 'images'])))->resolve(),
                'Ce produit possède un historique de commandes. Il a été désactivé au lieu d’être supprimé.'
            );
        }

        $name = $product->name;
        $this->auditService->log('product.deleted', $product, ['name' => $name]);

        $product->delete();

        return $this->success(null, "Le produit « {$name} » a été supprimé avec succès.");
    }

    /**
     * Add an image directly to product gallery.
     */
    public function addImage(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'image', 'mimes:jpeg,png,webp', 'max:4096'],
            'is_main' => ['nullable', 'boolean'],
            'alt_text' => ['nullable', 'string', 'max:255'],
        ]);

        $image = $this->imageService->addImageToProduct(
            $product,
            $request->file('image'),
            $request->boolean('is_main'),
            $request->input('alt_text')
        );

        $product->load('images');

        return $this->created(
            (new ProductResource($product->load(['category', 'sizes', 'images'])))->resolve(),
            'Image ajoutée avec succès.'
        );
    }

    /**
     * Set designated image as primary main image.
     */
    public function setMainImage(Product $product, ImageProduit $image): JsonResponse
    {
        if ($image->produit_id !== $product->id) {
            return $this->error('Cette image n’appartient pas à ce produit.', null, 404);
        }

        $this->imageService->setMainImage($product, $image);

        return $this->success(
            (new ProductResource($product->load(['category', 'sizes', 'images'])))->resolve(),
            'Image principale définie avec succès.'
        );
    }

    /**
     * Reorder product gallery images.
     */
    public function reorderImages(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'images' => ['required', 'array'],
            'images.*.id' => ['required', 'integer'],
            'images.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        $this->imageService->reorderImages($product, $request->input('images'));

        return $this->success(
            (new ProductResource($product->load(['category', 'sizes', 'images'])))->resolve(),
            'Ordre des images mis à jour.'
        );
    }

    /**
     * Delete an image from product gallery.
     */
    public function deleteImage(Product $product, ImageProduit $image): JsonResponse
    {
        if ($image->produit_id !== $product->id) {
            return $this->error('Cette image n’appartient pas à ce produit.', null, 404);
        }

        $this->imageService->deleteImage($image);

        return $this->success(
            (new ProductResource($product->load(['category', 'sizes', 'images'])))->resolve(),
            'Image supprimée avec succès.'
        );
    }
}
