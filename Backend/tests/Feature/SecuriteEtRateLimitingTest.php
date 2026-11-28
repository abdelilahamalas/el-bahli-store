<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SecuriteEtRateLimitingTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $client;
    private Category $category;
    private Product $product;
    private ProductSize $variantM;

    protected function setUp(): void
    {
        parent::setUp();

        RateLimiter::clear('login');
        RateLimiter::clear('order-submission');
        RateLimiter::clear('admin');

        $this->admin = User::factory()->create([
            'email' => 'admin@elbahli.store',
            'is_admin' => true,
        ]);

        $this->client = User::factory()->create([
            'email' => 'client@elbahli.store',
            'is_admin' => false,
        ]);

        $this->category = Category::create([
            'name' => 'Casquettes',
            'slug' => 'casquettes',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Casquette Vintage Noire',
            'slug' => 'casquette-vintage-noire',
            'price' => 150.00,
            'promotional_price' => 120.00,
            'is_active' => true,
        ]);

        $this->variantM = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'Unique',
            'color' => 'Noir',
            'stock' => 10,
            'is_active' => true,
        ]);
    }

    /**
     * 1. Login admin : 5 tentatives échouées puis la 6e renvoie 429
     */
    public function test_admin_login_rate_limiting_blocks_after_5_failed_attempts(): void
    {
        $payload = [
            'email' => 'admin@elbahli.store',
            'password' => 'MauvaisMotDePasse123!',
        ];

        for ($i = 1; $i <= 5; $i++) {
            $res = $this->postJson('/api/v1/admin/login', $payload);
            $res->assertStatus(401);
        }

        // La 6e tentative doit être bloquée avec 429 Too Many Requests
        $res6 = $this->postJson('/api/v1/admin/login', $payload);
        $res6->assertStatus(429)
            ->assertJson([
                'success' => false,
            ]);
    }

    /**
     * 2. Soumission de commande au-delà de la limite -> 429
     */
    public function test_order_submission_rate_limiting_triggers_429(): void
    {
        // 5 commandes avec des numéros différents depuis la même IP passent (limite IP = 5/min)
        for ($i = 1; $i <= 5; $i++) {
            $res = $this->postJson('/api/v1/orders', [
                'customer_name' => "Client {$i}",
                'customer_phone' => "061234560{$i}",
                'city' => 'Casablanca',
                'address' => 'Boulevard Zerktouni',
                'idempotency_token' => 'idem_token_test_'.$i,
                'items' => [
                    [
                        'product_id' => $this->product->id,
                        'size' => 'Unique',
                        'color' => 'Noir',
                        'quantity' => 1,
                    ],
                ],
            ]);
            $res->assertCreated();
        }

        // La 6e commande par la même IP dans la minute dépasse la limite de 5 et renvoie 429
        $resIpLimit = $this->postJson('/api/v1/orders', [
            'customer_name' => 'Client Trop Rapide',
            'customer_phone' => '0699887766',
            'city' => 'Rabat',
            'address' => 'Avenue de France',
            'idempotency_token' => 'idem_token_test_too_many',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'size' => 'Unique',
                    'color' => 'Noir',
                    'quantity' => 1,
                ],
            ],
        ]);

        $resIpLimit->assertStatus(429);
    }

    /**
     * 3. Honeypot rempli -> commande rejetée silencieusement (pas d'insertion en BDD)
     */
    public function test_order_honeypot_rejects_bots_without_creating_order(): void
    {
        $initialCount = Order::count();

        $response = $this->postJson('/api/v1/orders', [
            'customer_name' => 'Spam Bot',
            'customer_phone' => '0612345678',
            'city' => 'Casablanca',
            'address' => '123 Fake Street',
            'website' => 'http://spam-link.com', // Rempli par un bot
            'idempotency_token' => 'idem_honeypot_test',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'size' => 'Unique',
                    'color' => 'Noir',
                    'quantity' => 1,
                ],
            ],
        ]);

        $response->assertStatus(200);
        $this->assertEquals($initialCount, Order::count());
    }

    /**
     * 4. Toutes les routes admin : 401 sans token, 403 pour un non-admin
     */
    public function test_all_admin_routes_require_sanctum_and_admin_role(): void
    {
        $testRoutes = [
            ['GET', '/api/v1/admin/dashboard'],
            ['GET', '/api/v1/admin/products'],
            ['GET', '/api/v1/admin/categories'],
            ['GET', '/api/v1/admin/orders'],
            ['GET', '/api/v1/admin/inventory'],
            ['GET', '/api/v1/admin/stock'],
            ['GET', '/api/v1/admin/settings'],
        ];

        // 1. Sans token -> 401
        foreach ($testRoutes as [$method, $uri]) {
            $this->app['auth']->forgetGuards();
            $resUnauth = $this->json($method, $uri);
            $this->assertEquals(401, $resUnauth->status(), "Route {$uri} devrait renvoyer 401 sans token.");
        }

        // 2. Avec un compte connecté mais non-admin -> 403
        foreach ($testRoutes as [$method, $uri]) {
            $this->app['auth']->forgetGuards();
            $resForbidden = $this->actingAs($this->client, 'sanctum')->json($method, $uri);
            $this->assertEquals(403, $resForbidden->status(), "Route {$uri} devrait renvoyer 403 pour un non-admin.");
        }
    }

    /**
     * 5. Prix falsifié côté client -> total recalculé strictement côté serveur
     */
    public function test_order_total_is_recalculated_server_side_ignoring_tampered_price(): void
    {
        $response = $this->postJson('/api/v1/orders', [
            'customer_name' => 'Acheteur Rusé',
            'customer_phone' => '0612345678',
            'city' => 'Casablanca',
            'address' => 'Quartier Gauthier',
            'idempotency_token' => 'idem_fake_price_'.uniqid(),
            'price' => 1.00, // Tentative de falsification globale
            'total' => 1.00,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'size' => 'Unique',
                    'color' => 'Noir',
                    'quantity' => 2,
                    'unit_price' => 1.00, // Faux prix envoyé
                    'line_total' => 2.00,
                ],
            ],
        ]);

        $response->assertCreated();

        // Le vrai prix promotionnel est de 120.00 MAD * 2 = 240.00 MAD
        $order = Order::where('reference', $response->json('data.reference'))->firstOrFail();
        $this->assertEquals('240.00', number_format((float) $order->total, 2, '.', ''));
    }

    /**
     * 6. Quantité négative ou 0 -> 422 Unprocessable Content
     */
    public function test_order_rejects_negative_or_zero_quantity(): void
    {
        // Quantité 0
        $resZero = $this->postJson('/api/v1/orders', [
            'customer_name' => 'Client Test',
            'customer_phone' => '0612345678',
            'city' => 'Casablanca',
            'address' => 'Adresse Test',
            'idempotency_token' => 'idem_qty_zero_'.uniqid(),
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'size' => 'Unique',
                    'color' => 'Noir',
                    'quantity' => 0,
                ],
            ],
        ]);
        $resZero->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.quantity']);

        // Quantité négative
        $resNeg = $this->postJson('/api/v1/orders', [
            'customer_name' => 'Client Test',
            'customer_phone' => '0612345678',
            'city' => 'Casablanca',
            'address' => 'Adresse Test',
            'idempotency_token' => 'idem_qty_neg_'.uniqid(),
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'size' => 'Unique',
                    'color' => 'Noir',
                    'quantity' => -5,
                ],
            ],
        ]);
        $resNeg->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.quantity']);
    }

    /**
     * 7. Faux fichier (.php ou fichier SVG) -> refusé par validation
     */
    public function test_upload_rejects_fake_executable_or_svg_files(): void
    {
        Storage::fake('public');

        // Fichier exécutable PHP
        $fakePhp = UploadedFile::fake()->create('malicious.php', 10, 'text/x-php');

        $res1 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/admin/products', [
            'category_id' => $this->category->id,
            'name' => 'Produit PHP',
            'price' => 100,
            'sizes' => [['size' => 'M', 'stock' => 5]],
            'image' => $fakePhp,
        ]);
        $res1->assertStatus(422)
            ->assertJsonValidationErrors(['image']);

        // Fichier SVG (non autorisé car risque vecteur XSS)
        $svgFile = UploadedFile::fake()->create('vector.svg', 10, 'image/svg+xml');

        $res2 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/admin/products', [
            'category_id' => $this->category->id,
            'name' => 'Produit SVG',
            'price' => 100,
            'sizes' => [['size' => 'M', 'stock' => 5]],
            'image' => $svgFile,
        ]);
        $res2->assertStatus(422)
            ->assertJsonValidationErrors(['image']);
    }

    /**
     * 8. Ancien token après déconnexion -> 401
     */
    public function test_revoked_token_cannot_be_used_after_logout(): void
    {
        $token = $this->admin->createToken('test-token', ['admin'])->plainTextToken;
        $this->assertCount(1, $this->admin->fresh()->tokens);

        // Requête authentifiée avant déconnexion -> 200
        $resBefore = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/me');
        $resBefore->assertStatus(200);

        // Déconnexion
        $resLogout = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/admin/logout');
        $resLogout->assertStatus(200);

        // Le token a bien été supprimé de la base de données
        $this->assertCount(0, $this->admin->fresh()->tokens);

        // Tentative de réutilisation du même token après logout -> 401
        $this->app['auth']->forgetGuards();
        $resAfter = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/me');
        $resAfter->assertStatus(401);
    }

    /**
     * 9. Aucune réponse ne contient password ou remember_token
     */
    public function test_user_responses_never_expose_password_or_remember_token(): void
    {
        $resLogin = $this->postJson('/api/v1/admin/login', [
            'email' => 'admin@elbahli.store',
            'password' => 'password',
        ]);

        $content = $resLogin->getContent();
        $this->assertStringNotContainsString('password_hash', $content);
        $this->assertStringNotContainsString('two_factor_secret', $content);
        $this->assertStringNotContainsString('remember_token', $content);
    }

    /**
     * 10. Les images WebP et JPEG légitimes restent accessibles dans storage
     */
    public function test_legitimate_images_are_stored_and_accessible(): void
    {
        Storage::fake('public');

        $validJpg = UploadedFile::fake()->image('polo.jpg', 600, 600);

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/admin/products', [
            'category_id' => $this->category->id,
            'name' => 'Polo Test Image',
            'price' => 199.00,
            'sizes' => [['size' => 'M', 'color' => 'Standard', 'stock' => 5]],
            'image' => $validJpg,
        ]);

        $response->assertStatus(201);
    }
}
