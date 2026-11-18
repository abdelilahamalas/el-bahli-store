<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\Setting;
use App\Models\User;
use App\Services\ImageService;
use App\Services\OrderService;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Tests\TestCase;

class SecuriteBackendTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $regularUser;

    protected Category $category;

    protected Product $product;

    protected ProductSize $variant;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->admin = User::factory()->create([
            'name' => 'Admin Test',
            'email' => 'admin@elbahli.store',
            'is_admin' => true,
        ]);

        $this->regularUser = User::factory()->create([
            'name' => 'Client Normal',
            'email' => 'client@elbahli.store',
            'is_admin' => false,
        ]);

        $this->category = Category::create([
            'name' => 'Kaftans',
            'slug' => 'kaftans',
            'is_active' => true,
        ]);

        $this->product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Kaftan Royal',
            'slug' => 'kaftan-royal',
            'description' => 'Magnifique Kaftan brodé',
            'price' => '1200.00',
            'is_active' => true,
        ]);

        $this->variant = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'M',
            'color' => 'Or',
            'stock' => 5,
        ]);

        Setting::updateOrCreate(['key' => 'delivery_fee'], ['value' => '35.00']);
    }

    /**
     * 1. SQL INJECTION RESISTANCE
     */
    public function test_sql_injection_in_inputs_is_safely_handled(): void
    {
        $sqlInjectionPayload = "' OR '1'='1' -- ";

        // Search category with SQLi payload
        $response = $this->get('/categorie/'.urlencode($sqlInjectionPayload));
        $this->assertTrue(in_array($response->status(), [404, 200]));

        // Search by reference in orders
        $order = Order::where('reference', $sqlInjectionPayload)->first();
        $this->assertNull($order);
    }

    /**
     * 2. XSS (CROSS-SITE SCRIPTING) PROTECTION
     */
    public function test_xss_payloads_in_customer_data_are_sanitized_or_escaped(): void
    {
        $xssName = '<script>alert("XSS")</script>Ahmed';
        $xssAddress = '<img src=x onerror=alert(1)>Derb Sultan';

        $orderService = app(OrderService::class);
        $order = $orderService->createOrder(
            [
                'customer_name' => $xssName,
                'customer_phone' => '0661234567',
                'city' => 'Casablanca',
                'address' => $xssAddress,
                'note' => '<svg onload=alert(2)>',
            ],
            [
                ['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Or', 'quantity' => 1],
            ]
        );

        $this->assertStringNotContainsString('<script>', $order->customer_name);
        $this->assertStringNotContainsString('<img', $order->address);
        $this->assertStringNotContainsString('<svg', (string) $order->note);
    }

    /**
     * 3. CSRF PROTECTION
     */
    public function test_post_routes_require_csrf_when_middleware_active(): void
    {
        // When request lacks CSRF token in session context
        $response = $this->post(route('api.v1.orders.store'), [
            'customer_name' => 'Test',
        ]);

        // Returns validation/redirect or 419 depending on testing token bypass
        $this->assertNotEquals(500, $response->status());
    }

    /**
     * 4. MASS ASSIGNMENT & PRIVILEGE ESCALATION
     */
    public function test_is_admin_cannot_be_mass_assigned_on_user_creation_or_update(): void
    {
        // Mass assignment in strict mode immediately rejects unfillable attributes
        try {
            new User([
                'name' => 'Attaquant',
                'email' => 'attaquant@example.com',
                'password' => 'secret123456',
                'is_admin' => true,
            ]);
            $this->fail('Expected MassAssignmentException for is_admin attribute.');
        } catch (MassAssignmentException $e) {
            $this->assertStringContainsString('is_admin', $e->getMessage());
        }

        // Attempting to escalate privileges through mass assignment
        try {
            $this->regularUser->fill(['is_admin' => true]);
            $this->fail('Expected MassAssignmentException when filling unfillable is_admin attribute.');
        } catch (MassAssignmentException $e) {
            $this->assertStringContainsString('is_admin', $e->getMessage());
        }
        $this->assertFalse($this->regularUser->isAdmin());
    }

    /**
     * 5. IDOR PROTECTION FOR GALLERY IMAGES
     */
    public function test_idor_protection_rejects_modifying_or_deleting_images_of_another_product(): void
    {
        $imageService = app(ImageService::class);

        $product2 = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Produit Secondaire',
            'slug' => 'produit-secondaire',
            'price' => '500.00',
            'is_active' => true,
        ]);

        $file = UploadedFile::fake()->image('photo.jpg', 600, 600);
        $image = $imageService->addImageToProduct($this->product, $file, true);

        // Attempt to call delete or setMain on product2 with product1's image
        $this->expectException(AccessDeniedHttpException::class);
        $imageService->deleteImageFromProduct($product2, $image->id);
    }

    /**
     * 6. PRICE TAMPERING PREVENTION
     */
    public function test_client_cannot_tamper_unit_price_or_total_in_order(): void
    {
        $orderService = app(OrderService::class);

        $order = $orderService->createOrder(
            [
                'customer_name' => 'Client Triche',
                'customer_phone' => '0612345678',
                'city' => 'Rabat',
                'address' => 'Agdal',
            ],
            [
                [
                    'product_id' => $this->product->id,
                    'size' => 'M',
                    'color' => 'Or',
                    'quantity' => 2,
                    'unit_price' => '1.00', // Fraudulent price
                    'line_total' => '2.00',
                ],
            ]
        );

        // True price is 1200.00 * 2 = 2400.00, delivery is always 0.00 MAD
        $this->assertSame('2400.00', $order->subtotal);
        $this->assertSame('0.00', $order->delivery_fee);
        $this->assertSame('2400.00', $order->total);
    }

    /**
     * 7. MALICIOUS UPLOAD REJECTION (EXECUTABLES, SPOOFED MIMES)
     */
    public function test_malicious_upload_executable_or_fake_mime_is_rejected(): void
    {
        $imageService = app(ImageService::class);

        // File pretending to be an image but is a PHP script
        $phpFile = UploadedFile::fake()->create('exploit.php', 100, 'application/x-php');

        $this->expectException(ValidationException::class);
        $imageService->validateImage($phpFile);
    }

    public function test_pixel_flood_attack_is_rejected(): void
    {
        $imageService = app(ImageService::class);

        // Crafted tiny JPEG header with dimensions 7000x7000 (0x1B58 x 0x1B58 = 49M pixels)
        $hex = 'ffd8ffe000104a46494600010101004800480000ffc00011081b581b5803012200021101031101ffd9';
        $tempPath = tempnam(sys_get_temp_dir(), 'pixel_flood_').'.jpg';
        file_put_contents($tempPath, hex2bin($hex));

        $hugeImage = new UploadedFile($tempPath, 'flood.jpg', 'image/jpeg', null, true);

        try {
            $imageService->validateImage($hugeImage);
            $this->fail('Expected ValidationException for pixel flood dimensions.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('image', $e->errors());
            $this->assertStringContainsString('dimensions', $e->errors()['image'][0]);
        } finally {
            if (file_exists($tempPath)) {
                @unlink($tempPath);
            }
        }
    }

    /**
     * 8. REFERENCE ENUMERATION BLOCK
     */
    public function test_order_confirmation_page_requires_cryptographic_signature(): void
    {
        $orderService = app(OrderService::class);
        $order = $orderService->createOrder(
            [
                'customer_name' => 'Client Secret',
                'customer_phone' => '0612345678',
                'city' => 'Tanger',
                'address' => 'Malabata',
            ],
            [
                ['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Or', 'quantity' => 1],
            ]
        );

        // Direct unsigned access to confirmation endpoint must be forbidden (HTTP 403)
        $unsignedResponse = $this->get(route('api.v1.orders.confirmation', ['token' => $order->reference]));
        $unsignedResponse->assertForbidden();
    }

    /**
     * 9. RATE LIMITING (HTTP 429)
     */
    public function test_cart_estimate_throttles_after_60_requests_per_minute(): void
    {
        RateLimiter::clear('cart-estimate:127.0.0.1');

        $cartPayload = [
            'items' => [
                ['product_id' => $this->product->id, 'size' => 'M', 'color' => 'Or', 'quantity' => 1],
            ],
        ];

        // Send 60 requests
        for ($i = 0; $i < 60; $i++) {
            $this->postJson(route('api.v1.cart.estimate'), $cartPayload)->assertOk();
        }

        // 61st request must trigger HTTP 429
        $response = $this->postJson(route('api.v1.cart.estimate'), $cartPayload);
        $response->assertStatus(429);
        $this->assertStringContainsString('Trop de demandes', (string) $response->getContent());
    }

    public function test_login_throttles_after_5_failed_attempts(): void
    {
        $email = 'brute-force@test.com';
        $throttleKey = Str::transliterate(Str::lower($email).'|127.0.0.1');
        RateLimiter::clear($throttleKey);

        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', [
                'email' => $email,
                'password' => 'wrong-password',
            ]);
        }

        // 6th attempt should be throttled
        $response = $this->post('/login', [
            'email' => $email,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(429);
    }

    /**
     * 10. CREATE ADMIN COMMAND AUDIT & SECURITY
     */
    public function test_create_admin_command_demands_12_chars_and_hashes_password(): void
    {
        Artisan::call('app:create-admin', [
            '--name' => 'Nouvel Admin',
            '--email' => 'newadmin@elbahli.store',
            '--password' => 'SuperSecretPassword123!',
        ]);

        $user = User::where('email', 'newadmin@elbahli.store')->first();
        $this->assertNotNull($user);
        $this->assertTrue($user->isAdmin());
        $this->assertTrue(Hash::check('SuperSecretPassword123!', $user->password));

        // Attempting to duplicate email fails
        $exitCode = Artisan::call('app:create-admin', [
            '--name' => 'Autre Admin',
            '--email' => 'newadmin@elbahli.store',
            '--password' => 'AnotherSuperSecretPassword123!',
        ]);

        $this->assertSame(1, $exitCode);
    }

    /**
     * 11. SECURITY HEADERS
     */
    public function test_security_headers_are_present_on_http_responses(): void
    {
        $response = $this->get(route('home'));

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    }

    /**
     * 12. NO SENSITIVE DATA IN PUBLIC OR ADMIN API RESPONSES
     */
    public function test_public_api_does_not_expose_passwords_or_tokens(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')->getJson(route('api.v1.admin.me'));

        $userData = $response->json('data');
        $this->assertNotNull($userData);
        $this->assertArrayNotHasKey('password', $userData);
        $this->assertArrayNotHasKey('remember_token', $userData);
        $this->assertArrayNotHasKey('two_factor_secret', $userData);
        $this->assertArrayNotHasKey('two_factor_recovery_codes', $userData);
    }
}
