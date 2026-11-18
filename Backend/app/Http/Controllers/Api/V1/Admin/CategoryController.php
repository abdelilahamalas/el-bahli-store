<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\ReorderCategoriesRequest;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends ApiController
{
    public function __construct(
        protected AuditService $auditService
    ) {}

    /**
     * List all categories with product count.
     */
    public function index(Request $request): JsonResponse
    {
        $categories = Category::withCount('products')
            ->orderBy('sort_order', 'asc')
            ->get();

        return $this->success(
            CategoryResource::collection($categories)->resolve(),
            'Liste des catégories récupérée.'
        );
    }

    /**
     * Show single category.
     */
    public function show(Category $category): JsonResponse
    {
        $category->loadCount('products');

        return $this->success(
            (new CategoryResource($category))->resolve(),
            'Catégorie récupérée.'
        );
    }

    /**
     * Create a new category.
     */
    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $name = trim(strip_tags((string) $validated['name']));
        $slug = Str::slug($name);

        $maxSort = (int) Category::max('sort_order');

        $category = Category::create([
            'name' => $name,
            'slug' => $slug,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? ($maxSort + 1),
        ]);

        $this->auditService->log('category.created', $category, [
            'name' => $category->name,
            'slug' => $category->slug,
        ]);

        return $this->created(
            (new CategoryResource($category))->resolve(),
            'Catégorie créée avec succès.'
        );
    }

    /**
     * Update an existing category.
     */
    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        $validated = $request->validated();
        $name = trim(strip_tags((string) $validated['name']));
        $slug = Str::slug($name);

        $oldData = ['name' => $category->name, 'slug' => $category->slug];

        $category->update([
            'name' => $name,
            'slug' => $slug,
            'is_active' => $validated['is_active'] ?? $category->is_active,
            'sort_order' => $validated['sort_order'] ?? $category->sort_order,
        ]);

        $this->auditService->log('category.updated', $category, [
            'old' => $oldData,
            'new' => ['name' => $category->name, 'slug' => $category->slug],
        ]);

        return $this->success(
            (new CategoryResource($category))->resolve(),
            'Catégorie mise à jour avec succès.'
        );
    }

    /**
     * Toggle visibility/active state.
     */
    public function toggle(Category $category): JsonResponse
    {
        $category->is_active = ! $category->is_active;
        $category->save();

        $this->auditService->log('category.toggled', $category, [
            'is_active' => $category->is_active,
        ]);

        $statusText = $category->is_active ? 'activée' : 'désactivée';

        return $this->success(
            (new CategoryResource($category))->resolve(),
            "Catégorie {$statusText} avec succès."
        );
    }

    /**
     * Reorder categories.
     */
    public function reorder(ReorderCategoriesRequest $request): JsonResponse
    {
        $validated = $request->validated();

        foreach ($validated['categories'] as $item) {
            Category::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        $this->auditService->log('categories.reordered', null, [
            'count' => count($validated['categories']),
        ]);

        return $this->success(null, 'Ordre des catégories mis à jour.');
    }

    /**
     * Delete an empty category.
     */
    public function destroy(Category $category): JsonResponse
    {
        if ($category->products()->count() > 0) {
            return $this->error(
                'Impossible de supprimer une catégorie contenant des produits. Veuillez d’abord réassigner ou supprimer ses produits.',
                null,
                422
            );
        }

        $categoryName = $category->name;
        $this->auditService->log('category.deleted', $category, [
            'name' => $categoryName,
            'slug' => $category->slug,
        ]);

        $category->delete();

        return $this->success(null, "La catégorie « {$categoryName} » a été supprimée avec succès.");
    }
}
