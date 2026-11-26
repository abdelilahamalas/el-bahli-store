<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Category;
use App\Models\ImageProduit;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Suite de tests d'intégration fonctionnelle administrative globale.
 * Valide l'ensemble des cas d'usage décrits dans le cahier des charges d'administration.
 */
class AdministrationGlobaleTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected User $clientUser;

    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->adminUser = User::factory()->create([
            'name' => 'Zakaria El Bahli',
            'email' => 'admin.global@elbahlistore.com',
            'password' => Hash::make('AdminSecretPass2026!'),
            'is_admin' => true,
        ]);

        $this->clientUser = User::factory()->create([
            'name' => 'Client Lambda',
            'email' => 'client.lambda@example.com',
            'password' => Hash::make('ClientPass2026!'),
            'is_admin' => false,
        ]);

        $this->category = Category::create([
            'name' => 'Chemises',
            'slug' => 'chemises',
            'is_active' => true,
            'sort_order' => 1,
        ]);
    }

    // =========================================================================
    // A. AUTHENTIFICATION ADMINISTRATEUR
    // =========================================================================

    public function test_admin_authentication_workflow_and_access_controls(): void
    {
        // 1. Refus des identifiants incorrects
        $badLogin = $this->postJson(route('api.v1.admin.login'), [
            'email' => 'admin.global@elbahlistore.com',
            'password' => 'WrongPassword',
        ]);
        $badLogin->assertStatus(401)
            ->assertJsonPath('success', false);

        // 2. Connexion avec identifiants valides
        $loginRes = $this->postJson(route('api.v1.admin.login'), [
            'email' => 'admin.global@elbahlistore.com',
            'password' => 'AdminSecretPass2026!',
        ]);
        $loginRes->assertOk()
            ->assertJsonPath('success', true);
        $token = $loginRes->json('data.token');
        $this->assertNotEmpty($token);

        // 3. Consultation du profil /me avec le jeton
        $meRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.admin.me'));
        $meRes->assertOk()
            ->assertJsonPath('data.email', 'admin.global@elbahlistore.com');

        // 4. Déconnexion et révocation du jeton
        $logoutRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson(route('api.v1.admin.logout'));
        $logoutRes->assertOk();

        // Réinitialiser les guards pour forcer Sanctum à valider le token supprimé
        app('auth')->forgetGuards();

        // Le jeton révoqué ne peut plus accéder aux ressources protégées
        $meAfterLogout = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson(route('api.v1.admin.me'));
        $meAfterLogout->assertStatus(401);

        // 5. Protection contre les accès non authentifiés (401)
        $this->getJson(route('api.v1.admin.dashboard'))->assertStatus(401);

        // 6. Refus des utilisateurs non-administrateurs (403)
        Sanctum::actingAs($this->clientUser);
        $this->getJson(route('api.v1.admin.dashboard'))->assertStatus(403);
    }

    // =========================================================================
    // B. GESTION DES CATÉGORIES
    // =========================================================================

    public function test_category_crud_and_deletion_protection(): void
    {
        Sanctum::actingAs($this->adminUser, ['admin']);

        // 1. Création d'une catégorie
        $createRes = $this->postJson(route('api.v1.admin.categories.store'), [
            'name' => 'Djellabas Traditionnelles',
            'description' => 'Collection de djellabas artisanales',
            'is_active' => true,
            'sort_order' => 5,
        ]);
        $createRes->assertCreated()
            ->assertJsonPath('data.name', 'Djellabas Traditionnelles')
            ->assertJsonPath('data.slug', 'djellabas-traditionnelles');

        $catId = $createRes->json('data.id');

        // 2. Empêcher les doublons de nom / slug
        $dupRes = $this->postJson(route('api.v1.admin.categories.store'), [
            'name' => 'Djellabas Traditionnelles',
        ]);
        $dupRes->assertStatus(422)
            ->assertJsonValidationErrors(['name']);

        // 3. Mise à jour de la catégorie
        $updateRes = $this->putJson(route('api.v1.admin.categories.update', $catId), [
            'name' => 'Djellabas Modernes',
            'description' => 'Nouvelle collection',
            'is_active' => false,
            'sort_order' => 10,
        ]);
        $updateRes->assertOk()
            ->assertJsonPath('data.name', 'Djellabas Modernes')
            ->assertJsonPath('data.is_active', false);

        // 4. Suppression autorisée d'une catégorie vide
        $delRes = $this->deleteJson(route('api.v1.admin.categories.destroy', $catId));
        $delRes->assertOk();
        $this->assertDatabaseMissing('categories', ['id' => $catId]);

        // 5. Refus de suppression si des produits sont rattachés (422)
        Product::create([
            'category_id' => $this->category->id,
            'name' => 'Chemise Blanche Lin',
            'slug' => 'chemise-blanche-lin',
            'price' => 350.00,
            'is_active' => true,
        ]);

        $blockedDel = $this->deleteJson(route('api.v1.admin.categories.destroy', $this->category->id));
        $blockedDel->assertStatus(422)
            ->assertJsonPath('success', false);
        $this->assertDatabaseHas('categories', ['id' => $this->category->id]);
    }

    // =========================================================================
    // C. GESTION DES PRODUITS & VARIANTES & PRIX PROMO
    // =========================================================================

    public function test_product_lifecycle_promotional_price_and_safe_deletion(): void
    {
        Sanctum::actingAs($this->adminUser, ['admin']);

        // 1. Validation : rejet si promotional_price >= price
        $invalidPromo = $this->postJson(route('api.v1.admin.products.store'), [
            'category_id' => $this->category->id,
            'name' => 'Veste Cuir Bomber',
            'price' => 500.00,
            'promotional_price' => 550.00, // Invalide : supérieur au prix
            'sizes' => [
                ['size' => 'M', 'color' => 'Noir', 'stock' => 5],
            ],
        ]);
        $invalidPromo->assertStatus(422)
            ->assertJsonValidationErrors(['promotional_price']);

        // 2. Création complète avec variantes, couleurs et prix promotionnel valide
        $validCreate = $this->postJson(route('api.v1.admin.products.store'), [
            'category_id' => $this->category->id,
            'name' => 'Veste Cuir Bomber',
            'description' => 'Veste en cuir véritable',
            'price' => 500.00,
            'promotional_price' => 420.00,
            'is_active' => true,
            'sizes' => [
                ['size' => 'M', 'color' => 'Noir', 'stock' => 10],
                ['size' => 'L', 'color' => 'Noir', 'stock' => 15],
                ['size' => 'L', 'color' => 'Marron', 'stock' => 7],
            ],
        ]);
        $validCreate->assertCreated()
            ->assertJsonPath('data.promotional_price', '420.00');

        $productId = $validCreate->json('data.id');
        $this->assertDatabaseHas('product_sizes', [
            'product_id' => $productId,
            'size' => 'M',
            'color' => 'Noir',
            'stock' => 10,
        ]);

        // 3. Modification partielle / mise à jour
        $updateRes = $this->putJson(route('api.v1.admin.products.update', $productId), [
            'category_id' => $this->category->id,
            'name' => 'Veste Cuir Bomber Édition Limitée',
            'price' => 550.00,
            'promotional_price' => 480.00,
            'is_active' => true,
            'sizes' => [
                ['size' => 'M', 'color' => 'Noir', 'stock' => 12],
                ['size' => 'L', 'color' => 'Noir', 'stock' => 15],
            ],
        ]);
        $updateRes->assertOk()
            ->assertJsonPath('data.name', 'Veste Cuir Bomber Édition Limitée');

        // 4. Suppression définitive : le produit est physiquement supprimé, l'historique de commande est préservé avec product_id = null
        $product = Product::find($productId);
        $order = Order::create([
            'reference' => 'EB-TESTHIST01',
            'customer_name' => 'Client Test',
            'customer_phone' => '+212611223344',
            'city' => 'Rabat',
            'address' => 'Agdal',
            'status' => OrderStatus::DELIVERED,
            'subtotal' => '480.00',
            'delivery_fee' => '0.00',
            'total' => '480.00',
        ]);
        $orderItem = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'size' => 'M',
            'couleur_copie' => 'Noir',
            'unit_price' => '480.00',
            'quantity' => 1,
            'line_total' => '480.00',
        ]);

        $destroyRes = $this->deleteJson(route('api.v1.admin.products.destroy', $productId));
        $destroyRes->assertOk();
        // Le produit est supprimé physiquement de la base
        $this->assertDatabaseMissing('products', ['id' => $productId]);
        // La ligne de commande reste intacte avec son snapshot et product_id = null
        $this->assertDatabaseHas('order_items', [
            'id' => $orderItem->id,
            'order_id' => $order->id,
            'product_id' => null,
            'product_name' => 'Veste Cuir Bomber Édition Limitée',
            'line_total' => '480.00',
        ]);
    }

    // =========================================================================
    // D. TÉLÉVERSEMENT & GESTION DES IMAGES
    // =========================================================================

    public function test_product_images_upload_reorder_main_and_deletion(): void
    {
        Sanctum::actingAs($this->adminUser, ['admin']);

        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Gilet Matelassé',
            'slug' => 'gilet-matelasse',
            'price' => 300.00,
            'is_active' => true,
        ]);

        $imageFile1 = UploadedFile::fake()->image('gilet-1.jpg', 800, 800);
        $imageFile2 = UploadedFile::fake()->image('gilet-2.png', 800, 800);

        // Upload première image
        $uploadRes1 = $this->post(route('api.v1.admin.products.images.store', $product->id), [
            'image' => $imageFile1,
            'is_main' => true,
        ], ['Accept' => 'application/json']);
        $uploadRes1->assertCreated()
            ->assertJsonPath('success', true);

        // Upload deuxième image
        $uploadRes2 = $this->post(route('api.v1.admin.products.images.store', $product->id), [
            'image' => $imageFile2,
            'is_main' => false,
        ], ['Accept' => 'application/json']);
        $uploadRes2->assertCreated()
            ->assertJsonPath('success', true);

        $images = ImageProduit::where('produit_id', $product->id)->orderBy('ordre_affichage')->get();
        $this->assertCount(2, $images);
        $this->assertTrue($images[0]->est_principale);
        $this->assertFalse($images[1]->est_principale);

        // Définir la seconde image comme principale
        $setMainRes = $this->postJson(route('api.v1.admin.products.images.main', [$product->id, $images[1]->id]));
        $setMainRes->assertOk();
        $this->assertTrue($images[1]->fresh()->est_principale);
        $this->assertFalse($images[0]->fresh()->est_principale);

        // Réordonner les images
        $reorderRes = $this->postJson(route('api.v1.admin.products.images.reorder', $product->id), [
            'images' => [
                ['id' => $images[1]->id, 'sort_order' => 0],
                ['id' => $images[0]->id, 'sort_order' => 1],
            ],
        ]);
        $reorderRes->assertOk();

        // Supprimer une image
        $delImgRes = $this->deleteJson(route('api.v1.admin.products.images.destroy', [$product->id, $images[0]->id]));
        $delImgRes->assertOk();
        $this->assertDatabaseMissing('images_produits', ['id' => $images[0]->id]);
    }

    // =========================================================================
    // E. GESTION DU STOCK & MOUVEMENTS
    // =========================================================================

    public function test_stock_manual_adjustment_and_traceability(): void
    {
        Sanctum::actingAs($this->adminUser, ['admin']);

        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Pantalon Chino',
            'slug' => 'pantalon-chino',
            'price' => 250.00,
            'is_active' => true,
        ]);

        $variant = ProductSize::create([
            'product_id' => $product->id,
            'size' => '42',
            'color' => 'Beige',
            'stock' => 5,
        ]);

        // Ajustement manuel du stock à 20 unités par l'administrateur
        $adjustRes = $this->postJson(route('api.v1.admin.inventory.adjust', $variant->id), [
            'new_stock' => 20,
            'reason' => 'Réception arrivage fournisseur',
        ]);
        $adjustRes->assertOk()
            ->assertJsonPath('data.stock', 20);

        // Vérification du mouvement de stock tracé en base (+15 unités)
        $this->assertDatabaseHas('stock_movements', [
            'product_size_id' => $variant->id,
            'user_id' => $this->adminUser->id,
            'type' => 'manual_adjustment',
            'quantity_delta' => 15,
            'quantity_after' => 20,
            'reason' => 'Réception arrivage fournisseur',
        ]);
    }

    // =========================================================================
    // F. GESTION DES COMMANDES, TRANSITIONS, NOTES INTERNES & PAIEMENT
    // =========================================================================

    public function test_order_status_transitions_notes_and_payment_collection(): void
    {
        Sanctum::actingAs($this->adminUser, ['admin']);

        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Pull Col V',
            'slug' => 'pull-col-v',
            'price' => 200.00,
            'is_active' => true,
        ]);

        $variant = ProductSize::create([
            'product_id' => $product->id,
            'size' => 'L',
            'color' => 'Bleu Marine',
            'stock' => 10,
        ]);

        $order = Order::create([
            'reference' => 'EB-ORDADMIN01',
            'customer_name' => 'Tariq Mansouri',
            'customer_phone' => '+212622334455',
            'city' => 'Fès',
            'address' => 'Route de Sefrou',
            'status' => OrderStatus::PENDING,
            'payment_status' => PaymentStatus::PENDING,
            'payment_method' => 'cash_on_delivery',
            'subtotal' => '200.00',
            'delivery_fee' => '0.00',
            'total' => '200.00',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'size' => 'L',
            'couleur_copie' => 'Bleu Marine',
            'unit_price' => '200.00',
            'quantity' => 2,
            'line_total' => '400.00',
        ]);

        // 1. Refus de transition illégale (PENDING -> DELIVERED impossible sans CONFIRMED & SHIPPED)
        $illegalRes = $this->patchJson(route('api.v1.admin.orders.status', $order->id), [
            'status' => OrderStatus::DELIVERED->value,
        ]);
        $illegalRes->assertStatus(422);

        // 2. Transition valide PENDING -> CONFIRMED (décrémente le stock de 2)
        $confirmRes = $this->patchJson(route('api.v1.admin.orders.status', $order->id), [
            'status' => OrderStatus::CONFIRMED->value,
            'reason' => 'Confirmation téléphonique effectuée',
        ]);
        $confirmRes->assertOk();
        $this->assertEquals(8, $variant->fresh()->stock);

        // 3. Ajout de notes administratives internes
        $notesRes = $this->patchJson(route('api.v1.admin.orders.notes', $order->id), [
            'admin_notes' => 'Le client demande une livraison avant 14h.',
        ]);
        $notesRes->assertOk()
            ->assertJsonPath('data.admin_notes', 'Le client demande une livraison avant 14h.');

        // 4. Encaissement du paiement à la réception (PaymentStatus::PAID)
        $paymentRes = $this->patchJson(route('api.v1.admin.orders.payment', $order->id), [
            'payment_status' => 'paid',
        ]);
        $paymentRes->assertOk()
            ->assertJsonPath('data.payment_status', 'paid');
        $this->assertNotNull($order->fresh()->paid_at);
    }

    // =========================================================================
    // G. GESTION DES RETOURS : RESELLABLE VS DAMAGED
    // =========================================================================

    public function test_order_return_resellable_restocks_and_damaged_quarantines(): void
    {
        Sanctum::actingAs($this->adminUser, ['admin']);

        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Cardigan Laine',
            'slug' => 'cardigan-laine',
            'price' => 320.00,
            'is_active' => true,
        ]);

        $variant = ProductSize::create([
            'product_id' => $product->id,
            'size' => 'XL',
            'color' => 'Gris',
            'stock' => 10,
        ]);

        $order = Order::create([
            'reference' => 'EB-RETURN001',
            'customer_name' => 'Karim Idrissi',
            'customer_phone' => '+212633445566',
            'city' => 'Tanger',
            'address' => 'Malabata',
            'status' => OrderStatus::DELIVERED,
            'payment_status' => PaymentStatus::PAID,
            'payment_method' => 'cash_on_delivery',
            'subtotal' => '640.00',
            'delivery_fee' => '0.00',
            'total' => '640.00',
        ]);

        $item1 = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'size' => 'XL',
            'couleur_copie' => 'Gris',
            'unit_price' => '320.00',
            'quantity' => 1,
            'line_total' => '320.00',
        ]);

        $item2 = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'size' => 'XL',
            'couleur_copie' => 'Gris',
            'unit_price' => '320.00',
            'quantity' => 1,
            'line_total' => '320.00',
        ]);

        // Traitement de 2 retours : 1 resellable (remis en stock) et 1 damaged (quarantaine)
        $returnRes = $this->postJson(route('api.v1.admin.orders.returns', $order->id), [
            'reason' => 'Retour partiel client',
            'returns' => [
                [
                    'order_item_id' => $item1->id,
                    'quantity_returned' => 1,
                    'quantity_resellable' => 1,
                    'quantity_damaged' => 0,
                    'reason' => 'Taille trop grande',
                ],
                [
                    'order_item_id' => $item2->id,
                    'quantity_returned' => 1,
                    'quantity_resellable' => 0,
                    'quantity_damaged' => 1,
                    'reason' => 'Fermeture éclair cassée',
                ],
            ],
        ]);
        $returnRes->assertOk();

        // Le stock vendable a augmenté de 1 uniquement (pour l'article revendable)
        $this->assertEquals(11, $variant->fresh()->stock);

        // L'article endommagé est enregistré en quarantaine/défectueux sans être réintégré dans le stock vendable
        $this->assertDatabaseHas('order_returns', [
            'order_id' => $order->id,
            'order_item_id' => $item2->id,
            'quantity_damaged' => 1,
            'restocked' => false,
        ]);
    }

    // =========================================================================
    // H. TABLEAU DE BORD, PARAMÈTRES & JOURNAL D'AUDIT
    // =========================================================================

    public function test_dashboard_settings_and_audit_logs(): void
    {
        Sanctum::actingAs($this->adminUser, ['admin']);

        // 1. Dashboard KPIs
        $dashRes = $this->getJson(route('api.v1.admin.dashboard'));
        $dashRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'kpis' => [
                        'total_orders',
                        'pending_orders',
                        'confirmed_orders',
                        'amount_to_collect',
                        'collected_revenue',
                    ],
                ],
            ]);

        // 2. Consultation des paramètres du magasin
        $settingsRes = $this->getJson(route('api.v1.admin.settings.show'));
        $settingsRes->assertOk()
            ->assertJsonPath('data.store_name', 'El Bahli Store')
            ->assertJsonPath('data.delivery_fee', '0.00'); // Toujours gratuit

        // 3. Mise à jour des paramètres du magasin
        $updateSettings = $this->putJson(route('api.v1.admin.settings.update'), [
            'store_name' => 'El Bahli Store Marrakech',
            'store_phone' => '+212524000000',
            'whatsapp_number' => '+212600112233',
            'store_city' => 'Marrakech',
            'store_address' => 'Gueliz, Boulevard Mohammed V',
        ]);
        $updateSettings->assertOk()
            ->assertJsonPath('data.store_name', 'El Bahli Store Marrakech');

        // 4. Consultation du journal d'audit
        $auditRes = $this->getJson(route('api.v1.admin.audit-logs.index'));
        $auditRes->assertOk()
            ->assertJsonPath('success', true);
    }
}
