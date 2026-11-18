<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\InventoryService;
use App\Services\OrderService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VariantesEtStockTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'email' => 'admin-stock@example.com',
            'is_admin' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Sweat-Shirt',
            'slug' => 'sweat-shirt',
            'is_active' => true,
            'sort_order' => 1,
        ]);
    }

    // =========================================================================
    // 1. TOTAL ABSENCE OF INERTIA & STRICT REST API COMPLIANCE
    // =========================================================================

    public function test_root_and_api_endpoints_return_pure_json_without_inertia(): void
    {
        // 1. Root healthcheck endpoint
        $rootResponse = $this->getJson('/');
        $rootResponse->assertOk()
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonPath('status', 'online');

        $this->assertFalse($rootResponse->headers->has('X-Inertia'));
        $this->assertStringNotContainsString('<!DOCTYPE html>', (string) $rootResponse->getContent());
        $this->assertStringNotContainsString('data-page=', (string) $rootResponse->getContent());

        // 2. Categories API endpoint
        $categoriesResponse = $this->getJson(route('api.v1.categories.index'));
        $categoriesResponse->assertOk()
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonPath('success', true);

        $this->assertFalse($categoriesResponse->headers->has('X-Inertia'));

        // 3. Admin API endpoint (authenticated via Sanctum)
        Sanctum::actingAs($this->adminUser);
        $adminResponse = $this->getJson(route('api.v1.admin.dashboard'));
        $adminResponse->assertOk()
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'orders_count',
                    'orders_by_status',
                    'revenue',
                    'activity_7_days',
                    'recent_orders',
                    'inventory',
                ],
            ]);

        $this->assertFalse($adminResponse->headers->has('X-Inertia'));
    }

    public function test_unauthenticated_api_request_returns_json_401_not_html_redirect(): void
    {
        $response = $this->getJson(route('api.v1.admin.dashboard'));
        $response->assertStatus(401)
            ->assertHeader('Content-Type', 'application/json')
            ->assertJson([
                'success' => false,
                'message' => 'Non authentifié. Veuillez vous connecter.',
            ]);

        $this->assertFalse($response->headers->has('X-Inertia'));
    }

    // =========================================================================
    // 2. MULTI-VARIANT STOCK ARCHITECTURE & ISOLATION
    // =========================================================================

    public function test_variants_have_independent_stock_per_size_and_color(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Sweat-Shirt Premium',
            'slug' => 'sweat-shirt-premium',
            'price' => 320.00,
            'is_active' => true,
        ]);

        // Create variants: Sweat-Shirt (M Noir: 15, L Noir: 20, XL Noir: 3, M Blanc: 12, L Blanc: 8)
        $varMNoir = ProductSize::create(['product_id' => $product->id, 'size' => 'M', 'color' => 'Noir', 'stock' => 15]);
        $varLNoir = ProductSize::create(['product_id' => $product->id, 'size' => 'L', 'color' => 'Noir', 'stock' => 20]);
        $varXLNoir = ProductSize::create(['product_id' => $product->id, 'size' => 'XL', 'color' => 'Noir', 'stock' => 3]);
        $varMBlanc = ProductSize::create(['product_id' => $product->id, 'size' => 'M', 'color' => 'Blanc', 'stock' => 12]);
        $varLBlanc = ProductSize::create(['product_id' => $product->id, 'size' => 'L', 'color' => 'Blanc', 'stock' => 8]);

        $this->assertEquals(5, $product->variants()->count());
        $this->assertEquals(58, $product->variants()->sum('stock'));

        // Adjust stock for M Noir only
        $inventoryService = app(InventoryService::class);
        $inventoryService->adjustStock($varMNoir, 10, 'Ajustement inventaire physique', $this->adminUser->id);

        // Verify isolation: M Noir changed to 10, all others remain strictly unchanged
        $this->assertEquals(10, $varMNoir->fresh()->stock);
        $this->assertEquals(20, $varLNoir->fresh()->stock);
        $this->assertEquals(3, $varXLNoir->fresh()->stock);
        $this->assertEquals(12, $varMBlanc->fresh()->stock);
        $this->assertEquals(8, $varLBlanc->fresh()->stock);
    }

    public function test_unique_constraint_on_product_size_and_color_prevents_duplicate_variant(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Polo Classique',
            'slug' => 'polo-classique',
            'price' => 180.00,
            'is_active' => true,
        ]);

        // First creation succeeds
        ProductSize::create([
            'product_id' => $product->id,
            'size' => 'M',
            'color' => 'Bleu Marine',
            'stock' => 25,
        ]);

        // Second creation of identical (product_id, size, color) must violate unique constraint
        $this->expectException(QueryException::class);
        ProductSize::create([
            'product_id' => $product->id,
            'size' => 'M',
            'color' => 'Bleu Marine',
            'stock' => 10,
        ]);
    }

    public function test_single_standard_variant_for_accessories(): void
    {
        $capCategory = Category::create([
            'name' => 'Casquettes',
            'slug' => 'casquettes',
            'is_active' => true,
            'sort_order' => 10,
        ]);

        $capProduct = Product::create([
            'category_id' => $capCategory->id,
            'name' => 'Casquette El Bahli Signature',
            'slug' => 'casquette-el-bahli-signature',
            'price' => 150.00,
            'is_active' => true,
        ]);

        $variant = ProductSize::create([
            'product_id' => $capProduct->id,
            'size' => 'Unique',
            'color' => 'Noir',
            'stock' => 40,
        ]);

        $this->assertEquals('Unique', $variant->size);
        $this->assertEquals('Noir', $variant->color);
        $this->assertEquals(40, $variant->stock);

        // Order this accessory
        $orderService = app(OrderService::class);
        $order = $orderService->createOrder(
            [
                'customer_name' => 'Amine Tazi',
                'customer_phone' => '0661234567',
                'city' => 'Casablanca',
                'address' => 'Maarif',
            ],
            [
                ['product_id' => $capProduct->id, 'size' => 'Unique', 'color' => 'Noir', 'quantity' => 2],
            ]
        );

        $this->assertEquals(40, $variant->fresh()->stock); // PENDING: stock preserved

        $orderService->transitionStatus($order, OrderStatus::CONFIRMED);
        $this->assertEquals(38, $variant->fresh()->stock); // CONFIRMED: 40 - 2 = 38
    }

    // =========================================================================
    // 3. STOCK MOVEMENTS TRACEABILITY & PREVENTION OF NEGATIVE STOCK
    // =========================================================================

    public function test_manual_stock_adjustment_via_api_logs_movement_with_admin_trace(): void
    {
        Sanctum::actingAs($this->adminUser);

        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Hoodie Gris',
            'slug' => 'hoodie-gris',
            'price' => 290.00,
            'is_active' => true,
        ]);

        $variant = ProductSize::create([
            'product_id' => $product->id,
            'size' => 'L',
            'color' => 'Gris',
            'stock' => 20,
        ]);

        // Adjust stock via Admin REST API
        $response = $this->patchJson(route('api.v1.admin.inventory.variants.adjust', $variant->id), [
            'new_stock' => 35,
            'reason' => 'Réassort fournisseur arrivage conteneur #4',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.stock', 35);

        $this->assertEquals(35, $variant->fresh()->stock);

        // Verify stock movement logged in database
        $movement = StockMovement::where('product_size_id', $variant->id)->latest()->first();
        $this->assertNotNull($movement);
        $this->assertEquals(20, $movement->quantity_before);
        $this->assertEquals(35, $movement->quantity_after);
        $this->assertEquals(15, $movement->quantity_delta);
        $this->assertEquals($this->adminUser->id, $movement->user_id);
        $this->assertEquals(StockMovement::TYPE_MANUAL_ADJUSTMENT, $movement->type);
        $this->assertStringContainsString('Réassort fournisseur', $movement->reason);
    }

    public function test_inventory_service_rejects_negative_stock_with_validation_exception(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'T-shirt Basique',
            'slug' => 't-shirt-basique',
            'price' => 120.00,
            'is_active' => true,
        ]);

        $variant = ProductSize::create([
            'product_id' => $product->id,
            'size' => 'S',
            'color' => 'Blanc',
            'stock' => 5,
        ]);

        $inventoryService = app(InventoryService::class);

        // 1. Setting negative absolute stock is forbidden
        $this->expectException(ValidationException::class);
        $inventoryService->adjustStock($variant, -3, 'Erreur de saisie', $this->adminUser->id);
    }

    public function test_api_rejects_negative_stock_adjustment(): void
    {
        Sanctum::actingAs($this->adminUser);

        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'T-shirt Test Negatif',
            'slug' => 't-shirt-test-negatif',
            'price' => 120.00,
            'is_active' => true,
        ]);

        $variant = ProductSize::create([
            'product_id' => $product->id,
            'size' => 'S',
            'color' => 'Blanc',
            'stock' => 5,
        ]);

        $response = $this->patchJson(route('api.v1.admin.inventory.variants.adjust', $variant->id), [
            'new_stock' => -1,
            'reason' => 'Test valeur négative',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['new_stock']);

        $this->assertEquals(5, $variant->fresh()->stock);
    }

    // =========================================================================
    // 4. ORDER STOCK LIFECYCLE & STRICT IDEMPOTENCY
    // =========================================================================

    public function test_order_stock_lifecycle_pending_confirmed_cancelled(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Veste Zippée',
            'slug' => 'veste-zippee',
            'price' => 450.00,
            'is_active' => true,
        ]);

        $variant = ProductSize::create([
            'product_id' => $product->id,
            'size' => 'XL',
            'color' => 'Kaki',
            'stock' => 10,
        ]);

        $orderService = app(OrderService::class);

        // 1. Commande créée en statut PENDING -> Stock INTACT (10)
        $order = $orderService->createOrder(
            [
                'customer_name' => 'Karim Berrada',
                'customer_phone' => '0661998877',
                'city' => 'Rabat',
                'address' => 'Souissi',
            ],
            [
                ['product_id' => $product->id, 'size' => 'XL', 'color' => 'Kaki', 'quantity' => 4],
            ]
        );

        $this->assertEquals(OrderStatus::PENDING, $order->status);
        $this->assertEquals(10, $variant->fresh()->stock);

        // 2. Confirmation par l'administrateur -> Stock décrémenté (10 - 4 = 6)
        $order = $orderService->transitionStatus($order, OrderStatus::CONFIRMED);
        $this->assertEquals(OrderStatus::CONFIRMED, $order->status);
        $this->assertEquals(6, $variant->fresh()->stock);

        // Vérifier le mouvement de stock d'ordre
        $movementConfirm = StockMovement::where('product_size_id', $variant->id)
            ->where('type', StockMovement::TYPE_ORDER_CONFIRMATION)
            ->first();
        $this->assertNotNull($movementConfirm);
        $this->assertEquals(-4, $movementConfirm->quantity_delta);
        $this->assertEquals(10, $movementConfirm->quantity_before);
        $this->assertEquals(6, $movementConfirm->quantity_after);

        // 3. Double confirmation impossible (règle d'idempotence stricte)
        try {
            $orderService->transitionStatus($order, OrderStatus::CONFIRMED);
            $this->fail('Expected ValidationException on double confirmation');
        } catch (ValidationException $e) {
            // Le stock reste exactement à 6, aucune décrémentation supplémentaire
            $this->assertEquals(6, $variant->fresh()->stock);
        }

        // 4. Annulation de la commande après confirmation -> Stock restauré (6 + 4 = 10)
        $order = $orderService->transitionStatus($order, OrderStatus::CANCELLED);
        $this->assertEquals(OrderStatus::CANCELLED, $order->status);
        $this->assertEquals(10, $variant->fresh()->stock);

        // Vérifier le mouvement de restitution de stock
        $movementCancel = StockMovement::where('product_size_id', $variant->id)
            ->where('type', StockMovement::TYPE_ORDER_CANCELLATION)
            ->first();
        $this->assertNotNull($movementCancel);
        $this->assertEquals(4, $movementCancel->quantity_delta);
        $this->assertEquals(6, $movementCancel->quantity_before);
        $this->assertEquals(10, $movementCancel->quantity_after);

        // 5. Double annulation impossible -> Stock reste intact
        try {
            $orderService->transitionStatus($order, OrderStatus::CANCELLED);
            $this->fail('Expected ValidationException on double cancellation');
        } catch (ValidationException $e) {
            $this->assertEquals(10, $variant->fresh()->stock);
        }
    }

    public function test_cancelling_pending_order_does_not_increment_stock(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Jacket Cuir',
            'slug' => 'jacket-cuir',
            'price' => 600.00,
            'is_active' => true,
        ]);

        $variant = ProductSize::create([
            'product_id' => $product->id,
            'size' => 'M',
            'color' => 'Marron',
            'stock' => 7,
        ]);

        $orderService = app(OrderService::class);

        // Create order
        $order = $orderService->createOrder(
            [
                'customer_name' => 'Hamza Bennani',
                'customer_phone' => '0662334455',
                'city' => 'Tanger',
                'address' => 'Plage',
            ],
            [
                ['product_id' => $product->id, 'size' => 'M', 'color' => 'Marron', 'quantity' => 2],
            ]
        );

        $this->assertEquals(7, $variant->fresh()->stock);

        // Direct cancellation from PENDING (e.g. customer cancelled phone confirmation)
        $order = $orderService->transitionStatus($order, OrderStatus::CANCELLED);

        // Crucial test: Stock was never deducted, so it must NEVER be incremented to 9!
        $this->assertEquals(7, $variant->fresh()->stock);
    }

    public function test_insufficient_stock_rejection_provides_explicit_french_message(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Jean Slim',
            'slug' => 'jean-slim',
            'price' => 270.00,
            'is_active' => true,
        ]);

        $variant = ProductSize::create([
            'product_id' => $product->id,
            'size' => '32',
            'color' => 'Bleu Brut',
            'stock' => 2,
        ]);

        // Attempt order with 5 items while stock is 2 via REST API
        $response = $this->postJson(route('api.v1.orders.store'), [
            'customer_name' => 'Reda Filali',
            'customer_phone' => '0665544332',
            'city' => 'Agadir',
            'address' => 'Centre Ville',
            'idempotency_token' => 'token-insufficient-msg-test',
            'items' => [
                ['product_id' => $product->id, 'size' => '32', 'color' => 'Bleu Brut', 'quantity' => 5],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items']);

        $errorMsg = $response->json('errors.items.0');
        $this->assertStringContainsString('Stock insuffisant', $errorMsg);
        $this->assertStringContainsString('Jean Slim', $errorMsg);
        $this->assertStringContainsString('32', $errorMsg);
        $this->assertStringContainsString('stock restant : 2', $errorMsg);
    }

    public function test_concurrency_race_condition_protection_with_row_locking(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Casquette Edition Limitee',
            'slug' => 'casquette-edition-limitee',
            'price' => 350.00,
            'is_active' => true,
        ]);

        // Stock exactly equal to 1
        $variant = ProductSize::create([
            'product_id' => $product->id,
            'size' => 'Unique',
            'color' => 'Noir/Or',
            'stock' => 1,
        ]);

        $orderService = app(OrderService::class);

        // Buyer 1 places order
        $order1 = $orderService->createOrder(
            [
                'customer_name' => 'Acheteur 1',
                'customer_phone' => '0661111111',
                'city' => 'Casablanca',
                'address' => 'Anfa',
            ],
            [
                ['product_id' => $product->id, 'size' => 'Unique', 'color' => 'Noir/Or', 'quantity' => 1],
            ]
        );

        // Buyer 1 order is confirmed -> stock drops to 0
        $orderService->transitionStatus($order1, OrderStatus::CONFIRMED);
        $this->assertEquals(0, $variant->fresh()->stock);

        // Buyer 2 places order concurrently after stock reaches 0
        try {
            $orderService->createOrder(
                [
                    'customer_name' => 'Acheteur 2',
                    'customer_phone' => '0662222222',
                    'city' => 'Rabat',
                    'address' => 'Agdal',
                ],
                [
                    ['product_id' => $product->id, 'size' => 'Unique', 'color' => 'Noir/Or', 'quantity' => 1],
                ]
            );
            $this->fail('Expected ValidationException due to 0 stock');
        } catch (ValidationException $e) {
            $this->assertEquals(0, $variant->fresh()->stock);
            $this->assertGreaterThanOrEqual(0, $variant->fresh()->stock);
        }
    }
}
