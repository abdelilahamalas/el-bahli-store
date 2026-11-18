<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductSize;
use App\Services\OrderService;
use App\Services\SettingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CycleCommandesTest extends TestCase
{
    use RefreshDatabase;

    protected Category $activeCategory;

    protected Product $activeProduct;

    protected ProductSize $activeSize;

    protected function setUp(): void
    {
        parent::setUp();

        app(SettingService::class)->set('delivery_fee', '35.00');

        $this->activeCategory = Category::create([
            'name' => 'Capuches',
            'slug' => 'capuches',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->activeProduct = Product::create([
            'category_id' => $this->activeCategory->id,
            'name' => 'Capuche Hoodie Noir',
            'slug' => 'capuche-hoodie-noir',
            'description' => 'Un hoodie chaud de qualité supérieure.',
            'price' => 250.00,
            'is_active' => true,
        ]);

        $this->activeSize = ProductSize::create([
            'product_id' => $this->activeProduct->id,
            'size' => 'L',
            'color' => 'Standard',
            'stock' => 5,
        ]);
    }

    public function test_client_price_is_ignored_falsification(): void
    {
        $idempotencyToken = 'token-falsification-123';

        $response = $this->postJson(route('api.v1.orders.store'), [
            'customer_name' => 'Mohamed Karim',
            'customer_phone' => '0612345678',
            'city' => 'Rabat',
            'address' => 'Agdal, Avenue de France',
            'idempotency_token' => $idempotencyToken,
            'price' => '1.00', // Client attempts to forge price
            'total' => '1.00',
            'delivery_fee' => '0.00',
            'items' => [
                [
                    'product_id' => $this->activeProduct->id,
                    'size' => 'L',
                    'quantity' => 2,
                    'unit_price' => '1.00', // Client attempts to forge unit_price
                    'line_total' => '2.00',
                ],
            ],
        ]);

        $response->assertCreated();

        /** @var Order $order */
        $order = Order::latest()->first();
        $this->assertNotNull($order);

        // Server recalculates: 2 * 250.00 = 500.00, delivery is always 0.00 MAD
        $this->assertEquals('500.00', $order->subtotal);
        $this->assertEquals('0.00', $order->delivery_fee);
        $this->assertEquals('500.00', $order->total);
        $this->assertEquals('250.00', $order->items->first()->unit_price);
        $this->assertEquals('500.00', $order->items->first()->line_total);
    }

    public function test_inactive_product_or_category_is_rejected(): void
    {
        // 1. Inactive product
        $inactiveProduct = Product::create([
            'category_id' => $this->activeCategory->id,
            'name' => 'Produit Inactif',
            'slug' => 'produit-inactif',
            'price' => 100.00,
            'is_active' => false,
        ]);
        ProductSize::create([
            'product_id' => $inactiveProduct->id,
            'size' => 'M',
            'color' => 'Standard',
            'stock' => 10,
        ]);

        $idempotencyToken = 'token-inactive-prod';

        $response = $this->postJson(route('api.v1.orders.store'), [
            'customer_name' => 'Mohamed Karim',
            'customer_phone' => '0612345678',
            'city' => 'Rabat',
            'address' => 'Agdal',
            'idempotency_token' => $idempotencyToken,
            'items' => [
                ['product_id' => $inactiveProduct->id, 'size' => 'M', 'quantity' => 1],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['items']);

        // 2. Inactive category
        $inactiveCategory = Category::create([
            'name' => 'Catégorie Inactive',
            'slug' => 'categorie-inactive',
            'is_active' => false,
            'sort_order' => 99,
        ]);
        $productInInactiveCat = Product::create([
            'category_id' => $inactiveCategory->id,
            'name' => 'Produit Cat Inactive',
            'slug' => 'produit-cat-inactive',
            'price' => 100.00,
            'is_active' => true,
        ]);
        ProductSize::create([
            'product_id' => $productInInactiveCat->id,
            'size' => 'M',
            'color' => 'Standard',
            'stock' => 10,
        ]);

        $idempotencyToken2 = 'token-inactive-cat';

        $response2 = $this->postJson(route('api.v1.orders.store'), [
            'customer_name' => 'Mohamed Karim',
            'customer_phone' => '0612345678',
            'city' => 'Rabat',
            'address' => 'Agdal',
            'idempotency_token' => $idempotencyToken2,
            'items' => [
                ['product_id' => $productInInactiveCat->id, 'size' => 'M', 'quantity' => 1],
            ],
        ]);

        $response2->assertStatus(422);
        $response2->assertJsonValidationErrors(['items']);
    }

    public function test_non_existent_size_is_rejected(): void
    {
        $idempotencyToken = 'token-size-non-existent';

        $response = $this->postJson(route('api.v1.orders.store'), [
            'customer_name' => 'Mohamed Karim',
            'customer_phone' => '0612345678',
            'city' => 'Rabat',
            'address' => 'Agdal',
            'idempotency_token' => $idempotencyToken,
            'items' => [
                ['product_id' => $this->activeProduct->id, 'size' => 'XXXL', 'quantity' => 1],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['items']);
    }

    public function test_insufficient_stock_is_rejected(): void
    {
        $idempotencyToken = 'token-stock-insufficient';

        $response = $this->postJson(route('api.v1.orders.store'), [
            'customer_name' => 'Mohamed Karim',
            'customer_phone' => '0612345678',
            'city' => 'Rabat',
            'address' => 'Agdal',
            'idempotency_token' => $idempotencyToken,
            'items' => [
                // Available stock is 5, requesting 8
                ['product_id' => $this->activeProduct->id, 'size' => 'L', 'quantity' => 8],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['items']);
        $this->activeSize->refresh();
        $this->assertEquals(5, $this->activeSize->stock);
    }

    public function test_stock_is_decremented_on_order_and_restored_on_cancellation_only_once(): void
    {
        $orderService = app(OrderService::class);

        $order = $orderService->createOrder(
            [
                'customer_name' => 'Youssef Alami',
                'customer_phone' => '0661234567',
                'city' => 'Fès',
                'address' => 'Route d\'Immouzzer',
            ],
            [
                ['product_id' => $this->activeProduct->id, 'size' => 'L', 'quantity' => 2],
            ]
        );

        $this->activeSize->refresh();
        $this->assertEquals(5, $this->activeSize->stock); // In PENDING, stock remains 5

        // Confirm order: stock is decremented
        $order = $orderService->transitionStatus($order, OrderStatus::CONFIRMED);
        $this->activeSize->refresh();
        $this->assertEquals(3, $this->activeSize->stock); // 5 - 2 = 3

        // Cancel order after confirmation: stock must be restored
        $order = $orderService->transitionStatus($order, OrderStatus::CANCELLED);
        $this->activeSize->refresh();
        $this->assertEquals(5, $this->activeSize->stock); // 3 + 2 = 5
        $this->assertNotNull($order->cancelled_at);

        // Attempting to cancel again should not increment stock
        // CANCELLED -> CANCELLED is not allowed by transitions
        $this->expectException(ValidationException::class);
        $orderService->transitionStatus($order, OrderStatus::CANCELLED);
    }

    public function test_invalid_status_transition_is_rejected_with_422(): void
    {
        $orderService = app(OrderService::class);

        $order = $orderService->createOrder(
            [
                'customer_name' => 'Youssef Alami',
                'customer_phone' => '0661234567',
                'city' => 'Fès',
                'address' => 'Route d\'Immouzzer',
            ],
            [
                ['product_id' => $this->activeProduct->id, 'size' => 'L', 'quantity' => 1],
            ]
        );

        // PENDING -> DELIVERED is forbidden! (only PENDING -> CONFIRMED or CANCELLED)
        $this->expectException(ValidationException::class);
        $orderService->transitionStatus($order, OrderStatus::DELIVERED);
    }

    public function test_invalid_phone_is_rejected_and_valid_phone_normalized(): void
    {
        $idempotencyToken = 'token-phone-invalid';

        // Non-moroccan or invalid number
        $response = $this->postJson(route('api.v1.orders.store'), [
            'customer_name' => 'Youssef',
            'customer_phone' => '0123456789', // Invalid prefix 01
            'city' => 'Fès',
            'address' => 'Centre ville',
            'idempotency_token' => $idempotencyToken,
            'items' => [
                ['product_id' => $this->activeProduct->id, 'size' => 'L', 'quantity' => 1],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['customer_phone']);

        // Valid phone with local format
        $idempotencyToken2 = 'token-phone-valid';

        $response2 = $this->postJson(route('api.v1.orders.store'), [
            'customer_name' => 'Youssef',
            'customer_phone' => '07 12 34 56 78',
            'city' => 'Fès',
            'address' => 'Centre ville',
            'idempotency_token' => $idempotencyToken2,
            'items' => [
                ['product_id' => $this->activeProduct->id, 'size' => 'L', 'quantity' => 1],
            ],
        ]);

        $response2->assertCreated();
        $order = Order::latest()->first();
        $this->assertEquals('+212712345678', $order->customer_phone);
    }

    public function test_double_submission_blocked_via_idempotency_token(): void
    {
        $idempotencyToken = 'token-unique-double-submit';

        $payload = [
            'customer_name' => 'Othman',
            'customer_phone' => '0670000000',
            'city' => 'Tanger',
            'address' => 'Malabata',
            'idempotency_token' => $idempotencyToken,
            'items' => [
                ['product_id' => $this->activeProduct->id, 'size' => 'L', 'quantity' => 1],
            ],
        ];

        // First attempt succeeds
        $response1 = $this->postJson(route('api.v1.orders.store'), $payload);
        $response1->assertCreated();

        // Second attempt with same token fails with 409 Conflict
        $response2 = $this->postJson(route('api.v1.orders.store'), $payload);
        $response2->assertStatus(409);
    }

    public function test_honeypot_rejects_silently(): void
    {
        $idempotencyToken = 'token-honeypot';

        $countBefore = Order::count();

        $response = $this->postJson(route('api.v1.orders.store'), [
            'customer_name' => 'Bot Spammer',
            'customer_phone' => '0612345678',
            'city' => 'Casablanca',
            'address' => 'Fake address',
            'idempotency_token' => $idempotencyToken,
            'website' => 'http://spam-link.com', // Honeypot filled!
            'items' => [
                ['product_id' => $this->activeProduct->id, 'size' => 'L', 'quantity' => 1],
            ],
        ]);

        // Silent success, no order created
        $response->assertOk();
        $this->assertEquals($countBefore, Order::count());
    }

    public function test_order_rate_limiting(): void
    {
        RateLimiter::clear('order-submission:127.0.0.1');

        for ($i = 0; $i < 5; $i++) {
            $token = "token-rate-{$i}";

            $this->postJson(route('api.v1.orders.store'), [
                'customer_name' => 'Buyer',
                'customer_phone' => '0612345678',
                'city' => 'Casablanca',
                'address' => 'Address '.$i,
                'idempotency_token' => $token,
                'items' => [
                    ['product_id' => $this->activeProduct->id, 'size' => 'L', 'quantity' => 1],
                ],
            ]);
        }

        // 6th attempt should trigger 429
        $token6 = 'token-rate-6';

        $response = $this->postJson(route('api.v1.orders.store'), [
            'customer_name' => 'Buyer',
            'customer_phone' => '0612345678',
            'city' => 'Casablanca',
            'address' => 'Address 6',
            'idempotency_token' => $token6,
            'items' => [
                ['product_id' => $this->activeProduct->id, 'size' => 'L', 'quantity' => 1],
            ],
        ]);

        $response->assertStatus(429);
        $this->assertNotEmpty($response->json('message'));
    }

    public function test_simultaneous_orders_cannot_create_negative_stock(): void
    {
        $orderService = app(OrderService::class);

        // Put stock to exactly 1
        $this->activeSize->stock = 1;
        $this->activeSize->save();

        // First order claims the last item
        $order1 = $orderService->createOrder(
            [
                'customer_name' => 'Buyer 1',
                'customer_phone' => '0612345678',
                'city' => 'Casablanca',
                'address' => 'Address 1',
            ],
            [
                ['product_id' => $this->activeProduct->id, 'size' => 'L', 'quantity' => 1],
            ]
        );

        // First order is confirmed and claims the last item
        $orderService->transitionStatus($order1, OrderStatus::CONFIRMED);
        $this->activeSize->refresh();
        $this->assertEquals(0, $this->activeSize->stock);

        // Second order created while stock was 0 must fail immediately, or if created before, confirmation must fail
        try {
            $order2 = $orderService->createOrder(
                [
                    'customer_name' => 'Buyer 2',
                    'customer_phone' => '0698765432',
                    'city' => 'Casablanca',
                    'address' => 'Address 2',
                ],
                [
                    ['product_id' => $this->activeProduct->id, 'size' => 'L', 'quantity' => 1],
                ]
            );
            $orderService->transitionStatus($order2, OrderStatus::CONFIRMED);
            $this->fail('Expected ValidationException for out of stock');
        } catch (ValidationException $e) {
            $this->activeSize->refresh();
            $this->assertEquals(0, $this->activeSize->stock);
            $this->assertGreaterThanOrEqual(0, $this->activeSize->stock);
        }
    }

    public function test_temporary_signed_confirmation_route(): void
    {
        $orderService = app(OrderService::class);

        $order = $orderService->createOrder(
            [
                'customer_name' => 'Confirmation User',
                'customer_phone' => '0612345678',
                'city' => 'Marrakech',
                'address' => 'Gueliz',
            ],
            [
                ['product_id' => $this->activeProduct->id, 'size' => 'L', 'quantity' => 1],
            ]
        );

        // 1. Without valid signature: 403
        $unsignedResponse = $this->get(route('api.v1.orders.confirmation', ['token' => $order->reference]));
        $unsignedResponse->assertForbidden();

        // 2. With valid temporary signature: 200
        $validSignedUrl = URL::temporarySignedRoute(
            'api.v1.orders.confirmation',
            now()->addMinutes(60),
            ['token' => $order->reference]
        );

        $signedResponse = $this->get($validSignedUrl);
        $signedResponse->assertOk();
    }
}
