<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\InventoryService;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class GestionStockEtTaillesTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Category $category;

    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'is_admin' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Jeans',
            'slug' => 'jeans',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Jean classique',
            'slug' => 'jean-classique',
            'description' => 'Superbe jean classique en denim premium',
            'price' => 350.00,
            'is_active' => true,
        ]);
    }

    /**
     * 1. Un produit possède plusieurs tailles.
     */
    public function test_produit_possede_plusieurs_tailles(): void
    {
        $tailles = ['S', 'M', 'L', 'XL', 'XXL'];
        foreach ($tailles as $taille) {
            ProductSize::create([
                'product_id' => $this->product->id,
                'size' => $taille,
                'color' => 'Brut',
                'stock' => 5,
            ]);
        }

        $this->assertCount(5, $this->product->fresh()->sizes);
        $this->assertSame(['S', 'M', 'L', 'XL', 'XXL'], $this->product->fresh()->sizes->pluck('size')->toArray());
    }

    /**
     * 2. Chaque taille possède un stock indépendant.
     */
    public function test_chaque_taille_possede_un_stock_independant(): void
    {
        $vS = ProductSize::create(['product_id' => $this->product->id, 'size' => 'S', 'color' => 'Standard', 'stock' => 8]);
        $vM = ProductSize::create(['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Standard', 'stock' => 5]);
        $vL = ProductSize::create(['product_id' => $this->product->id, 'size' => 'L', 'color' => 'Standard', 'stock' => 2]);
        $vXL = ProductSize::create(['product_id' => $this->product->id, 'size' => 'XL', 'color' => 'Standard', 'stock' => 0]);
        $vXXL = ProductSize::create(['product_id' => $this->product->id, 'size' => 'XXL', 'color' => 'Standard', 'stock' => 4]);

        $this->assertSame(8, $vS->fresh()->stock);
        $this->assertSame(5, $vM->fresh()->stock);
        $this->assertSame(2, $vL->fresh()->stock);
        $this->assertSame(0, $vXL->fresh()->stock);
        $this->assertSame(4, $vXXL->fresh()->stock);
        $this->assertSame(19, $this->product->fresh()->total_stock);
    }

    /**
     * 3. Les couleurs possèdent un stock indépendant si elles sont activées.
     */
    public function test_couleurs_possedent_un_stock_independant(): void
    {
        $noir = ProductSize::create(['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Noir', 'stock' => 10]);
        $bleu = ProductSize::create(['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Bleu', 'stock' => 3]);

        $this->assertNotSame($noir->id, $bleu->id);
        $this->assertSame(10, $noir->fresh()->stock);
        $this->assertSame(3, $bleu->fresh()->stock);

        // Ajuster uniquement le stock de bleu ne doit pas affecter le noir
        $noir->decrement('stock', 4);
        $this->assertSame(6, $noir->fresh()->stock);
        $this->assertSame(3, $bleu->fresh()->stock);
    }

    /**
     * 4. Une taille avec stock zéro est indisponible (is_in_stock = false).
     */
    public function test_taille_avec_stock_zero_est_indisponible(): void
    {
        ProductSize::create(['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Standard', 'stock' => 5]);
        ProductSize::create(['product_id' => $this->product->id, 'size' => 'XL', 'color' => 'Standard', 'stock' => 0]);

        $response = $this->getJson(route('api.v1.products.show', $this->product->slug));
        $response->assertOk();

        $variants = collect($response->json('data.variants'));
        $variantM = $variants->firstWhere('size', 'M');
        $variantXL = $variants->firstWhere('size', 'XL');

        $this->assertTrue($variantM['is_in_stock']);
        $this->assertFalse($variantXL['is_in_stock']);
    }

    /**
     * 5. Une estimation de panier refuse une taille épuisée.
     */
    public function test_estimation_panier_signale_taille_epuisee(): void
    {
        ProductSize::create(['product_id' => $this->product->id, 'size' => 'XL', 'color' => 'Standard', 'stock' => 0]);

        $response = $this->postJson(route('api.v1.cart.estimate'), [
            'items' => [
                ['product_id' => $this->product->id, 'size' => 'XL', 'color' => 'Standard', 'quantity' => 1],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.is_valid', false)
            ->assertJsonPath('data.items.0.is_available', false)
            ->assertJsonPath('data.items.0.available_stock', 0);

        $this->assertStringContainsString('XL', $response->json('data.items.0.error_message'));
    }

    /**
     * 6. Une commande refuse une quantité supérieure au stock disponible (HTTP 422).
     */
    public function test_commande_refuse_quantite_superieure_au_stock(): void
    {
        ProductSize::create(['product_id' => $this->product->id, 'size' => 'L', 'color' => 'Standard', 'stock' => 2]);

        $response = $this->postJson(route('api.v1.orders.store'), [
            'customer_name' => 'Amine Tazi',
            'customer_phone' => '0661223344',
            'city' => 'Casablanca',
            'address' => 'Gauthier',
            'idempotency_token' => 'token-test-stock-depasse-1',
            'items' => [
                ['product_id' => $this->product->id, 'size' => 'L', 'color' => 'Standard', 'quantity' => 5],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items']);

        $errorMsg = $response->json('errors.items.0');
        $this->assertStringContainsString('Stock insuffisant', $errorMsg);
        $this->assertStringContainsString('Quantité disponible : 2', $errorMsg);
    }

    /**
     * 7. La soumission d'une commande ne décrémente pas le stock.
     */
    public function test_soumission_commande_ne_decremente_pas_le_stock(): void
    {
        $variant = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'M',
            'color' => 'Standard',
            'stock' => 10,
        ]);

        $response = $this->postJson(route('api.v1.orders.store'), [
            'customer_name' => 'Karim Idrissi',
            'customer_phone' => '0661334455',
            'city' => 'Rabat',
            'address' => 'Agdal',
            'idempotency_token' => 'token-test-pending-stock',
            'items' => [
                ['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Standard', 'quantity' => 3],
            ],
        ]);

        $response->assertStatus(201);
        $this->assertSame(10, $variant->fresh()->stock, 'Le stock doit rester à 10 tant que la commande est pending.');
    }

    /**
     * 8. La confirmation décrémente la bonne variante.
     */
    public function test_confirmation_decremente_la_bonne_variante(): void
    {
        $vM = ProductSize::create(['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Standard', 'stock' => 10]);
        $vL = ProductSize::create(['product_id' => $this->product->id, 'size' => 'L', 'color' => 'Standard', 'stock' => 8]);

        /** @var OrderService $orderService */
        $orderService = app(OrderService::class);
        $order = $orderService->createOrder([
            'customer_name' => 'Youssef Berrada',
            'customer_phone' => '0661445566',
            'city' => 'Marrakech',
            'address' => 'Gueliz',
        ], [
            ['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Standard', 'quantity' => 4],
        ]);

        $this->assertSame(10, $vM->fresh()->stock);

        // Confirmation par l'admin
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson(route('api.v1.admin.orders.status', $order->id), [
                'status' => 'confirmed',
                'reason' => 'Appel téléphonique validé avec le client',
            ])->assertOk();

        $this->assertSame(6, $vM->fresh()->stock, 'Le stock de la taille M doit être décrémenté de 4.');
        $this->assertSame(8, $vL->fresh()->stock, 'Le stock de la taille L ne doit pas changer.');

        $this->assertDatabaseHas('stock_movements', [
            'product_size_id' => $vM->id,
            'type' => StockMovement::TYPE_ORDER_CONFIRMATION,
            'quantity_delta' => -4,
        ]);
    }

    /**
     * 9. L'annulation restaure le stock une seule fois (idempotence).
     */
    public function test_annulation_restaure_le_stock_une_seule_fois(): void
    {
        $variant = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'S',
            'color' => 'Standard',
            'stock' => 5,
        ]);

        /** @var OrderService $orderService */
        $orderService = app(OrderService::class);
        $order = $orderService->createOrder([
            'customer_name' => 'Nadia Benali',
            'customer_phone' => '0661556677',
            'city' => 'Tanger',
            'address' => 'Malabata',
        ], [
            ['product_id' => $this->product->id, 'size' => 'S', 'color' => 'Standard', 'quantity' => 2],
        ]);

        // Confirmation -> stock passe à 3
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson(route('api.v1.admin.orders.status', $order->id), [
                'status' => 'confirmed',
            ])->assertOk();

        $this->assertSame(3, $variant->fresh()->stock);

        // Annulation -> stock restauré à 5
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson(route('api.v1.admin.orders.status', $order->id), [
                'status' => 'cancelled',
                'reason' => 'Client indisponible',
            ])->assertOk();

        $this->assertSame(5, $variant->fresh()->stock);

        // Tentative de re-transition ou double annulation ne doit pas doubler la restitution
        /** @var InventoryService $inventoryService */
        $inventoryService = app(InventoryService::class);
        $inventoryService->restoreOrderStock($order->fresh());
        $this->assertSame(5, $variant->fresh()->stock, 'Le stock ne doit jamais être restauré une seconde fois.');
    }

    /**
     * 10. Les retours revendables réintègrent le stock.
     */
    public function test_retours_revendables_reintegrent_le_stock(): void
    {
        $variant = ProductSize::create(['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Standard', 'stock' => 10]);

        $order = Order::create([
            'reference' => 'CMD-RET-10',
            'customer_name' => 'Said Alami',
            'customer_phone' => '0661778899',
            'city' => 'Fes',
            'address' => 'Atlas',
            'status' => OrderStatus::DELIVERED,
            'payment_status' => PaymentStatus::PAID,
            'subtotal' => '700.00',
            'delivery_fee' => '0.00',
            'total' => '700.00',
        ]);

        $item = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'size' => 'M',
            'couleur_copie' => 'Standard',
            'unit_price' => '350.00',
            'quantity' => 2,
            'line_total' => '700.00',
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson(route('api.v1.admin.orders.returns', $order->id), [
                'returns' => [
                    [
                        'order_item_id' => $item->id,
                        'quantity_returned' => 2,
                        'quantity_resellable' => 2,
                        'quantity_damaged' => 0,
                        'reason' => 'Taille non ajustée au client, article intact',
                    ],
                ],
            ])->assertOk();

        $this->assertSame(12, $variant->fresh()->stock, 'Le stock doit passer de 10 à 12 après réintégration.');
    }

    /**
     * 11. Les retours endommagés ne réintègrent pas le stock.
     */
    public function test_retours_endommages_ne_reintegrent_pas_le_stock(): void
    {
        $variant = ProductSize::create(['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Standard', 'stock' => 10]);

        $order = Order::create([
            'reference' => 'CMD-RET-DAMAGED',
            'customer_name' => 'Hassan Oualid',
            'customer_phone' => '0661889900',
            'city' => 'Kenitra',
            'address' => 'Centre',
            'status' => OrderStatus::DELIVERED,
            'payment_status' => PaymentStatus::PAID,
            'subtotal' => '700.00',
            'delivery_fee' => '0.00',
            'total' => '700.00',
        ]);

        $item = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'size' => 'M',
            'couleur_copie' => 'Standard',
            'unit_price' => '350.00',
            'quantity' => 2,
            'line_total' => '700.00',
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson(route('api.v1.admin.orders.returns', $order->id), [
                'returns' => [
                    [
                        'order_item_id' => $item->id,
                        'quantity_returned' => 2,
                        'quantity_resellable' => 0,
                        'quantity_damaged' => 2,
                        'reason' => 'Tissu déchiré lors de l\'essayage',
                    ],
                ],
            ])->assertOk();

        $this->assertSame(10, $variant->fresh()->stock, 'Les articles endommagés ne doivent JAMAIS réintégrer le stock vendable.');
    }

    /**
     * 12. Les ajustements manuels sont tracés avec le motif obligatoire.
     */
    public function test_ajustement_manuel_avec_motif_obligatoire(): void
    {
        $variant = ProductSize::create(['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Standard', 'stock' => 5]);

        // Sans motif -> échec 422
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson(route('api.v1.admin.inventory.variants.adjust', $variant->id), [
                'new_stock' => 15,
            ])->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);

        // Avec motif -> succès 200
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson(route('api.v1.admin.inventory.variants.adjust', $variant->id), [
                'new_stock' => 15,
                'reason' => 'Comptage physique en entrepôt',
            ])->assertOk()
            ->assertJsonPath('data.stock', 15);

        $this->assertDatabaseHas('stock_movements', [
            'product_size_id' => $variant->id,
            'user_id' => $this->admin->id,
            'type' => StockMovement::TYPE_MANUAL_ADJUSTMENT,
            'quantity_before' => 5,
            'quantity_delta' => 10,
            'quantity_after' => 15,
            'reason' => 'Comptage physique en entrepôt',
        ]);
    }

    /**
     * 13. Concurrence et verrouillage de ligne (lockForUpdate).
     */
    public function test_concurrence_sur_le_dernier_article_disponible(): void
    {
        $variant = ProductSize::create(['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Standard', 'stock' => 1]);

        $order1 = Order::create([
            'reference' => 'CMD-CONC-1',
            'customer_name' => 'Client 1',
            'customer_phone' => '0661111111',
            'city' => 'Casablanca',
            'address' => 'Maarif',
            'status' => OrderStatus::PENDING,
            'subtotal' => '350.00',
            'delivery_fee' => '0.00',
            'total' => '350.00',
        ]);
        OrderItem::create([
            'order_id' => $order1->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'size' => 'M',
            'quantity' => 1,
            'unit_price' => '350.00',
            'line_total' => '350.00',
        ]);

        $order2 = Order::create([
            'reference' => 'CMD-CONC-2',
            'customer_name' => 'Client 2',
            'customer_phone' => '0662222222',
            'city' => 'Rabat',
            'address' => 'Agdal',
            'status' => OrderStatus::PENDING,
            'subtotal' => '350.00',
            'delivery_fee' => '0.00',
            'total' => '350.00',
        ]);
        OrderItem::create([
            'order_id' => $order2->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'size' => 'M',
            'quantity' => 1,
            'unit_price' => '350.00',
            'line_total' => '350.00',
        ]);

        /** @var InventoryService $inventoryService */
        $inventoryService = app(InventoryService::class);

        // Confirmation de la commande 1 -> réussit et le stock passe à 0
        $inventoryService->confirmOrderStock($order1, $this->admin->id);
        $this->assertSame(0, $variant->fresh()->stock);

        // Confirmation de la commande 2 -> doit lever une exception de stock insuffisant
        $this->expectException(ValidationException::class);
        $inventoryService->confirmOrderStock($order2, $this->admin->id);
    }

    /**
     * 14. Le dashboard affiche des quantités cohérentes.
     */
    public function test_dashboard_affiche_des_quantites_coherentes(): void
    {
        ProductSize::create(['product_id' => $this->product->id, 'size' => 'S', 'color' => 'Standard', 'stock' => 10]);
        ProductSize::create(['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Standard', 'stock' => 2]); // stock faible (<= 5)
        ProductSize::create(['product_id' => $this->product->id, 'size' => 'XL', 'color' => 'Standard', 'stock' => 0]); // rupture

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson(route('api.v1.admin.dashboard'));

        $response->assertOk();

        $kpis = $response->json('data.kpis');
        $this->assertSame(12, $kpis['total_stock']);
        $this->assertSame(3, $kpis['total_variants']);
        $this->assertSame(2, $kpis['available_variants']);
        $this->assertSame(1, $kpis['out_of_stock_variants']);
        $this->assertSame(1, $kpis['low_stock_variants']);

        $this->assertNotEmpty($response->json('data.stock_by_size'));
        $this->assertNotEmpty($response->json('data.stock_by_color'));
    }

    /**
     * Test de désactivation / activation directe d'une variante.
     */
    public function test_admin_peut_activer_desactiver_une_variante(): void
    {
        $variant = ProductSize::create(['product_id' => $this->product->id, 'size' => 'L', 'color' => 'Standard', 'stock' => 5, 'is_active' => true]);

        // Toggle vers inactif
        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson(route('api.v1.admin.inventory.variants.toggle', $variant->id));

        $response->assertOk()
            ->assertJsonPath('data.is_active', false);
        $this->assertFalse($variant->fresh()->is_active);

        // Toggle vers actif
        $response2 = $this->actingAs($this->admin, 'sanctum')
            ->patchJson(route('api.v1.admin.inventory.variants.toggle', $variant->id));

        $response2->assertOk()
            ->assertJsonPath('data.is_active', true);
        $this->assertTrue($variant->fresh()->is_active);
    }

    /**
     * Test d'ajout d'une nouvelle variante taille / couleur.
     */
    public function test_admin_peut_ajouter_une_nouvelle_variante(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson(route('api.v1.admin.products.variants.store', $this->product->id), [
                'size' => 'XXL',
                'color' => 'Bleu Vintage',
                'stock' => 7,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.size', 'XXL')
            ->assertJsonPath('data.color', 'Bleu Vintage')
            ->assertJsonPath('data.stock', 7);

        $this->assertDatabaseHas('product_sizes', [
            'product_id' => $this->product->id,
            'size' => 'XXL',
            'color' => 'Bleu Vintage',
            'stock' => 7,
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'type' => StockMovement::TYPE_INITIAL_STOCK,
            'quantity_delta' => 7,
        ]);
    }
}
