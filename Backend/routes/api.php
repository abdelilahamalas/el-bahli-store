<?php

use App\Http\Controllers\Api\V1\Admin\AuditLogController as AdminAuditLogController;
use App\Http\Controllers\Api\V1\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\V1\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\V1\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\InventoryController as AdminInventoryController;
use App\Http\Controllers\Api\V1\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\V1\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\V1\Admin\ProductImportController as AdminProductImportController;
use App\Http\Controllers\Api\V1\Admin\SettingController as AdminSettingController;
use App\Http\Controllers\Api\V1\Public\CartController as PublicCartController;
use App\Http\Controllers\Api\V1\Public\CategoryController as PublicCategoryController;
use App\Http\Controllers\Api\V1\Public\OrderController as PublicOrderController;
use App\Http\Controllers\Api\V1\Public\ProductController as PublicProductController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — El Bahli Store (V1)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->name('api.v1.')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Routes Publiques (Catalogue, Panier, Commandes)
    |--------------------------------------------------------------------------
    */
    Route::get('/categories', [PublicCategoryController::class, 'index'])->name('categories.index');
    Route::get('/categories/{slug}/products', [PublicCategoryController::class, 'products'])->name('categories.products');

    Route::get('/products', [PublicProductController::class, 'index'])->name('products.index');
    Route::get('/products/{slug}', [PublicProductController::class, 'show'])->name('products.show');

    Route::post('/cart/estimate', [PublicCartController::class, 'estimate'])
        ->middleware('throttle:cart-estimate')
        ->name('cart.estimate');

    Route::post('/orders', [PublicOrderController::class, 'store'])
        ->middleware('throttle:order-submission')
        ->name('orders.store');

    Route::get('/orders/confirmation/{token}', [PublicOrderController::class, 'confirmation'])
        ->middleware('signed')
        ->name('orders.confirmation');

    /*
    |--------------------------------------------------------------------------
    | Routes Administrateur (/api/v1/admin)
    |--------------------------------------------------------------------------
    */
    Route::prefix('admin')->name('admin.')->group(function () {

        // Authentification Admin
        Route::post('/login', [AdminAuthController::class, 'login'])
            ->middleware('throttle:5,1')
            ->name('login');

        // Endpoints protégés (auth:sanctum + is_admin)
        Route::middleware(['auth:sanctum', 'admin', 'throttle:admin'])->group(function () {

            Route::post('/logout', [AdminAuthController::class, 'logout'])->name('logout');
            Route::get('/me', [AdminAuthController::class, 'me'])->name('me');

            // Dashboard
            Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');

            // Catégories
            Route::get('/categories', [AdminCategoryController::class, 'index'])->name('categories.index');
            Route::post('/categories', [AdminCategoryController::class, 'store'])->name('categories.store');
            Route::get('/categories/{category}', [AdminCategoryController::class, 'show'])->name('categories.show');
            Route::put('/categories/{category}', [AdminCategoryController::class, 'update'])->name('categories.update');
            Route::patch('/categories/{category}/toggle', [AdminCategoryController::class, 'toggle'])->name('categories.toggle');
            Route::post('/categories/reorder', [AdminCategoryController::class, 'reorder'])->name('categories.reorder');
            Route::delete('/categories/{category}', [AdminCategoryController::class, 'destroy'])->name('categories.destroy');

            // Import CSV Produits (déclaré avant {product})
            Route::get('/products/import/template', [AdminProductImportController::class, 'template'])->name('products.import.template');
            Route::post('/products/import/preview', [AdminProductImportController::class, 'preview'])->name('products.import.preview');
            Route::post('/products/import/confirm', [AdminProductImportController::class, 'confirm'])->name('products.import.confirm');
            Route::post('/products/import/cancel', [AdminProductImportController::class, 'cancel'])->name('products.import.cancel');

            // Produits et Variantes
            Route::get('/products', [AdminProductController::class, 'index'])->name('products.index');
            Route::post('/products', [AdminProductController::class, 'store'])->name('products.store');
            Route::get('/products/{product}', [AdminProductController::class, 'show'])->name('products.show');
            Route::match(['put', 'post'], '/products/{product}', [AdminProductController::class, 'update'])->name('products.update');
            Route::patch('/products/{product}/toggle', [AdminProductController::class, 'toggle'])->name('products.toggle');
            Route::delete('/products/{product}', [AdminProductController::class, 'destroy'])->name('products.destroy');
            Route::post('/products/{product}/variants', [AdminProductController::class, 'addVariant'])->name('products.variants.store');
            Route::patch('/products/{product}/variants/{variant}', [AdminProductController::class, 'updateVariant'])->name('products.variants.update');

            // Galerie d'images
            Route::post('/products/{product}/images', [AdminProductController::class, 'addImage'])->name('products.images.store');
            Route::post('/products/{product}/images/{image}/main', [AdminProductController::class, 'setMainImage'])->name('products.images.main');
            Route::post('/products/{product}/images/reorder', [AdminProductController::class, 'reorderImages'])->name('products.images.reorder');
            Route::delete('/products/{product}/images/{image}', [AdminProductController::class, 'deleteImage'])->name('products.images.destroy');

            // Inventaire et ajustement de stock
            Route::get('/inventory', [AdminInventoryController::class, 'index'])->name('inventory.index');
            Route::get('/inventory/movements', [AdminInventoryController::class, 'movements'])->name('inventory.movements');
            Route::patch('/inventory/variants/{variant}', [AdminInventoryController::class, 'adjust'])->name('inventory.variants.adjust');
            Route::post('/inventory/variants/{variant}/adjust', [AdminInventoryController::class, 'adjust'])->name('inventory.adjust');
            Route::patch('/inventory/variants/{variant}/toggle', [AdminInventoryController::class, 'toggle'])->name('inventory.variants.toggle');

            // Commandes
            Route::get('/orders', [AdminOrderController::class, 'index'])->name('orders.index');
            Route::get('/orders/{order}', [AdminOrderController::class, 'show'])->name('orders.show');
            Route::patch('/orders/{order}/status', [AdminOrderController::class, 'updateStatus'])->name('orders.status');
            Route::patch('/orders/{order}/transition', [AdminOrderController::class, 'updateStatus'])->name('orders.transition');
            Route::post('/orders/{order}/returns', [AdminOrderController::class, 'processReturn'])->name('orders.returns');
            Route::patch('/orders/{order}/notes', [AdminOrderController::class, 'updateNotes'])->name('orders.notes');
            Route::patch('/orders/{order}/payment', [AdminOrderController::class, 'updatePayment'])->name('orders.payment');

            // Paramètres
            Route::get('/settings', [AdminSettingController::class, 'show'])->name('settings.show');
            Route::match(['put', 'post'], '/settings', [AdminSettingController::class, 'update'])->name('settings.update');

            // Journal d'audit
            Route::get('/audit-logs', [AdminAuditLogController::class, 'index'])->name('audit-logs.index');
        });
    });
});
