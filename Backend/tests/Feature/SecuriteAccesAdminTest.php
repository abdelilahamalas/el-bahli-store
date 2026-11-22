<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecuriteAccesAdminTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected User $normalUser;

    protected Category $category;

    protected Product $product;

    protected Order $order;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'email' => 'admin@test.store',
            'is_admin' => true,
        ]);

        $this->normalUser = User::factory()->create([
            'email' => 'client@test.com',
            'is_admin' => false,
        ]);

        $this->category = Category::create([
            'name' => 'Capuches',
            'slug' => 'capuches',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Hoodie Test',
            'slug' => 'hoodie-test',
            'price' => 200.00,
            'is_active' => true,
        ]);

        ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'L',
            'stock' => 10,
        ]);

        $this->order = Order::create([
            'reference' => 'EB-TEST1234',
            'customer_name' => 'Mohamed',
            'customer_phone' => '+212612345678',
            'city' => 'Casablanca',
            'address' => 'Maarif',
            'status' => OrderStatus::PENDING,
            'subtotal' => '200.00',
            'delivery_fee' => '0.00',
            'total' => '200.00',
        ]);
    }

    public function test_guest_is_rejected_with_401_on_admin_api_routes(): void
    {
        $adminRoutes = [
            route('api.v1.admin.dashboard'),
            route('api.v1.admin.categories.index'),
            route('api.v1.admin.products.index'),
            route('api.v1.admin.orders.index'),
            route('api.v1.admin.orders.show', $this->order),
            route('api.v1.admin.settings.show'),
            route('api.v1.admin.audit-logs.index'),
        ];

        foreach ($adminRoutes as $url) {
            $response = $this->getJson($url);
            $response->assertStatus(401)
                ->assertJson(['success' => false]);
        }
    }

    public function test_non_admin_gets_403_on_admin_api_routes(): void
    {
        $adminRoutes = [
            route('api.v1.admin.dashboard'),
            route('api.v1.admin.categories.index'),
            route('api.v1.admin.products.index'),
            route('api.v1.admin.orders.index'),
            route('api.v1.admin.orders.show', $this->order),
            route('api.v1.admin.settings.show'),
            route('api.v1.admin.audit-logs.index'),
        ];

        foreach ($adminRoutes as $url) {
            $response = $this->actingAs($this->normalUser, 'sanctum')->getJson($url);
            $response->assertStatus(403)
                ->assertJson(['success' => false]);
        }
    }

    public function test_admin_is_accepted_on_every_admin_api_route(): void
    {
        $adminRoutes = [
            route('api.v1.admin.dashboard'),
            route('api.v1.admin.categories.index'),
            route('api.v1.admin.products.index'),
            route('api.v1.admin.orders.index'),
            route('api.v1.admin.orders.show', $this->order),
            route('api.v1.admin.settings.show'),
            route('api.v1.admin.audit-logs.index'),
        ];

        foreach ($adminRoutes as $url) {
            $response = $this->actingAs($this->adminUser, 'sanctum')->getJson($url);
            $response->assertOk()
                ->assertJson(['success' => true]);
        }
    }

    public function test_public_registration_is_inaccessible(): void
    {
        // Registration route must return 404
        $response = $this->get('/register');
        $response->assertNotFound();

        $postResponse = $this->post('/register', [
            'name' => 'Hacker',
            'email' => 'hacker@example.com',
            'password' => 'password123456',
        ]);
        $postResponse->assertNotFound();
    }

    public function test_category_cannot_be_deleted(): void
    {
        // Une catégorie contenant des produits ne peut jamais être supprimée
        $response = $this->actingAs($this->adminUser, 'sanctum')->deleteJson(route('api.v1.admin.categories.destroy', $this->category->id));
        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Impossible de supprimer une catégorie contenant des produits. Veuillez d’abord réassigner ou supprimer ses produits.',
            ]);
        $this->assertDatabaseHas('categories', ['id' => $this->category->id]);
    }

    public function test_security_headers_are_present(): void
    {
        $response = $this->get(route('home'));

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    }

    public function test_zakaria_admin_web_redirect(): void
    {
        $response = $this->get('/zakaria/admin/login');
        $response->assertRedirect();
        $this->assertStringContainsString('/zakaria/admin/login', $response->headers->get('Location'));

        $adminRedirect = $this->get('/admin/login');
        $adminRedirect->assertRedirect();
        $this->assertStringContainsString('/zakaria/admin/login', $adminRedirect->headers->get('Location'));
    }

    public function test_category_cache_is_invalidated_on_change(): void
    {
        \Illuminate\Support\Facades\Cache::put('active_categories', ['dummy_cached_data']);
        $this->assertTrue(\Illuminate\Support\Facades\Cache::has('active_categories'));

        $newCategory = Category::create([
            'name' => 'Cache Test Category',
            'slug' => 'cache-test-category',
            'is_active' => true,
            'sort_order' => 99,
        ]);

        $this->assertFalse(\Illuminate\Support\Facades\Cache::has('active_categories'));
    }
}
