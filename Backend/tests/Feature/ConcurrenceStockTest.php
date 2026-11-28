<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class ConcurrenceStockTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Category $category;
    private Product $product;
    private ProductSize $variantUnique;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();

        $this->admin = User::factory()->create([
            'email' => 'admin@elbahli.store',
            'is_admin' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Vestes Homme',
            'slug' => 'vestes-homme',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Veste Cuir Édition Limitée',
            'slug' => 'veste-cuir-edition-limitee',
            'price' => 899.00,
            'is_active' => true,
        ]);

        // Stock initial de EXACTEMENT 1 pièce
        $this->variantUnique = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'L',
            'color' => 'Noir',
            'stock' => 1,
            'is_active' => true,
        ]);
    }

    /**
     * Deux commandes pour le dernier article :
     * La 1re confirmation réussit (stock -> 0),
     * La 2e confirmation échoue proprement avec 422 et message clair,
     * Le stock final reste strictement à 0 (jamais négatif).
     */
    public function test_concurrent_order_confirmation_prevents_negative_stock(): void
    {
        // Commande 1 (1 article)
        $order1 = Order::create([
            'reference' => 'CMD-CONCUR-001',
            'customer_name' => 'Client A',
            'customer_phone' => '0611111111',
            'city' => 'Casablanca',
            'address' => 'Maarif',
            'subtotal' => 899.00,
            'delivery_fee' => 0.00,
            'total' => 899.00,
            'status' => 'pending',
            'payment_method' => 'cod',
            'payment_status' => 'pending',
        ]);
        OrderItem::create([
            'order_id' => $order1->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'size' => 'L',
            'couleur_copie' => 'Noir',
            'unit_price' => 899.00,
            'quantity' => 1,
            'line_total' => 899.00,
        ]);

        // Commande 2 (1 article)
        $order2 = Order::create([
            'reference' => 'CMD-CONCUR-002',
            'customer_name' => 'Client B',
            'customer_phone' => '0622222222',
            'city' => 'Rabat',
            'address' => 'Agdal',
            'subtotal' => 899.00,
            'delivery_fee' => 0.00,
            'total' => 899.00,
            'status' => 'pending',
            'payment_method' => 'cod',
            'payment_status' => 'pending',
        ]);
        OrderItem::create([
            'order_id' => $order2->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'size' => 'L',
            'couleur_copie' => 'Noir',
            'unit_price' => 899.00,
            'quantity' => 1,
            'line_total' => 899.00,
        ]);

        // 1. L'administrateur confirme la commande 1 -> Doit RÉUSSIR
        $res1 = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/v1/admin/orders/{$order1->id}/status", [
            'status' => 'confirmed',
        ]);
        $res1->assertStatus(200);

        // Vérification intermédiaire : le stock est tombé à 0
        $this->assertEquals(0, $this->variantUnique->fresh()->stock);
        $this->assertEquals('confirmed', $order1->fresh()->status->value);

        // 2. L'administrateur tente de confirmer la commande 2 -> Doit ÉCHOUER proprement
        $res2 = $this->actingAs($this->admin, 'sanctum')->patchJson("/api/v1/admin/orders/{$order2->id}/status", [
            'status' => 'confirmed',
        ]);

        $res2->assertStatus(422)
            ->assertJsonValidationErrors(['stock']);

        // Vérification de sécurité : le message en français est clair
        $errorMessage = $res2->json('errors.stock.0');
        $this->assertStringContainsString('Stock insuffisant', $errorMessage);
        $this->assertStringContainsString('stock disponible : 0', $errorMessage);

        // Le stock final reste STRICTEMENT à 0 (jamais négatif !)
        $this->assertEquals(0, $this->variantUnique->fresh()->stock);

        // La commande 2 reste en attente (pending)
        $this->assertEquals('pending', $order2->fresh()->status->value);
    }

    /**
     * Même jeton d'idempotence envoyé deux fois très vite -> une seule commande créée, seconde renvoie 409.
     */
    public function test_same_idempotency_token_creates_only_one_order(): void
    {
        $idempotencyToken = 'idem_rapid_fire_'.uniqid();

        $payload = [
            'customer_name' => 'Client Rapide',
            'customer_phone' => '0612345678',
            'city' => 'Casablanca',
            'address' => 'Boulevard d\'Anfa',
            'idempotency_token' => $idempotencyToken,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'size' => 'L',
                    'color' => 'Noir',
                    'quantity' => 1,
                ],
            ],
        ];

        // 1er envoi -> Succès 201 Created
        $res1 = $this->postJson('/api/v1/orders', $payload);
        $res1->assertStatus(201);

        $initialOrderCount = Order::where('reference', $res1->json('data.reference'))->count();
        $this->assertEquals(1, $initialOrderCount);

        // 2e envoi immédiat avec le MÊME jeton d'idempotence -> Rejet 409 Conflict
        $res2 = $this->postJson('/api/v1/orders', $payload);
        $res2->assertStatus(409)
            ->assertJson([
                'success' => false,
            ]);

        // Aucune commande supplémentaire n'a été insérée
        $this->assertEquals(1, Order::where('reference', $res1->json('data.reference'))->count());
    }
}
