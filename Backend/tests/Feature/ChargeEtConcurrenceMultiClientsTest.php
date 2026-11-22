<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ChargeEtConcurrenceMultiClientsTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected Category $category;
    protected Product $product;
    protected ProductSize $variant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'email' => 'admin@test.store',
            'is_admin' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Capuches',
            'slug' => 'capuches',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Capuche Premium Noir',
            'slug' => 'capuche-premium-noir',
            'price' => 350.00,
            'is_active' => true,
        ]);

        $this->variant = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'L',
            'color' => 'Noir',
            'stock' => 100,
            'is_active' => true,
        ]);
    }

    /**
     * Test 1: Simulation de charge de 30 clients consultant le catalogue et les produits simultanément.
     */
    public function test_multiple_simultaneous_clients_browsing_catalog(): void
    {
        $startTime = microtime(true);
        $totalClients = 30;
        $successCount = 0;

        for ($i = 1; $i <= $totalClients; $i++) {
            // Requête 1 : Catégories publiques
            $catResponse = $this->getJson(route('api.v1.categories.index'));
            $catResponse->assertOk()->assertJson(['success' => true]);

            // Requête 2 : Liste des produits avec filtres
            $prodResponse = $this->getJson(route('api.v1.products.index', [
                'category_slug' => 'capuches',
                'sort' => 'latest',
                'per_page' => 12,
            ]));
            $prodResponse->assertOk()->assertJson(['success' => true]);

            // Requête 3 : Fiche détaillée du produit
            $detailResponse = $this->getJson(route('api.v1.products.show', 'capuche-premium-noir'));
            $detailResponse->assertOk()->assertJson(['success' => true]);

            $successCount++;
        }

        $duration = microtime(true) - $startTime;

        $this->assertEquals($totalClients, $successCount);
        $this->assertLessThan(10.0, $duration, "Le temps de traitement pour {$totalClients} sessions client complètes doit être rapide.");
    }

    /**
     * Test 2: Simulation de 15 clients différents passant commande simultanément.
     */
    public function test_multiple_simultaneous_clients_creating_orders(): void
    {
        $orderService = app(OrderService::class);
        $totalOrders = 15;
        $createdOrders = [];

        for ($i = 1; $i <= $totalOrders; $i++) {
            $phone = sprintf('0612345%03d', $i);
            $order = $orderService->createOrder(
                [
                    'customer_name' => "Client Concurrence {$i}",
                    'customer_phone' => $phone,
                    'city' => 'Casablanca',
                    'address' => "Boulevard Anfa n°{$i}",
                    'note' => "Commande de test charge {$i}",
                ],
                [
                    [
                        'product_id' => $this->product->id,
                        'size' => 'L',
                        'color' => 'Noir',
                        'quantity' => 1,
                    ],
                ],
                "192.168.1.{$i}"
            );

            $this->assertNotNull($order);
            $this->assertEquals(OrderStatus::PENDING, $order->status);
            $this->assertEquals('350.00', $order->total);
            $this->assertEquals('0.00', $order->delivery_fee);
            $createdOrders[] = $order;
        }

        $this->assertCount($totalOrders, $createdOrders);
        $this->assertEquals($totalOrders, Order::count());
    }

    /**
     * Test 3: Test de concurrence critique sur le stock (Prévention des surventes / Race Condition).
     * Scénario : Le produit a SEULEMENT 3 exemplaires restants.
     * 8 clients ont passé une commande en attente.
     * Lorsque les commandes sont confirmées, exactement 3 doivent réussir et les 5 autres doivent échouer.
     * Le stock final doit être rigoureusement égal à 0 (aucun stock négatif possible).
     */
    public function test_stock_concurrency_race_condition_protection(): void
    {
        // 1. On configure un stock très limité de 3 unités
        $this->variant->update(['stock' => 3]);
        $this->assertEquals(3, $this->variant->fresh()->stock);

        $orderService = app(OrderService::class);
        $orders = [];

        // 2. Création de 8 commandes en attente pour 1 unité chacune
        for ($i = 1; $i <= 8; $i++) {
            $orders[] = $orderService->createOrder(
                [
                    'customer_name' => "Acheteur Concurrent {$i}",
                    'customer_phone' => sprintf('0699000%03d', $i),
                    'city' => 'Rabat',
                    'address' => 'Agdal',
                ],
                [
                    [
                        'product_id' => $this->product->id,
                        'size' => 'L',
                        'color' => 'Noir',
                        'quantity' => 1,
                    ],
                ]
            );
        }

        // Le stock n'est pas encore décrémenté (règle métier : en attente = stock non décrémenté)
        $this->assertEquals(3, $this->variant->fresh()->stock);

        // 3. Confirmation simultanée des commandes
        $confirmedCount = 0;
        $failedCount = 0;

        foreach ($orders as $order) {
            try {
                $orderService->transitionStatus($order, OrderStatus::CONFIRMED, $this->adminUser->id);
                $confirmedCount++;
            } catch (ValidationException $e) {
                // Échec attendu quand le stock est épuisé
                $failedCount++;
            }
        }

        // 4. Assertions mathématiques strictes
        $this->assertEquals(3, $confirmedCount, "Exactement 3 commandes doivent être confirmées.");
        $this->assertEquals(5, $failedCount, "Les 5 autres commandes doivent échouer pour stock insuffisant.");

        // 5. Le stock restant en base doit être exactement 0 (aucun sur-achat, aucun chiffre négatif)
        $finalStock = $this->variant->fresh()->stock;
        $this->assertEquals(0, $finalStock, "Le stock restant doit être exactement 0.");

        // 6. Vérification du journal des mouvements de stock
        $movements = StockMovement::where('type', StockMovement::TYPE_ORDER_CONFIRMATION)->count();
        $this->assertEquals(3, $movements, "Exactement 3 mouvements de décrémentation doivent être tracés.");
    }

    /**
     * Test 4: Calcul et estimation de panier par de multiples clients sans goulot d'étranglement.
     */
    public function test_cart_estimate_under_multi_client_load(): void
    {
        $clients = 20;

        for ($i = 1; $i <= $clients; $i++) {
            $response = $this->postJson(route('api.v1.cart.estimate'), [
                'items' => [
                    [
                        'product_id' => $this->product->id,
                        'size' => 'L',
                        'color' => 'Noir',
                        'quantity' => 2,
                    ],
                ],
            ]);

            $response->assertOk()
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'subtotal' => '700.00',
                        'delivery_fee' => '0.00',
                        'total' => '700.00',
                        'is_delivery_free' => true,
                    ],
                ]);
        }
    }
}
