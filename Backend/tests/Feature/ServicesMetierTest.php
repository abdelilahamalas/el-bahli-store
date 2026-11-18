<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\Setting;
use App\Services\ImageService;
use App\Services\OrderService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Tests\TestCase;

class ServicesMetierTest extends TestCase
{
    use RefreshDatabase;

    protected Category $category;

    protected Product $product;

    protected ImageService $imageService;

    protected OrderService $orderService;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->category = Category::create([
            'name' => 'Vêtements Homme',
            'slug' => 'vetements-homme',
            'is_active' => true,
        ]);

        $this->product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Djellaba Moderne',
            'slug' => 'djellaba-moderne',
            'description' => 'Djellaba moderne marocaine',
            'price' => '350.00',
            'is_active' => true,
        ]);

        Setting::updateOrCreate(['key' => 'delivery_fee'], ['value' => '35.00']);

        $this->imageService = app(ImageService::class);
        $this->orderService = app(OrderService::class);
    }

    /**
     * TEST SECTION 1: GESTION DES VARIANTES TAILLE ET COULEUR
     */
    public function test_can_create_variants_with_distinct_sizes_and_colors_and_independent_stocks(): void
    {
        $v1 = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'M',
            'color' => 'Noir',
            'stock' => 15,
        ]);

        $v2 = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'M',
            'color' => 'Blanc',
            'stock' => 8,
        ]);

        $v3 = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'L',
            'color' => 'Noir',
            'stock' => 10,
        ]);

        $this->assertDatabaseCount('product_sizes', 3);
        $this->assertSame(15, $v1->fresh()->stock);
        $this->assertSame(8, $v2->fresh()->stock);
        $this->assertSame(10, $v3->fresh()->stock);

        // Eloquent relationship check
        $this->assertCount(3, $this->product->fresh()->sizes);
        $this->assertCount(3, $this->product->fresh()->variantes);
    }

    public function test_duplicate_product_size_color_combination_is_rejected_by_database_constraint(): void
    {
        ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'M',
            'color' => 'Bleu',
            'stock' => 5,
        ]);

        $this->expectException(QueryException::class);

        ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'M',
            'color' => 'Bleu',
            'stock' => 12,
        ]);
    }

    /**
     * TEST SECTION 2: SERVICE DE GALERIE D'IMAGES ET SÉCURITÉ
     */
    public function test_can_upload_multiple_images_first_image_is_automatically_main(): void
    {
        $file1 = UploadedFile::fake()->image('djellaba_1.jpg', 800, 1000);
        $file2 = UploadedFile::fake()->image('djellaba_2.png', 800, 1000);

        $images = $this->imageService->addMultipleImagesToProduct($this->product, [$file1, $file2]);

        $this->assertCount(2, $images);
        $this->assertDatabaseCount('images_produits', 2);

        $first = $images->first()->fresh();
        $second = $images->last()->fresh();

        $this->assertTrue((bool) $first->est_principale);
        $this->assertFalse((bool) $second->est_principale);

        // Product legacy columns synchronized with main image
        $productFresh = $this->product->fresh();
        $this->assertSame($first->chemin_image, $productFresh->image);
        $this->assertSame($first->chemin_miniature, $productFresh->thumbnail);

        // Physical files stored
        Storage::disk('public')->assertExists($first->chemin_image);
        Storage::disk('public')->assertExists($first->chemin_miniature);
        Storage::disk('public')->assertExists($second->chemin_image);
        Storage::disk('public')->assertExists($second->chemin_miniature);
    }

    public function test_can_set_new_main_image_and_update_all_references(): void
    {
        $file1 = UploadedFile::fake()->image('img1.jpg', 600, 600);
        $file2 = UploadedFile::fake()->image('img2.jpg', 600, 600);

        $img1 = $this->imageService->addImageToProduct($this->product, $file1, true);
        $img2 = $this->imageService->addImageToProduct($this->product, $file2, false);

        $this->assertTrue((bool) $img1->fresh()->est_principale);
        $this->assertFalse((bool) $img2->fresh()->est_principale);

        // Switch main image to img2
        $this->imageService->setMainImage($this->product, $img2->id);

        $this->assertFalse((bool) $img1->fresh()->est_principale);
        $this->assertTrue((bool) $img2->fresh()->est_principale);

        // Product synchronized
        $this->assertSame($img2->chemin_image, $this->product->fresh()->image);
    }

    public function test_can_reorder_gallery_images(): void
    {
        $file1 = UploadedFile::fake()->image('img1.jpg', 600, 600);
        $file2 = UploadedFile::fake()->image('img2.jpg', 600, 600);

        $img1 = $this->imageService->addImageToProduct($this->product, $file1, true, 1);
        $img2 = $this->imageService->addImageToProduct($this->product, $file2, false, 2);

        $this->imageService->reorderImages($this->product, [
            ['id' => $img1->id, 'ordre_affichage' => 10],
            ['id' => $img2->id, 'ordre_affichage' => 5],
        ]);

        $this->assertSame(10, $img1->fresh()->ordre_affichage);
        $this->assertSame(5, $img2->fresh()->ordre_affichage);
    }

    public function test_can_replace_image_and_delete_old_physical_files(): void
    {
        $oldFile = UploadedFile::fake()->image('old.jpg', 500, 500);
        $img = $this->imageService->addImageToProduct($this->product, $oldFile, true);

        $oldMainPath = $img->chemin_image;
        $oldThumbPath = $img->chemin_miniature;

        Storage::disk('public')->assertExists($oldMainPath);

        $newFile = UploadedFile::fake()->image('new.jpg', 500, 500);
        $replaced = $this->imageService->replaceProductImage($this->product, $img->id, $newFile, 'Nouveau texte');

        $this->assertSame('Nouveau texte', $replaced->fresh()->texte_alternatif);
        $this->assertNotSame($oldMainPath, $replaced->chemin_image);

        // Old files removed
        Storage::disk('public')->assertMissing($oldMainPath);
        Storage::disk('public')->assertMissing($oldThumbPath);

        // New files present
        Storage::disk('public')->assertExists($replaced->chemin_image);
        Storage::disk('public')->assertExists($replaced->chemin_miniature);
    }

    public function test_deleting_main_image_deterministically_promotes_next_image(): void
    {
        $file1 = UploadedFile::fake()->image('img1.jpg', 500, 500);
        $file2 = UploadedFile::fake()->image('img2.jpg', 500, 500);
        $file3 = UploadedFile::fake()->image('img3.jpg', 500, 500);

        $img1 = $this->imageService->addImageToProduct($this->product, $file1, true, 1);
        $img2 = $this->imageService->addImageToProduct($this->product, $file2, false, 2);
        $img3 = $this->imageService->addImageToProduct($this->product, $file3, false, 3);

        $deletedImagePath = $img1->chemin_image;
        $deletedThumbPath = $img1->chemin_miniature;

        // Delete the main image
        $this->imageService->deleteImageFromProduct($this->product, $img1->id);

        $this->assertDatabaseMissing('images_produits', ['id' => $img1->id]);
        Storage::disk('public')->assertMissing($deletedImagePath);
        Storage::disk('public')->assertMissing($deletedThumbPath);

        // Next image (img2, ordre 2) must become the new main image
        $this->assertTrue((bool) $img2->fresh()->est_principale);
        $this->assertFalse((bool) $img3->fresh()->est_principale);

        $this->assertSame($img2->chemin_image, $this->product->fresh()->image);
    }

    public function test_anti_idor_protects_image_modification_and_deletion_across_products(): void
    {
        $product2 = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Autre Produit',
            'slug' => 'autre-produit',
            'price' => '200.00',
            'is_active' => true,
        ]);

        $file = UploadedFile::fake()->image('target.jpg', 500, 500);
        $img1 = $this->imageService->addImageToProduct($this->product, $file, true);

        // Attempting to set main image of product2 using product1's image
        $this->expectException(AccessDeniedHttpException::class);
        $this->imageService->setMainImage($product2, $img1->id);
    }

    /**
     * TEST SECTION 3: SERVICE DES COMMANDES ET DEVIS PANIER
     */
    public function test_estimate_cart_calculates_subtotal_and_delivery_fee_correctly_with_variants(): void
    {
        ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'M',
            'color' => 'Noir',
            'stock' => 10,
        ]);

        ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'L',
            'color' => 'Blanc',
            'stock' => 2,
        ]);

        $cart = [
            ['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Noir', 'quantity' => 2],
            ['product_id' => $this->product->id, 'size' => 'L', 'color' => 'Blanc', 'quantity' => 1],
        ];

        $estimate = $this->orderService->estimateCart($cart);

        $this->assertTrue($estimate['is_valid']);
        // Subtotal: 2 * 350 + 1 * 350 = 1050.00 (delivery is always free 0.00 MAD)
        $this->assertSame('1050.00', $estimate['subtotal']);
        $this->assertSame('0.00', $estimate['delivery_fee']);
        $this->assertSame('1050.00', $estimate['total']);
        $this->assertCount(2, $estimate['items']);
    }

    public function test_estimate_cart_flags_invalid_when_stock_is_insufficient(): void
    {
        ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'XL',
            'color' => 'Gris',
            'stock' => 1,
        ]);

        $cart = [
            ['product_id' => $this->product->id, 'size' => 'XL', 'color' => 'Gris', 'quantity' => 3],
        ];

        $estimate = $this->orderService->estimateCart($cart);

        $this->assertFalse($estimate['is_valid']);
        $this->assertFalse($estimate['items'][0]['is_available']);
        $this->assertSame(1, $estimate['items'][0]['available_stock']);
    }

    public function test_create_order_persists_variant_color_recalculates_price_server_side_and_decrements_exact_stock(): void
    {
        $vNoir = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'M',
            'color' => 'Noir',
            'stock' => 10,
        ]);

        $vBlanc = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'M',
            'color' => 'Blanc',
            'stock' => 10,
        ]);

        $customerData = [
            'customer_name' => 'Karim Benjelloun',
            'customer_phone' => '0661234567',
            'city' => 'Casablanca',
            'address' => '123 Boulevard d\'Anfa, Apt 4',
            'note' => 'Livraison l\'après-midi svp',
        ];

        $items = [
            [
                'product_id' => $this->product->id,
                'size' => 'M',
                'color' => 'Noir',
                'quantity' => 3,
                // Client attempts to tamper with price
                'unit_price' => '10.00',
            ],
        ];

        $order = $this->orderService->createOrder($customerData, $items, '192.168.1.50');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'reference' => $order->reference,
            'customer_name' => 'Karim Benjelloun',
            'customer_phone' => '+212661234567',
            'status' => OrderStatus::PENDING->value,
            'subtotal' => '1050.00', // 3 * 350.00, client price ignored
            'delivery_fee' => '0.00',
            'total' => '1050.00',
        ]);

        // Check line item persisted with color
        $this->assertDatabaseHas('order_items', [
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'size' => 'M',
            'couleur_copie' => 'Noir',
            'unit_price' => '350.00',
            'quantity' => 3,
            'line_total' => '1050.00',
        ]);

        // Stock checks: In PENDING, stock remains intact
        $this->assertSame(10, $vNoir->fresh()->stock);
        $this->assertSame(10, $vBlanc->fresh()->stock);

        // Confirm order: stock is decremented
        $this->orderService->transitionStatus($order, OrderStatus::CONFIRMED);
        $this->assertSame(7, $vNoir->fresh()->stock);
        $this->assertSame(10, $vBlanc->fresh()->stock);
    }

    public function test_cancelling_order_restores_exact_variant_stock_idempotently(): void
    {
        $variant = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'XL',
            'color' => 'Vert',
            'stock' => 5,
        ]);

        $order = $this->orderService->createOrder(
            [
                'customer_name' => 'Rachid Alami',
                'customer_phone' => '+212670000000',
                'city' => 'Rabat',
                'address' => 'Agdal',
            ],
            [
                ['product_id' => $this->product->id, 'size' => 'XL', 'color' => 'Vert', 'quantity' => 2],
            ]
        );

        // In PENDING, stock is 5
        $this->assertSame(5, $variant->fresh()->stock);

        // Confirm order -> stock is decremented to 3
        $this->orderService->transitionStatus($order, OrderStatus::CONFIRMED);
        $this->assertSame(3, $variant->fresh()->stock);

        // Cancel order -> restore stock back to 5
        $this->orderService->transitionStatus($order->fresh(), OrderStatus::CANCELLED);
        $this->assertSame(5, $variant->fresh()->stock);

        // Attempting to cancel again should throw or not re-increment
        $this->expectException(ValidationException::class);
        $this->orderService->transitionStatus($order->fresh(), OrderStatus::CANCELLED);
    }

    public function test_order_merging_aggregates_identical_variant_lines(): void
    {
        $raw = [
            ['product_id' => 1, 'size' => 'M', 'color' => 'Noir', 'quantity' => 2],
            ['product_id' => 1, 'size' => 'M', 'color' => 'Noir', 'quantity' => 3],
            ['product_id' => 1, 'size' => 'M', 'color' => 'Blanc', 'quantity' => 1],
        ];

        $merged = $this->orderService->mergeAndValidateItems($raw);

        $this->assertCount(2, $merged);
        $this->assertSame(5, $merged['1_M_Noir']['quantity']);
        $this->assertSame(1, $merged['1_M_Blanc']['quantity']);
    }

    public function test_moroccan_phone_normalization_formats(): void
    {
        $this->assertSame('+212612345678', OrderService::normalizeMoroccanPhone('0612345678'));
        $this->assertSame('+212712345678', OrderService::normalizeMoroccanPhone('07 12 34 56 78'));
        $this->assertSame('+212522334455', OrderService::normalizeMoroccanPhone('05-22-33-44-55'));
        $this->assertSame('+212612345678', OrderService::normalizeMoroccanPhone('+212612345678'));
        $this->assertSame('+212612345678', OrderService::normalizeMoroccanPhone('00212612345678'));
        $this->assertNull(OrderService::normalizeMoroccanPhone('0123456789')); // Invalid prefix 01
        $this->assertNull(OrderService::normalizeMoroccanPhone('12345'));
    }
}
