<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\StockMovement;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ParcoursApiPubliqueTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $visitor;

    protected Category $category;

    protected Product $product;

    protected ProductSize $variantM;

    protected ProductSize $variantL;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CategorySeeder::class);

        $this->admin = User::factory()->create([
            'name' => 'Admin API',
            'email' => 'admin@elbahli.store',
            'is_admin' => true,
        ]);

        $this->visitor = User::factory()->create([
            'name' => 'Client API',
            'email' => 'client@elbahli.store',
            'is_admin' => false,
        ]);

        $this->category = Category::where('name', 'Sweat-Shirt')->first();

        $this->product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Sweat Capuche Urban Noir',
            'slug' => 'sweat-capuche-urban-noir',
            'description' => 'Sweat chaud 100% coton.',
            'price' => 350.00,
            'promotional_price' => 299.00,
            'is_active' => true,
        ]);

        $this->variantM = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'M',
            'color' => 'Noir',
            'stock' => 10,
            'is_active' => true,
        ]);

        $this->variantL = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'L',
            'color' => 'Noir',
            'stock' => 15,
            'is_active' => true,
        ]);

        Storage::fake('public');
    }

    // =========================================================================
    // 1. ENDPOINTS PUBLICS (CATALOGUE, PANIER, COMMANDES)
    // =========================================================================

    public function test_public_can_list_active_categories(): void
    {
        $response = $this->getJson(route('api.v1.categories.index'));

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Catégories récupérées avec succès.',
            ])
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    '*' => ['id', 'name', 'slug', 'is_active', 'sort_order'],
                ],
            ]);

        $this->assertCount(12, $response->json('data'));
    }

    public function test_public_can_list_products_with_filters(): void
    {
        $response = $this->getJson(route('api.v1.products.index', [
            'category_id' => $this->category->id,
            'search' => 'Urban',
        ]));

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Produits récupérés avec succès.',
            ])
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'data' => [
                        '*' => ['id', 'name', 'slug', 'price', 'promotional_price', 'variants'],
                    ],
                    'pagination' => ['current_page', 'last_page', 'per_page', 'total'],
                ],
            ]);

        $this->assertEquals(1, $response->json('data.pagination.total'));
    }

    public function test_public_can_get_single_product_by_slug(): void
    {
        $response = $this->getJson(route('api.v1.products.show', $this->product->slug));

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $this->product->id,
                    'name' => 'Sweat Capuche Urban Noir',
                    'slug' => 'sweat-capuche-urban-noir',
                    'price' => '350.00',
                    'promotional_price' => '299.00',
                ],
            ]);
    }

    public function test_public_receives_404_for_unknown_or_inactive_product(): void
    {
        $response = $this->getJson(route('api.v1.products.show', 'produit-inexistant'));

        $response->assertNotFound()
            ->assertJson([
                'success' => false,
                'message' => 'Produit introuvable ou indisponible.',
            ]);
    }

    public function test_public_can_estimate_cart(): void
    {
        $payload = [
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'size' => 'M',
                    'color' => 'Noir',
                    'quantity' => 2,
                ],
            ],
        ];

        $response = $this->postJson(route('api.v1.cart.estimate'), $payload);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'subtotal' => '598.00',
                    'delivery_fee' => '0.00',
                    'total' => '598.00',
                ],
            ]);
    }

    public function test_public_can_submit_order_and_receives_confirmation_data(): void
    {
        $token = 'test_order_token_'.uniqid();

        $payload = [
            'customer_name' => 'Hamza Amrani',
            'customer_phone' => '0661234567',
            'city' => 'Casablanca',
            'address' => '25 Rue Mohamed V, Maarif',
            'idempotency_token' => $token,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'size' => 'M',
                    'color' => 'Noir',
                    'quantity' => 2,
                ],
            ],
        ];

        $response = $this->postJson(route('api.v1.orders.store'), $payload);

        $response->assertCreated()
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'reference',
                    'confirmation_token',
                    'confirmation_url',
                    'order' => ['reference', 'status', 'total', 'items'],
                ],
            ]);

        $reference = $response->json('data.reference');
        $this->assertNotNull($reference);
        $this->assertDatabaseHas('orders', ['reference' => $reference]);

        // Vérifier que le stock n'a PAS diminué à la création (règle de confirmation requise)
        $this->assertEquals(10, $this->variantM->fresh()->stock);

        // Test double-soumission idempotente -> rejet 409
        $responseDuplicate = $this->postJson(route('api.v1.orders.store'), $payload);
        $responseDuplicate->assertStatus(409)
            ->assertJson(['success' => false]);

        // Récupération publique des détails de la commande par son URL signée
        $confirmationUrl = $response->json('data.confirmation_url');
        $confirmationResponse = $this->getJson($confirmationUrl);
        $confirmationResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'reference' => $reference,
                    'status' => 'pending',
                ],
            ]);
    }

    // =========================================================================
    // 2. AUTHENTIFICATION SANCTUM ADMINISTRATEUR
    // =========================================================================

    public function test_admin_login_with_invalid_credentials_returns_401(): void
    {
        $response = $this->postJson(route('api.v1.admin.login'), [
            'email' => 'admin@elbahli.store',
            'password' => 'mauvais-mot-de-passe',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Identifiants de connexion incorrects.',
            ]);
    }

    public function test_visitor_cannot_login_to_admin_api(): void
    {
        $response = $this->postJson(route('api.v1.admin.login'), [
            'email' => 'client@elbahli.store',
            'password' => 'password',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_admin_can_login_and_receive_sanctum_bearer_token(): void
    {
        $response = $this->postJson(route('api.v1.admin.login'), [
            'email' => 'admin@elbahli.store',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'token_type' => 'Bearer',
                    'user' => [
                        'email' => 'admin@elbahli.store',
                        'is_admin' => true,
                    ],
                ],
            ]);

        $token = $response->json('data.token');
        $this->assertNotEmpty($token);

        // Appel protégé avec ce token
        $meResponse = $this->withToken($token)->getJson(route('api.v1.admin.me'));
        $meResponse->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'email' => 'admin@elbahli.store',
                    'is_admin' => true,
                ],
            ]);

        // Déconnexion
        $logoutResponse = $this->withToken($token)->postJson(route('api.v1.admin.logout'));
        $logoutResponse->assertOk()
            ->assertJson(['success' => true]);
    }

    public function test_unauthenticated_request_to_admin_route_returns_401(): void
    {
        $response = $this->getJson(route('api.v1.admin.dashboard'));

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_visitor_with_token_cannot_access_admin_routes(): void
    {
        Sanctum::actingAs($this->visitor);

        $response = $this->getJson(route('api.v1.admin.dashboard'));

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);
    }

    // =========================================================================
    // 3. OPÉRATIONS ADMINISTRATIVES (CRUD CATÉGORIES & PRODUITS)
    // =========================================================================

    public function test_admin_can_manage_categories_via_api(): void
    {
        Sanctum::actingAs($this->admin, ['admin']);

        // 1. Create
        $createRes = $this->postJson(route('api.v1.admin.categories.store'), [
            'name' => 'Accessoires Cuir',
            'is_active' => true,
        ]);
        $createRes->assertCreated();
        $categoryId = $createRes->json('data.id');

        // 2. Update
        $updateRes = $this->putJson(route('api.v1.admin.categories.update', $categoryId), [
            'name' => 'Maroquinerie & Cuir',
            'is_active' => true,
        ]);
        $updateRes->assertOk();

        // 3. Toggle
        $toggleRes = $this->patchJson(route('api.v1.admin.categories.toggle', $categoryId));
        $toggleRes->assertOk();
        $this->assertFalse($toggleRes->json('data.is_active'));

        // 4. Delete empty category
        $deleteRes = $this->deleteJson(route('api.v1.admin.categories.destroy', $categoryId));
        $deleteRes->assertOk();
        $this->assertDatabaseMissing('categories', ['id' => $categoryId]);
    }

    public function test_admin_cannot_delete_category_with_products_via_api(): void
    {
        Sanctum::actingAs($this->admin, ['admin']);

        $response = $this->deleteJson(route('api.v1.admin.categories.destroy', $this->category->id));

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
        $this->assertDatabaseHas('categories', ['id' => $this->category->id]);
    }

    public function test_admin_can_create_product_and_initial_stock_movements_via_api(): void
    {
        Sanctum::actingAs($this->admin, ['admin']);

        $payload = [
            'category_id' => $this->category->id,
            'name' => 'Sweat Zip Oversize',
            'description' => 'Coupe ample moderne.',
            'price' => 380.00,
            'promotional_price' => 320.00,
            'is_active' => true,
            'sizes' => [
                ['color' => 'Gris', 'size' => 'M', 'stock' => 12],
                ['color' => 'Noir', 'size' => 'L', 'stock' => 8],
            ],
        ];

        $response = $this->postJson(route('api.v1.admin.products.store'), $payload);

        $response->assertCreated()
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'Sweat Zip Oversize',
                    'price' => '380.00',
                    'promotional_price' => '320.00',
                    'total_stock' => 20,
                ],
            ]);

        // Vérification des mouvements de stock initial
        $productId = $response->json('data.id');
        $movements = StockMovement::whereHas('variant', fn ($q) => $q->where('product_id', $productId))->get();
        $this->assertCount(2, $movements);
        foreach ($movements as $m) {
            $this->assertEquals(StockMovement::TYPE_INITIAL_STOCK, $m->type);
            $this->assertEquals(0, $m->quantity_before);
        }
    }

    public function test_admin_can_adjust_variant_stock_via_api(): void
    {
        Sanctum::actingAs($this->admin, ['admin']);

        $response = $this->patchJson(route('api.v1.admin.inventory.variants.adjust', $this->variantM->id), [
            'new_stock' => 25,
            'reason' => 'Réception arrivage fournisseur',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'stock' => 25,
                    'movement' => [
                        'quantity_before' => 10,
                        'quantity_delta' => 15,
                        'quantity_after' => 25,
                    ],
                ],
            ]);

        $this->assertEquals(25, $this->variantM->fresh()->stock);
    }

    public function test_admin_can_transition_order_status_and_stock_is_decremented_via_api(): void
    {
        Sanctum::actingAs($this->admin, ['admin']);

        // Créer une commande en attente
        $order = Order::create([
            'reference' => 'EB-ORDCONF123',
            'customer_name' => 'Youssef B.',
            'customer_phone' => '+212611223344',
            'city' => 'Rabat',
            'address' => 'Agdal',
            'status' => OrderStatus::PENDING,
            'subtotal' => '700.00',
            'delivery_fee' => '0.00',
            'total' => '700.00',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'size' => 'M',
            'couleur_copie' => 'Noir',
            'unit_price' => '350.00',
            'quantity' => 2,
            'line_total' => '700.00',
        ]);

        // Stock initial de M = 10
        $this->assertEquals(10, $this->variantM->fresh()->stock);

        // Transition vers CONFIRMED
        $response = $this->patchJson(route('api.v1.admin.orders.status', $order->id), [
            'status' => OrderStatus::CONFIRMED->value,
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'confirmed',
                ],
            ]);

        // Stock décrémenté : 10 - 2 = 8
        $this->assertEquals(8, $this->variantM->fresh()->stock);

        // Mouvement de confirmation enregistré
        $movement = StockMovement::where('order_id', $order->id)->first();
        $this->assertNotNull($movement);
        $this->assertEquals(StockMovement::TYPE_ORDER_CONFIRMATION, $movement->type);
        $this->assertEquals(10, $movement->quantity_before);
        $this->assertEquals(8, $movement->quantity_after);
    }

    // =========================================================================
    // 4. IMPORT CSV VIA API REST
    // =========================================================================

    public function test_admin_can_download_csv_template_via_api(): void
    {
        Sanctum::actingAs($this->admin, ['admin']);

        $response = $this->get(route('api.v1.admin.products.import.template'));

        $response->assertOk();
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_admin_can_preview_and_confirm_csv_import_via_api(): void
    {
        Sanctum::actingAs($this->admin, ['admin']);

        $csvContent = "\xEF\xBB\xBFnom,categorie,prix,prix_promo,description,variantes\n";
        $csvContent .= '"Polo Piqué Noir","Polo",250.00,210.00,"Polo élégant","Noir:M:10|Noir:L:12"'."\n";

        $file = UploadedFile::fake()->createWithContent('import_test.csv', $csvContent);

        // 1. Preview
        $previewRes = $this->postJson(route('api.v1.admin.products.import.preview'), [
            'csv_file' => $file,
        ]);

        $previewRes->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'summary' => [
                        'total' => 1,
                        'valid' => 1,
                        'invalid' => 0,
                    ],
                ],
            ]);

        $token = $previewRes->json('data.token');
        $this->assertNotEmpty($token);

        // 2. Confirm
        $confirmRes = $this->postJson(route('api.v1.admin.products.import.confirm'), [
            'import_token' => $token,
        ]);

        $confirmRes->assertCreated()
            ->assertJson([
                'success' => true,
                'data' => [
                    'created_products' => 1,
                    'created_variants' => 2,
                ],
            ]);

        $newProduct = Product::where('slug', 'polo-pique-noir')->first();
        $this->assertNotNull($newProduct);
        $this->assertEquals(22, $newProduct->total_stock);
    }
}
