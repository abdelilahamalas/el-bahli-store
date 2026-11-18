<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\User;
use App\Services\SettingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LivraisonGratuiteEtPaiementTest extends TestCase
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
            'name' => 'Sweat Capuche Premium',
            'slug' => 'sweat-capuche-premium',
            'description' => 'Sweat à capuche haute qualité',
            'price' => '300.00',
            'is_active' => true,
        ]);

        $this->variant = ProductSize::create([
            'product_id' => $this->product->id,
            'size' => 'L',
            'color' => 'Noir',
            'stock' => 15,
        ]);
    }

    public function test_cart_estimate_always_enforces_free_delivery_and_cash_on_delivery(): void
    {
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
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.subtotal', '600.00')
            ->assertJsonPath('data.delivery_fee', '0.00')
            ->assertJsonPath('data.is_delivery_free', true)
            ->assertJsonPath('data.payment_method', 'cash_on_delivery')
            ->assertJsonPath('data.payment_method_label', 'Paiement à la réception')
            ->assertJsonPath('data.total', '600.00');
    }

    public function test_public_order_creation_enforces_free_delivery_and_cash_on_delivery_ignoring_client_tampering(): void
    {
        $payload = [
            'customer_name' => 'Youssef El Amrani',
            'customer_phone' => '0661234567',
            'city' => 'Casablanca',
            'address' => '25 Rue Allal Ben Abdellah',
            'idempotency_token' => 'token-test-'.uniqid(),
            // Client attempts to spoof fee, total, and payment method
            'delivery_fee' => '50.00',
            'total' => '1.00',
            'payment_method' => 'stripe_credit_card',
            'payment_status' => 'paid',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'size' => 'L',
                    'color' => 'Noir',
                    'quantity' => 2,
                    'unit_price' => '5.00', // Spoofed price
                ],
            ],
        ];

        $response = $this->postJson(route('api.v1.orders.store'), $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.order.subtotal', '600.00')
            ->assertJsonPath('data.order.delivery_fee', '0.00')
            ->assertJsonPath('data.order.is_delivery_free', true)
            ->assertJsonPath('data.order.total', '600.00')
            ->assertJsonPath('data.order.payment_method', 'cash_on_delivery')
            ->assertJsonPath('data.order.payment_method_label', 'Paiement à la réception')
            ->assertJsonPath('data.order.payment_status', 'pending')
            ->assertJsonPath('data.order.payment_status_label', 'Paiement en attente')
            ->assertJsonPath('data.order.paid_at', null);

        /** @var Order $order */
        $order = Order::latest()->first();
        $this->assertEquals('600.00', $order->subtotal);
        $this->assertEquals('0.00', $order->delivery_fee);
        $this->assertEquals('600.00', $order->total);
        $this->assertEquals('cash_on_delivery', $order->payment_method);
        $this->assertEquals(PaymentStatus::PENDING, $order->payment_status);
        $this->assertNull($order->paid_at);
    }

    public function test_order_status_transitions_do_not_automatically_alter_payment_status(): void
    {
        Sanctum::actingAs($this->adminUser);

        $order = Order::create([
            'reference' => 'EB-COD-001',
            'customer_name' => 'Salma Tazi',
            'customer_phone' => '0662334455',
            'city' => 'Rabat',
            'address' => 'Hay Riad',
            'status' => OrderStatus::PENDING,
            'payment_method' => 'cash_on_delivery',
            'payment_status' => PaymentStatus::PENDING,
            'subtotal' => '300.00',
            'delivery_fee' => '0.00',
            'total' => '300.00',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'size' => 'L',
            'couleur_copie' => 'Noir',
            'unit_price' => '300.00',
            'quantity' => 1,
            'line_total' => '300.00',
        ]);

        // 1. Confirm order
        $this->patchJson(route('api.v1.admin.orders.status', $order->id), [
            'status' => OrderStatus::CONFIRMED->value,
        ])->assertOk();

        $order->refresh();
        $this->assertEquals(OrderStatus::CONFIRMED, $order->status);
        $this->assertEquals(PaymentStatus::PENDING, $order->payment_status, 'Payment must remain pending on confirmation');

        // 2. Ship order
        $this->patchJson(route('api.v1.admin.orders.status', $order->id), [
            'status' => OrderStatus::SHIPPED->value,
        ])->assertOk();

        $order->refresh();
        $this->assertEquals(OrderStatus::SHIPPED, $order->status);
        $this->assertEquals(PaymentStatus::PENDING, $order->payment_status, 'Payment must remain pending while in transit');

        // 3. Deliver order
        $this->patchJson(route('api.v1.admin.orders.status', $order->id), [
            'status' => OrderStatus::DELIVERED->value,
        ])->assertOk();

        $order->refresh();
        $this->assertEquals(OrderStatus::DELIVERED, $order->status);
        $this->assertEquals(PaymentStatus::PENDING, $order->payment_status, 'Payment must remain pending until physically confirmed by cash receipt');
    }

    public function test_admin_can_update_payment_status_to_paid_and_refunded(): void
    {
        Sanctum::actingAs($this->adminUser);

        $order = Order::create([
            'reference' => 'EB-COD-PAY-002',
            'customer_name' => 'Mehdi Alami',
            'customer_phone' => '0663445566',
            'city' => 'Marrakech',
            'address' => 'Gueliz',
            'status' => OrderStatus::DELIVERED,
            'payment_method' => 'cash_on_delivery',
            'payment_status' => PaymentStatus::PENDING,
            'subtotal' => '300.00',
            'delivery_fee' => '0.00',
            'total' => '300.00',
        ]);

        // Update payment to paid
        $response = $this->patchJson(route('api.v1.admin.orders.payment', $order->id), [
            'payment_status' => PaymentStatus::PAID->value,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.payment_status_label', 'Paiement encaissé');

        $order->refresh();
        $this->assertEquals(PaymentStatus::PAID, $order->payment_status);
        $this->assertNotNull($order->paid_at);

        // Update payment to refunded
        $refundResponse = $this->patchJson(route('api.v1.admin.orders.payment', $order->id), [
            'payment_status' => PaymentStatus::REFUNDED->value,
        ]);

        $refundResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_status', 'refunded')
            ->assertJsonPath('data.payment_status_label', 'Paiement remboursé');

        $order->refresh();
        $this->assertEquals(PaymentStatus::REFUNDED, $order->payment_status);
    }

    public function test_admin_cannot_update_payment_with_invalid_status(): void
    {
        Sanctum::actingAs($this->adminUser);

        $order = Order::create([
            'reference' => 'EB-COD-INV-003',
            'customer_name' => 'Test',
            'customer_phone' => '0660000000',
            'city' => 'Fes',
            'address' => 'Centre',
            'status' => OrderStatus::PENDING,
            'payment_method' => 'cash_on_delivery',
            'payment_status' => PaymentStatus::PENDING,
            'subtotal' => '300.00',
            'delivery_fee' => '0.00',
            'total' => '300.00',
        ]);

        $response = $this->patchJson(route('api.v1.admin.orders.payment', $order->id), [
            'payment_status' => 'crypto_unsupported',
        ]);

        $response->assertUnprocessable();
    }

    public function test_dashboard_reports_amount_to_collect_and_collected_revenue_for_cod(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Order 1: Delivered and paid (Collected Revenue)
        Order::create([
            'reference' => 'EB-DASH-001',
            'customer_name' => 'Client Payé',
            'customer_phone' => '0661111111',
            'city' => 'Casablanca',
            'address' => 'Ain Diab',
            'status' => OrderStatus::DELIVERED,
            'payment_method' => 'cash_on_delivery',
            'payment_status' => PaymentStatus::PAID,
            'paid_at' => now(),
            'subtotal' => '450.00',
            'delivery_fee' => '0.00',
            'total' => '450.00',
        ]);

        // Order 2: Confirmed and pending payment (Amount to Collect)
        Order::create([
            'reference' => 'EB-DASH-002',
            'customer_name' => 'Client A encaisser',
            'customer_phone' => '0662222222',
            'city' => 'Rabat',
            'address' => 'Agdal',
            'status' => OrderStatus::CONFIRMED,
            'payment_method' => 'cash_on_delivery',
            'payment_status' => PaymentStatus::PENDING,
            'subtotal' => '250.00',
            'delivery_fee' => '0.00',
            'total' => '250.00',
        ]);

        $response = $this->getJson(route('api.v1.admin.dashboard'));

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.kpis.amount_to_collect', '250.00')
            ->assertJsonPath('data.kpis.collected_revenue', '450.00')
            ->assertJsonPath('data.kpis.payment_method', 'cash_on_delivery')
            ->assertJsonPath('data.kpis.is_delivery_free', true);
    }

    public function test_admin_settings_endpoint_enforces_free_delivery_and_ignores_fee_configuration(): void
    {
        Sanctum::actingAs($this->adminUser);

        $response = $this->putJson(route('api.v1.admin.settings.update'), [
            'store_name' => 'El Bahli Store Officiel',
            'store_phone' => '+212600000000',
            'store_email' => 'contact@example.com',
            'delivery_fee' => 45.00,
            'free_shipping_threshold' => 500.00,
            'currency' => 'MAD',
            'language' => 'fr',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.store_name', 'El Bahli Store Officiel')
            ->assertJsonPath('data.delivery_fee', '0.00')
            ->assertJsonPath('data.is_delivery_free', true)
            ->assertJsonPath('data.payment_method', 'cash_on_delivery');

        $settingService = app(SettingService::class);
        $this->assertEquals(0.0, $settingService->getDeliveryFee());
    }
}
