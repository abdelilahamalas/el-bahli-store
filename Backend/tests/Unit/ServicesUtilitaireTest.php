<?php

namespace Tests\Unit;

use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductSize;
use App\Services\AuditService;
use App\Services\OrderService;
use App\Services\SettingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ServicesUtilitaireTest extends TestCase
{
    use RefreshDatabase;

    public function test_phone_normalization(): void
    {
        $this->assertEquals('+212612345678', OrderService::normalizeMoroccanPhone('0612345678'));
        $this->assertEquals('+212712345678', OrderService::normalizeMoroccanPhone('0712345678'));
        $this->assertEquals('+212522123456', OrderService::normalizeMoroccanPhone('0522123456'));
        $this->assertEquals('+212612345678', OrderService::normalizeMoroccanPhone('+212612345678'));
        $this->assertEquals('+212612345678', OrderService::normalizeMoroccanPhone('00212612345678'));
        $this->assertEquals('+212612345678', OrderService::normalizeMoroccanPhone('06 12 34 56 78'));
        $this->assertNull(OrderService::normalizeMoroccanPhone('0123456789'));
        $this->assertNull(OrderService::normalizeMoroccanPhone('invalid'));
    }

    public function test_setting_service_whatsapp_link_and_url_sanitization(): void
    {
        $settingService = app(SettingService::class);
        $settingService->set('whatsapp_number', '0612345678');
        $this->assertEquals('https://wa.me/212612345678', $settingService->getWhatsAppLink());

        $this->assertEquals(
            'https://instagram.com/myboutique',
            $settingService->sanitizeUrl('https://instagram.com/myboutique', 'instagram.com')
        );
        $this->assertNull($settingService->sanitizeUrl('http://insecure.com', 'instagram.com'));
        $this->assertNull($settingService->sanitizeUrl('javascript:alert(1)', 'instagram.com'));
    }

    public function test_audit_service_redacts_sensitive_keys(): void
    {
        $auditService = app(AuditService::class);
        $sanitized = $auditService->sanitizeMetadata([
            'reference' => 'EB-12345678',
            'password' => 'secret123',
            'customer_phone' => '+212600000000',
            'address' => 'Secret street',
        ]);

        $this->assertEquals('EB-12345678', $sanitized['reference']);
        $this->assertEquals('[REDACTED]', $sanitized['password']);
        $this->assertEquals('[REDACTED]', $sanitized['customer_phone']);
        $this->assertEquals('[REDACTED]', $sanitized['address']);
    }

    public function test_order_creation_and_stock_management(): void
    {
        $orderService = app(OrderService::class);

        $category = Category::create([
            'name' => 'T-shirts Test',
            'slug' => 't-shirts-test',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $product = Product::create([
            'category_id' => $category->id,
            'name' => 'T-shirt Noir',
            'slug' => 't-shirt-noir',
            'price' => 150.00,
            'is_active' => true,
        ]);

        $sizeM = ProductSize::create([
            'product_id' => $product->id,
            'size' => 'M',
            'stock' => 5,
        ]);

        // Create order
        $order = $orderService->createOrder(
            [
                'customer_name' => 'Ahmed Amine',
                'customer_phone' => '0612345678',
                'city' => 'Casablanca',
                'address' => 'Maarif',
                'note' => 'Livraison l\'après-midi',
            ],
            [
                ['product_id' => $product->id, 'size' => 'M', 'quantity' => 2],
            ]
        );

        $this->assertInstanceOf(Order::class, $order);
        $this->assertEquals(OrderStatus::PENDING, $order->status);
        $this->assertEquals('+212612345678', $order->customer_phone);
        $this->assertEquals('300.00', $order->subtotal);

        // Le stock reste intact en statut EN ATTENTE (PENDING)
        $sizeM->refresh();
        $this->assertEquals(5, $sizeM->stock);

        // Transition: PENDING -> CONFIRMED (stock is decremented upon confirmation)
        $order = $orderService->transitionStatus($order, OrderStatus::CONFIRMED);
        $this->assertEquals(OrderStatus::CONFIRMED, $order->status);
        $this->assertNotNull($order->confirmed_at);

        $sizeM->refresh();
        $this->assertEquals(3, $sizeM->stock);

        // Transition: CONFIRMED -> CANCELLED (stock restored)
        $order = $orderService->transitionStatus($order, OrderStatus::CANCELLED);
        $this->assertEquals(OrderStatus::CANCELLED, $order->status);
        $this->assertNotNull($order->cancelled_at);

        $sizeM->refresh();
        $this->assertEquals(5, $sizeM->stock);

        // Invalid transition: CANCELLED -> DELIVERED should throw 422
        $this->expectException(ValidationException::class);
        $orderService->transitionStatus($order, OrderStatus::DELIVERED);
    }
}
