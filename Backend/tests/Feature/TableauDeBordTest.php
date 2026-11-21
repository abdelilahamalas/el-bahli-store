<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TableauDeBordTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_api_dashboard()
    {
        $response = $this->getJson(route('api.v1.admin.dashboard'));
        $response->assertStatus(401);
    }

    public function test_non_admin_users_cannot_access_api_dashboard()
    {
        $user = User::factory()->create(['is_admin' => false]);
        Sanctum::actingAs($user);

        $response = $this->getJson(route('api.v1.admin.dashboard'));
        $response->assertForbidden();
    }

    public function test_admin_users_can_access_api_dashboard()
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin, ['admin']);

        $response = $this->getJson(route('api.v1.admin.dashboard'));
        $response->assertOk()
            ->assertJson(['success' => true]);
    }

    public function test_admin_can_access_dashboard_with_orders_and_period_filter(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin, ['admin']);

        $category = \App\Models\Category::create([
            'name' => 'T-Shirts',
            'slug' => 't-shirts',
            'is_active' => true,
        ]);

        $product = \App\Models\Product::create([
            'category_id' => $category->id,
            'name' => 'T-Shirt Noir',
            'slug' => 't-shirt-noir',
            'price' => 199.00,
            'is_active' => true,
        ]);

        $product->images()->create([
            'chemin_image' => 'products/test.jpg',
            'est_principale' => true,
            'ordre_affichage' => 1,
        ]);

        $order = \App\Models\Order::create([
            'reference' => 'CMD-2026-TEST',
            'customer_name' => 'Test Client',
            'customer_phone' => '0611223344',
            'city' => 'Tanger',
            'address' => 'Boulevard Pasteur',
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_method' => 'cash_on_delivery',
            'delivery_fee' => 0.00,
            'subtotal' => 199.00,
            'total' => 199.00,
        ]);

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'size' => 'M',
            'couleur_copie' => 'Noir',
            'unit_price' => 199.00,
            'quantity' => 1,
            'line_total' => 199.00,
        ]);

        $response = $this->getJson('/api/v1/admin/dashboard?period=month');
        $response->assertOk()
            ->assertJson(['success' => true])
            ->assertJsonPath('data.period.type', 'month')
            ->assertJsonCount(1, 'data.recent_orders');

        $recentOrder = $response->json('data.recent_orders.0');
        $this->assertEquals('CMD-2026-TEST', $recentOrder['reference']);
        $this->assertStringContainsString('products/test.jpg', $recentOrder['items'][0]['product_image']);
    }
}
