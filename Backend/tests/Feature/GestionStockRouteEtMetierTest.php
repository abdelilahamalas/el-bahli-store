<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GestionStockRouteEtMetierTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $client;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'is_admin' => true,
        ]);

        $this->client = User::factory()->create([
            'is_admin' => false,
        ]);

        $this->category = Category::create([
            'name' => 'Polos Homme',
            'slug' => 'polos-homme',
            'is_active' => true,
            'sort_order' => 1,
        ]);
    }

    public function test_route_stock_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/admin/stock');
        $response->assertStatus(401);
    }

    public function test_route_stock_forbidden_for_non_admin(): void
    {
        $response = $this->actingAs($this->client, 'sanctum')
            ->getJson('/api/v1/admin/stock');

        $response->assertStatus(403);
    }

    public function test_route_stock_returns_exact_inventory_and_totals_for_admin(): void
    {
        // Produit 1 : 2 variantes (stock 10 et stock 0 -> 1 en rupture)
        $p1 = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Polo Noir Élégant',
            'slug' => 'polo-noir-elegant',
            'price' => 250.00,
            'is_active' => true,
        ]);
        ProductSize::create([
            'product_id' => $p1->id,
            'size' => 'M',
            'color' => 'Noir',
            'stock' => 10,
            'is_active' => true,
        ]);
        ProductSize::create([
            'product_id' => $p1->id,
            'size' => 'L',
            'color' => 'Noir',
            'stock' => 0,
            'is_active' => true,
        ]);

        // Produit 2 : 1 variante (stock 5)
        $p2 = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Polo Blanc Classique',
            'slug' => 'polo-blanc-classique',
            'price' => 200.00,
            'is_active' => true,
        ]);
        ProductSize::create([
            'product_id' => $p2->id,
            'size' => 'S',
            'color' => 'Blanc',
            'stock' => 5,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/stock');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'inventory' => [
                        'data',
                        'pagination',
                    ],
                    'categories',
                    'stats' => [
                        'total_products',
                        'total_units',
                        'out_of_stock_count',
                    ],
                    'filters',
                ],
            ]);

        $stats = $response->json('data.stats');
        $this->assertEquals(2, $stats['total_products']);
        $this->assertEquals(15, $stats['total_units']); // 10 + 0 + 5 = 15
        $this->assertEquals(1, $stats['out_of_stock_count']); // 1 variante à 0
    }

    public function test_order_lifecycle_impact_on_stock(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Polo Marine',
            'slug' => 'polo-marine',
            'price' => 300.00,
            'is_active' => true,
        ]);

        $variantM = ProductSize::create([
            'product_id' => $product->id,
            'size' => 'M',
            'color' => 'Standard',
            'stock' => 10,
            'is_active' => true,
        ]);

        // 1. Création commande pending (2 unités)
        $order = Order::create([
            'reference' => 'CMD-STOCK-001',
            'customer_name' => 'Youssef El Alami',
            'customer_phone' => '0612345678',
            'city' => 'Casablanca',
            'address' => 'Boulevard d\'Anfa',
            'subtotal' => 600.00,
            'delivery_fee' => 0.00,
            'total' => 600.00,
            'status' => 'pending',
            'payment_method' => 'cod',
            'payment_status' => 'pending',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'size' => 'M',
            'couleur_copie' => 'Standard',
            'unit_price' => 300.00,
            'quantity' => 2,
            'line_total' => 600.00,
        ]);

        // Vérification 1 : En attente -> le stock n'a PAS diminué
        $this->assertEquals(10, $variantM->fresh()->stock);

        // 2. Confirmation de la commande (pending -> confirmed)
        $confirmResponse = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/orders/{$order->id}/status", [
                'status' => 'confirmed',
            ]);
        $confirmResponse->assertStatus(200);

        // Vérification 2 : Après confirmation -> le stock a diminué de 2 (10 - 2 = 8)
        $this->assertEquals(8, $variantM->fresh()->stock);

        // 3. Annulation de la commande confirmée (confirmed -> cancelled)
        $cancelResponse = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/orders/{$order->id}/status", [
                'status' => 'cancelled',
                'reason' => 'Annulation par le client',
            ]);
        $cancelResponse->assertStatus(200);

        // Vérification 3 : Après annulation -> le stock revient à 10
        $this->assertEquals(10, $variantM->fresh()->stock);
    }
}
