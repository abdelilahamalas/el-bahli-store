<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderReturn;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\User;
use App\Services\OrderService;
use App\Services\SettingService;
use Carbon\Carbon;
use Database\Seeders\CategorySeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CycleVieCommandesEtRetoursTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected Category $category;

    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'email' => 'zakariaelbahli@store.com',
            'name' => 'Zakaria El Bahli',
            'is_admin' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Sweat-Shirt',
            'slug' => 'sweat-shirt',
            'is_active' => true,
            'sort_order' => 3,
        ]);

        $this->product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Sweat-Shirt Classic',
            'slug' => 'sweat-shirt-classic',
            'price' => 300.00,
            'is_active' => true,
        ]);
    }

    // =========================================================================
    // 1. ADMIN CREATION CLI COMMAND & SANCTUM AUTHENTICATION
    // =========================================================================

    public function test_artisan_command_creates_or_resets_admin_idempotently(): void
    {
        $exitCode = Artisan::call('admin:create', [
            '--email' => 'zakariaelbahli@store.com',
            '--name' => 'Zakaria El Bahli',
            '--password' => 'SecurePass1234!',
            '--force' => true,
        ]);

        $this->assertEquals(0, $exitCode);

        $admin = User::where('email', 'zakariaelbahli@store.com')->first();
        $this->assertNotNull($admin);
        $this->assertTrue($admin->isAdmin());
        $this->assertTrue(Hash::check('SecurePass1234!', $admin->password));
    }

    public function test_admin_can_login_and_logout_via_sanctum_api(): void
    {
        $this->adminUser->password = Hash::make('CorrectPassword123!');
        $this->adminUser->save();

        // 1. Login success returns Sanctum bearer token
        $loginResponse = $this->postJson(route('api.v1.admin.login'), [
            'email' => 'zakariaelbahli@store.com',
            'password' => 'CorrectPassword123!',
        ]);

        $loginResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'token_type',
                    'user' => ['id', 'name', 'email', 'is_admin'],
                ],
            ]);

        $token = $loginResponse->json('data.token');
        $this->assertNotEmpty($token);

        // 2. Access protected endpoint with Bearer token
        $meResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.admin.me'));

        $meResponse->assertOk()
            ->assertJsonPath('data.email', 'zakariaelbahli@store.com');

        // 3. Logout revokes token
        $logoutResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson(route('api.v1.admin.logout'));

        $logoutResponse->assertOk();
    }

    public function test_non_admin_cannot_login_to_admin_api(): void
    {
        $regularUser = User::factory()->create([
            'email' => 'client@example.com',
            'password' => Hash::make('Secret123456!'),
            'is_admin' => false,
        ]);

        $response = $this->postJson(route('api.v1.admin.login'), [
            'email' => 'client@example.com',
            'password' => 'Secret123456!',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    // =========================================================================
    // 2. DASHBOARD & KPIS REVENUE AND RETURN METRICS
    // =========================================================================

    public function test_dashboard_kpis_calculate_realized_revenue_excluding_cancelled_and_returned(): void
    {
        Sanctum::actingAs($this->adminUser);

        // 1. Confirmed order: 500 MAD (Counts towards revenue)
        Order::create([
            'reference' => 'CMD-REV-001',
            'customer_name' => 'Client 1',
            'customer_phone' => '0661111111',
            'city' => 'Casablanca',
            'address' => 'Gauthier',
            'status' => OrderStatus::CONFIRMED,
            'subtotal' => 465.00,
            'delivery_fee' => 35.00,
            'total' => 500.00,
            'confirmed_at' => now(),
        ]);

        // 2. Delivered order: 350 MAD (Counts towards revenue)
        Order::create([
            'reference' => 'CMD-REV-002',
            'customer_name' => 'Client 2',
            'customer_phone' => '0662222222',
            'city' => 'Rabat',
            'address' => 'Agdal',
            'status' => OrderStatus::DELIVERED,
            'subtotal' => 315.00,
            'delivery_fee' => 35.00,
            'total' => 350.00,
            'delivered_at' => now(),
        ]);

        // 3. Cancelled order: 800 MAD (MUST BE EXCLUDED FROM REVENUE!)
        Order::create([
            'reference' => 'CMD-REV-003',
            'customer_name' => 'Client 3',
            'customer_phone' => '0663333333',
            'city' => 'Tanger',
            'address' => 'Malabata',
            'status' => OrderStatus::CANCELLED,
            'subtotal' => 765.00,
            'delivery_fee' => 35.00,
            'total' => 800.00,
            'cancelled_at' => now(),
        ]);

        // 4. Returned order: 400 MAD (MUST BE EXCLUDED FROM REVENUE!)
        Order::create([
            'reference' => 'CMD-REV-004',
            'customer_name' => 'Client 4',
            'customer_phone' => '0664444444',
            'city' => 'Fès',
            'address' => 'Centre',
            'status' => OrderStatus::RETURNED,
            'subtotal' => 365.00,
            'delivery_fee' => 35.00,
            'total' => 400.00,
            'returned_at' => now(),
        ]);

        $response = $this->getJson(route('api.v1.admin.dashboard'));

        $response->assertOk()
            ->assertJsonPath('success', true);

        // Revenue = 500.00 + 350.00 = 850.00 (Cancelled & Returned strictly excluded!)
        $this->assertEquals('850.00', $response->json('data.revenue'));
        $this->assertEquals('850.00', $response->json('data.kpis.revenue'));
        $this->assertEquals(4, $response->json('data.kpis.total_orders'));
        $this->assertEquals(1, $response->json('data.kpis.confirmed_orders'));
        $this->assertEquals(1, $response->json('data.kpis.delivered_orders'));
        $this->assertEquals(1, $response->json('data.kpis.cancelled_orders'));
        $this->assertEquals(1, $response->json('data.kpis.returned_orders'));
    }

    public function test_dashboard_supports_period_filtering(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Old order last month
        $oldOrder = Order::create([
            'reference' => 'CMD-OLD-001',
            'customer_name' => 'Ancien Client',
            'customer_phone' => '0661111111',
            'city' => 'Rabat',
            'address' => 'Hassan',
            'status' => OrderStatus::CONFIRMED,
            'subtotal' => 200.00,
            'delivery_fee' => 35.00,
            'total' => 235.00,
        ]);
        $oldOrder->created_at = Carbon::now()->subMonths(2);
        $oldOrder->save();

        // Today's order
        $todayOrder = Order::create([
            'reference' => 'CMD-TODAY-001',
            'customer_name' => 'Client Aujourdhui',
            'customer_phone' => '0662222222',
            'city' => 'Casablanca',
            'address' => 'Maarif',
            'status' => OrderStatus::CONFIRMED,
            'subtotal' => 400.00,
            'delivery_fee' => 35.00,
            'total' => 435.00,
        ]);

        // Request period=today
        $responseToday = $this->getJson(route('api.v1.admin.dashboard', ['period' => 'today']));
        $responseToday->assertOk();
        $this->assertEquals(1, $responseToday->json('data.kpis.total_orders'));
        $this->assertEquals('435.00', $responseToday->json('data.kpis.revenue'));

        // Request period=all
        $responseAll = $this->getJson(route('api.v1.admin.dashboard', ['period' => 'all']));
        $responseAll->assertOk();
        $this->assertEquals(2, $responseAll->json('data.kpis.total_orders'));
        $this->assertEquals('670.00', $responseAll->json('data.kpis.revenue'));
    }

    // =========================================================================
    // 3. CATEGORY SEEDER & CRUD
    // =========================================================================

    public function test_category_seeder_creates_all_12_categories_idempotently(): void
    {
        $seeder = new CategorySeeder;
        $seeder->run();

        $expectedCategories = [
            'Capuches',
            'Capuches zippé',
            'Sweat-Shirt',
            'Polo',
            'Jackets',
            'Jeans',
            'Tenu montone',
            'Pantalons classe',
            'Ensembles',
            'Casquettes',
            'T-shirts',
            'Chaussures',
        ];

        foreach ($expectedCategories as $name) {
            $this->assertDatabaseHas('categories', ['name' => $name, 'is_active' => true]);
        }

        // Running seeder a second time must NOT duplicate any category
        $countBefore = Category::count();
        $seeder->run();
        $this->assertEquals($countBefore, Category::count());
    }

    // =========================================================================
    // 4. ORDER TRANSITIONS & RETURN WORKFLOW
    // =========================================================================

    public function test_order_full_workflow_from_pending_to_delivered_and_returned(): void
    {
        Sanctum::actingAs($this->adminUser);

        $variant = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'L',
            'color' => 'Noir',
            'stock' => 10,
        ]);

        $orderService = app(OrderService::class);

        // 1. Order placed: PENDING -> stock remains 10
        $order = $orderService->createOrder(
            [
                'customer_name' => 'Amine Bennis',
                'customer_phone' => '0661234567',
                'city' => 'Casablanca',
                'address' => 'Anfa',
            ],
            [
                ['product_id' => $this->product->id, 'size' => 'L', 'color' => 'Noir', 'quantity' => 3],
            ]
        );

        $this->assertEquals(OrderStatus::PENDING, $order->status);
        $this->assertEquals(10, $variant->fresh()->stock);

        // 2. Admin confirms order: CONFIRMED -> stock decremented to 7
        $order = $orderService->transitionStatus($order, OrderStatus::CONFIRMED, $this->adminUser->id);
        $this->assertEquals(OrderStatus::CONFIRMED, $order->status);
        $this->assertEquals(7, $variant->fresh()->stock);
        $this->assertNotNull($order->confirmed_at);

        // 3. Admin transitions to processing (preparation)
        $order = $orderService->transitionStatus($order, OrderStatus::PROCESSING, $this->adminUser->id);
        $this->assertEquals(OrderStatus::PROCESSING, $order->status);
        $this->assertNotNull($order->processing_at);

        // 4. Admin transitions to shipped
        $order = $orderService->transitionStatus($order, OrderStatus::SHIPPED, $this->adminUser->id);
        $this->assertEquals(OrderStatus::SHIPPED, $order->status);
        $this->assertNotNull($order->shipped_at);

        // 5. Admin transitions to delivered
        $order = $orderService->transitionStatus($order, OrderStatus::DELIVERED, $this->adminUser->id);
        $this->assertEquals(OrderStatus::DELIVERED, $order->status);
        $this->assertNotNull($order->delivered_at);

        // 6. Client requests return -> RETURN_REQUESTED (no stock modification)
        $order = $orderService->transitionStatus($order, OrderStatus::RETURN_REQUESTED, $this->adminUser->id);
        $this->assertEquals(OrderStatus::RETURN_REQUESTED, $order->status);
        $this->assertEquals(7, $variant->fresh()->stock);

        // 7. Warehouse receives return -> RETURN_RECEIVED (inspection stage, no stock modification yet)
        $order = $orderService->transitionStatus($order, OrderStatus::RETURN_RECEIVED, $this->adminUser->id);
        $this->assertEquals(OrderStatus::RETURN_RECEIVED, $order->status);
        $this->assertEquals(7, $variant->fresh()->stock);

        // 8. Process Return:
        // Out of 3 returned items: 2 are in good condition (resellable), 1 is damaged (NOT restocked!)
        $orderItem = $order->items->first();

        $returnResponse = $this->postJson(route('api.v1.admin.orders.returns', $order->id), [
            'reason' => 'Retour client suite problème de taille',
            'returns' => [
                [
                    'order_item_id' => $orderItem->id,
                    'quantity_returned' => 3,
                    'quantity_resellable' => 2,
                    'quantity_damaged' => 1,
                    'reason' => '2 remis en rayon, 1 taché',
                ],
            ],
        ]);

        $returnResponse->assertOk()
            ->assertJsonPath('success', true);

        // Crucial test: Stock becomes 7 + 2 = 9 (Damaged item was NOT restocked!)
        $this->assertEquals(9, $variant->fresh()->stock);

        // Order is marked as RETURNED
        $this->assertEquals(OrderStatus::RETURNED, $order->fresh()->status);
        $this->assertNotNull($order->fresh()->returned_at);

        // Verify return record created
        $returnRecord = OrderReturn::where('order_id', $order->id)->first();
        $this->assertNotNull($returnRecord);
        $this->assertEquals(3, $returnRecord->quantity_returned);
        $this->assertEquals(2, $returnRecord->quantity_resellable);
        $this->assertEquals(1, $returnRecord->quantity_damaged);
        $this->assertTrue($returnRecord->restocked);

        // Verify status history recorded every step
        $this->assertGreaterThanOrEqual(6, OrderStatusHistory::where('order_id', $order->id)->count());
    }

    public function test_admin_can_update_order_internal_notes(): void
    {
        Sanctum::actingAs($this->adminUser);

        $order = Order::create([
            'reference' => 'CMD-NOTE-001',
            'customer_name' => 'Hamza',
            'customer_phone' => '0665555555',
            'city' => 'Casablanca',
            'address' => 'Oasis',
            'status' => OrderStatus::PENDING,
            'subtotal' => 250.00,
            'delivery_fee' => 0.00,
            'total' => 250.00,
        ]);

        $response = $this->patchJson(route('api.v1.admin.orders.notes', $order->id), [
            'admin_notes' => 'Client a demandé d\'appeler son gardien avant livraison.',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.admin_notes', 'Client a demandé d\'appeler son gardien avant livraison.');

        $this->assertEquals('Client a demandé d\'appeler son gardien avant livraison.', $order->fresh()->admin_notes);
    }

    // =========================================================================
    // 5. STOCK MOVEMENTS AUDIT TRAIL ENDPOINT
    // =========================================================================

    public function test_admin_can_query_stock_movements_audit_trail(): void
    {
        Sanctum::actingAs($this->adminUser);

        $variant = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'M',
            'color' => 'Gris',
            'stock' => 15,
        ]);

        // Create adjustment
        $this->patchJson(route('api.v1.admin.inventory.variants.adjust', $variant->id), [
            'new_stock' => 25,
            'reason' => 'Arrivage conteneur',
        ])->assertOk();

        // Query movements endpoint
        $response = $this->getJson(route('api.v1.admin.inventory.movements', [
            'variant_id' => $variant->id,
        ]));

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'data' => [
                        '*' => [
                            'id',
                            'variant_id',
                            'product_name',
                            'size',
                            'color',
                            'type',
                            'quantity_before',
                            'quantity_delta',
                            'quantity_after',
                            'reason',
                        ],
                    ],
                    'pagination',
                ],
            ]);

        $first = $response->json('data.data.0');
        $this->assertEquals(15, $first['quantity_before']);
        $this->assertEquals(10, $first['quantity_delta']);
        $this->assertEquals(25, $first['quantity_after']);
        $this->assertEquals('Arrivage conteneur', $first['reason']);
    }

    // =========================================================================
    // 6. STORE SETTINGS MANAGEMENT
    // =========================================================================

    public function test_admin_can_view_and_update_store_settings(): void
    {
        Sanctum::actingAs($this->adminUser);

        (new SettingSeeder)->run();

        $showResponse = $this->getJson(route('api.v1.admin.settings.show'));
        $showResponse->assertOk()
            ->assertJsonPath('data.currency', 'MAD')
            ->assertJsonPath('data.language', 'fr');

        $updateResponse = $this->putJson(route('api.v1.admin.settings.update'), [
            'store_name' => 'El Bahli Store Luxury',
            'store_phone' => '+212612345678',
            'store_email' => 'contact@elbahlistore.ma',
            'delivery_fee' => 40.00,
            'free_shipping_threshold' => 600.00,
            'low_stock_threshold' => 8,
            'currency' => 'MAD',
            'language' => 'fr',
            'store_city' => 'Tanger',
            'store_address' => 'Boulevard Pasteur, Tanger',
        ]);

        $updateResponse->assertOk()
            ->assertJsonPath('data.store_name', 'El Bahli Store Luxury')
            ->assertJsonPath('data.delivery_fee', '0.00')
            ->assertJsonPath('data.is_delivery_free', true)
            ->assertJsonPath('data.low_stock_threshold', 8);

        $settingService = app(SettingService::class);
        $this->assertEquals(0.0, $settingService->getDeliveryFee());
        $this->assertEquals('El Bahli Store Luxury', $settingService->get('store_name'));
    }
}
