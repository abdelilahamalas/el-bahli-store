<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdministrationProduitsEtStockTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $client;

    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name' => 'Zakaria El Bahli',
            'email' => 'zakariaelbahli@store.com',
            'is_admin' => true,
        ]);

        $this->client = User::factory()->create([
            'is_admin' => false,
        ]);

        $this->category = Category::create([
            'name' => 'Jeans',
            'slug' => 'jeans',
            'is_active' => true,
            'sort_order' => 1,
        ]);
    }

    /**
     * 1. Création d'un produit avec plusieurs tailles (via le payload variants).
     */
    public function test_creation_produit_avec_plusieurs_tailles_via_variants(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson(route('api.v1.admin.products.store'), [
                'category_id' => $this->category->id,
                'name' => 'Jean classique homme',
                'description' => 'Superbe coupe droite en denim premium',
                'price' => 350.00,
                'sale_price' => null,
                'is_active' => true,
                'variants' => [
                    ['size' => 'S', 'color' => 'Brut', 'stock' => 8, 'is_active' => true],
                    ['size' => 'M', 'color' => 'Brut', 'stock' => 12, 'is_active' => true],
                    ['size' => 'L', 'color' => 'Brut', 'stock' => 5, 'is_active' => true],
                    ['size' => 'XL', 'color' => 'Brut', 'stock' => 0, 'is_active' => true],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Jean classique homme')
            ->assertJsonPath('data.total_stock', 25);

        $this->assertDatabaseHas('products', [
            'name' => 'Jean classique homme',
            'category_id' => $this->category->id,
        ]);

        $this->assertDatabaseCount('product_sizes', 4);
    }

    /**
     * 2. Création avec des stocks différents par taille.
     */
    public function test_creation_avec_stocks_differents_par_taille(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson(route('api.v1.admin.products.store'), [
                'category_id' => $this->category->id,
                'name' => 'Jean Slim',
                'price' => 299.00,
                'variants' => [
                    ['size' => '38', 'color' => 'Noir', 'stock' => 15],
                    ['size' => '40', 'color' => 'Noir', 'stock' => 3],
                    ['size' => '42', 'color' => 'Noir', 'stock' => 0],
                ],
            ]);

        $response->assertStatus(201);
        $product = Product::where('name', 'Jean Slim')->first();
        $this->assertNotNull($product);

        $sizes = $product->sizes->keyBy('size');
        $this->assertSame(15, $sizes['38']->stock);
        $this->assertSame(3, $sizes['40']->stock);
        $this->assertSame(0, $sizes['42']->stock);
    }

    /**
     * 3. Création avec plusieurs couleurs et stocks indépendants.
     */
    public function test_creation_avec_plusieurs_couleurs_et_stocks_independants(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson(route('api.v1.admin.products.store'), [
                'category_id' => $this->category->id,
                'name' => 'Polo Premium',
                'price' => 199.00,
                'variants' => [
                    ['size' => 'M', 'color' => 'Blanc', 'stock' => 10],
                    ['size' => 'M', 'color' => 'Bleu Ciel', 'stock' => 4],
                    ['size' => 'L', 'color' => 'Blanc', 'stock' => 7],
                    ['size' => 'L', 'color' => 'Bleu Ciel', 'stock' => 1],
                ],
            ]);

        $response->assertStatus(201);
        $product = Product::where('name', 'Polo Premium')->first();

        $vBlancM = ProductSize::where('product_id', $product->id)->where('size', 'M')->where('color', 'Blanc')->first();
        $vBleuM = ProductSize::where('product_id', $product->id)->where('size', 'M')->where('color', 'Bleu Ciel')->first();

        $this->assertSame(10, $vBlancM->stock);
        $this->assertSame(4, $vBleuM->stock);
        $this->assertSame(22, $product->total_stock);
    }

    /**
     * 4. Création d'une variante avec stock zéro.
     */
    public function test_creation_variante_avec_stock_zero(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson(route('api.v1.admin.products.store'), [
                'category_id' => $this->category->id,
                'name' => 'Casquette Vintage',
                'price' => 120.00,
                'variants' => [
                    ['size' => 'Unique', 'color' => 'Kaki', 'stock' => 0],
                ],
            ]);

        $response->assertStatus(201);
        $product = Product::where('name', 'Casquette Vintage')->first();
        $this->assertSame(0, $product->total_stock);

        $variant = $product->sizes->first();
        $this->assertSame(0, $variant->stock);
        // Aucun mouvement de stock ne doit être créé pour un stock initial nul
        $this->assertDatabaseMissing('stock_movements', [
            'product_size_id' => $variant->id,
        ]);
    }

    /**
     * 5. Refus d'une taille dupliquée pour une même couleur (HTTP 422).
     */
    public function test_refus_taille_dupliquee_pour_meme_couleur(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson(route('api.v1.admin.products.store'), [
                'category_id' => $this->category->id,
                'name' => 'T-Shirt Doublon',
                'price' => 150.00,
                'variants' => [
                    ['size' => 'M', 'color' => 'Noir', 'stock' => 5],
                    ['size' => 'M', 'color' => 'Noir', 'stock' => 10], // Doublon !
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sizes.1.size']);

        $this->assertDatabaseMissing('products', ['name' => 'T-Shirt Doublon']);
    }

    /**
     * 6. Refus d'un stock négatif (HTTP 422).
     */
    public function test_refus_stock_negatif(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson(route('api.v1.admin.products.store'), [
                'category_id' => $this->category->id,
                'name' => 'Jean Negatif',
                'price' => 300.00,
                'variants' => [
                    ['size' => 'L', 'color' => 'Standard', 'stock' => -5],
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sizes.0.stock']);
    }

    /**
     * 7. Refus d'une catégorie invalide (HTTP 422).
     */
    public function test_refus_categorie_invalide(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson(route('api.v1.admin.products.store'), [
                'category_id' => 999999, // Inexistant
                'name' => 'Produit Sans Categorie',
                'price' => 200.00,
                'variants' => [
                    ['size' => 'M', 'color' => 'Standard', 'stock' => 5],
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['category_id']);
    }

    /**
     * 8. Création transactionnelle du produit et de ses variantes (pas de produit orphelin).
     */
    public function test_creation_transactionnelle_du_produit(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson(route('api.v1.admin.products.store'), [
                'category_id' => $this->category->id,
                'name' => 'Produit Rollback Test',
                'price' => 100.00,
                'variants' => [
                    ['size' => 'S', 'color' => 'Standard', 'stock' => 5],
                    ['size' => 'M', 'color' => 'Standard', 'stock' => -1], // Provoque l'échec
                ],
            ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('products', ['name' => 'Produit Rollback Test']);
        $this->assertDatabaseCount('product_sizes', 0);
    }

    /**
     * 9. Modification des informations du produit (PUT).
     */
    public function test_modification_des_informations_du_produit(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Veste Jean',
            'slug' => 'veste-jean',
            'price' => 450.00,
            'is_active' => true,
        ]);
        ProductSize::create(['product_id' => $product->id, 'size' => 'M', 'color' => 'Bleu', 'stock' => 5]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson(route('api.v1.admin.products.update', $product->id), [
                'category_id' => $this->category->id,
                'name' => 'Veste Jean Modifiee',
                'price' => 400.00,
                'promotional_price' => 350.00,
                'variants' => [
                    ['size' => 'M', 'color' => 'Bleu', 'stock' => 8, 'is_active' => true],
                    ['size' => 'L', 'color' => 'Bleu', 'stock' => 4, 'is_active' => true],
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Veste Jean Modifiee')
            ->assertJsonPath('data.price', '400.00')
            ->assertJsonPath('data.promotional_price', '350.00')
            ->assertJsonPath('data.total_stock', 12);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Veste Jean Modifiee',
        ]);
    }

    /**
     * 10. Ajout d'une nouvelle variante via endpoint dédié.
     */
    public function test_ajout_nouvelle_variante_via_endpoint_dedie(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Sweat Capuche',
            'slug' => 'sweat-capuche',
            'price' => 280.00,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson(route('api.v1.admin.products.variants.store', $product->id), [
                'size' => 'XXL',
                'color' => 'Anthracite',
                'stock' => 6,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.size', 'XXL')
            ->assertJsonPath('data.color', 'Anthracite')
            ->assertJsonPath('data.stock', 6);

        $this->assertDatabaseHas('product_sizes', [
            'product_id' => $product->id,
            'size' => 'XXL',
            'color' => 'Anthracite',
            'stock' => 6,
        ]);
    }

    /**
     * 11. Ajustement du stock avec motif obligatoire.
     */
    public function test_ajustement_stock_avec_motif_obligatoire(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Pantalon Cargo',
            'slug' => 'pantalon-cargo',
            'price' => 320.00,
            'is_active' => true,
        ]);
        $variant = ProductSize::create(['product_id' => $product->id, 'size' => '32', 'color' => 'Beige', 'stock' => 4]);

        // Sans motif -> échec 422
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson(route('api.v1.admin.inventory.variants.adjust', $variant->id), [
                'new_stock' => 10,
            ])->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);

        // Avec motif -> succès 200
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson(route('api.v1.admin.inventory.variants.adjust', $variant->id), [
                'new_stock' => 10,
                'reason' => 'Arrivage fournisseur réassort',
            ])->assertOk()
            ->assertJsonPath('data.stock', 10);
    }

    /**
     * 12. Historique correct des mouvements (initial_stock, manual_adjustment).
     */
    public function test_historique_correct_des_mouvements(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson(route('api.v1.admin.products.store'), [
                'category_id' => $this->category->id,
                'name' => 'Chemise Lin',
                'price' => 250.00,
                'variants' => [
                    ['size' => 'L', 'color' => 'Blanc', 'stock' => 20],
                ],
            ]);

        $response->assertStatus(201);
        $variant = ProductSize::first();

        // 1er mouvement : initial_stock
        $this->assertDatabaseHas('stock_movements', [
            'product_size_id' => $variant->id,
            'type' => StockMovement::TYPE_INITIAL_STOCK,
            'quantity_delta' => 20,
        ]);

        // 2e mouvement : ajustement manuel
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson(route('api.v1.admin.inventory.variants.adjust', $variant->id), [
                'new_stock' => 25,
                'reason' => 'Comptage inventaire',
            ])->assertOk();

        $this->assertDatabaseHas('stock_movements', [
            'product_size_id' => $variant->id,
            'type' => StockMovement::TYPE_MANUAL_ADJUSTMENT,
            'quantity_before' => 20,
            'quantity_delta' => 5,
            'quantity_after' => 25,
            'reason' => 'Comptage inventaire',
        ]);
    }

    /**
     * 13. Protection des endpoints pour les utilisateurs non administrateurs (401/403).
     */
    public function test_protection_des_endpoints_non_administrateur(): void
    {
        // Visiteur non authentifié -> 401
        $this->postJson(route('api.v1.admin.products.store'), [
            'name' => 'Hack Attempt',
        ])->assertStatus(401);

        // Utilisateur client authentifié mais is_admin = false -> 403
        $this->actingAs($this->client, 'sanctum')
            ->postJson(route('api.v1.admin.products.store'), [
                'name' => 'Client Attempt',
            ])->assertStatus(403);
    }

    /**
     * 14. Conservation de l'historique : désactivation plutôt que suppression si historique.
     */
    public function test_desactivation_plutot_que_suppression_si_historique(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Jean Historique',
            'slug' => 'jean-historique',
            'price' => 300.00,
            'is_active' => true,
        ]);
        $variant = ProductSize::create(['product_id' => $product->id, 'size' => 'M', 'color' => 'Standard', 'stock' => 5]);

        // Création d'un mouvement de stock pour cette variante
        StockMovement::create([
            'product_size_id' => $variant->id,
            'type' => StockMovement::TYPE_INITIAL_STOCK,
            'quantity_before' => 0,
            'quantity_delta' => 5,
            'quantity_after' => 5,
            'reason' => 'Initial',
        ]);

        // Tentative de suppression du produit
        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson(route('api.v1.admin.products.destroy', $product->id));

        $response->assertOk();
        // Le produit ne doit PAS être supprimé, mais désactivé (is_active = false)
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_active' => false,
        ]);
    }

    /**
     * 15. Cohérence des statistiques du dashboard.
     */
    public function test_coherence_des_statistiques_du_dashboard(): void
    {
        $prod1 = Product::create(['category_id' => $this->category->id, 'name' => 'P1', 'slug' => 'p1', 'price' => 100, 'is_active' => true]);
        ProductSize::create(['product_id' => $prod1->id, 'size' => 'S', 'color' => 'Standard', 'stock' => 10, 'is_active' => true]);
        ProductSize::create(['product_id' => $prod1->id, 'size' => 'M', 'color' => 'Standard', 'stock' => 2, 'is_active' => true]); // stock faible (<= 5)

        $prod2 = Product::create(['category_id' => $this->category->id, 'name' => 'P2', 'slug' => 'p2', 'price' => 150, 'is_active' => true]);
        ProductSize::create(['product_id' => $prod2->id, 'size' => 'L', 'color' => 'Standard', 'stock' => 0, 'is_active' => true]); // rupture

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson(route('api.v1.admin.dashboard'));

        $response->assertOk();
        $kpis = $response->json('data.kpis');

        $this->assertSame(2, $kpis['total_products']);
        $this->assertSame(3, $kpis['total_variants']);
        $this->assertSame(2, $kpis['available_variants']);
        $this->assertSame(12, $kpis['total_stock']);
        $this->assertSame(1, $kpis['out_of_stock_variants']);
        $this->assertSame(1, $kpis['low_stock_variants']);
    }

    /**
     * 16. Vérification des images et de leurs validations.
     */
    public function test_verification_images_et_validations(): void
    {
        Storage::fake('public');

        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Produit Image Test',
            'slug' => 'produit-image-test',
            'price' => 200.00,
            'is_active' => true,
        ]);

        $validImage = UploadedFile::fake()->image('jean.jpg', 800, 800)->size(1500);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson(route('api.v1.admin.products.images.store', $product->id), [
                'image' => $validImage,
                'is_main' => true,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('images_produits', [
            'produit_id' => $product->id,
            'est_principale' => true,
        ]);

        // Fichier non image rejeté (422)
        $invalidFile = UploadedFile::fake()->create('malicious.pdf', 100);
        $this->actingAs($this->admin, 'sanctum')
            ->postJson(route('api.v1.admin.products.images.store', $product->id), [
                'image' => $invalidFile,
            ])->assertStatus(422)
            ->assertJsonValidationErrors(['image']);
    }

    /**
     * Test de mise à jour directe d'une variante spécifique.
     */
    public function test_mise_a_jour_directe_variante_specifique(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Veste Cuir',
            'slug' => 'veste-cuir',
            'price' => 800.00,
            'is_active' => true,
        ]);
        $variant = ProductSize::create(['product_id' => $product->id, 'size' => 'M', 'color' => 'Marron', 'stock' => 3, 'is_active' => true]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson(route('api.v1.admin.products.variants.update', [$product->id, $variant->id]), [
                'color' => 'Noir Profond',
                'stock' => 7,
                'reason' => 'Changement couleur et réassort',
                'is_active' => true,
            ]);

        $response->assertOk()
            ->assertJsonPath('data.color', 'Noir Profond')
            ->assertJsonPath('data.stock', 7);

        $this->assertSame('Noir Profond', $variant->fresh()->color);
        $this->assertSame(7, $variant->fresh()->stock);

        $this->assertDatabaseHas('stock_movements', [
            'product_size_id' => $variant->id,
            'type' => StockMovement::TYPE_MANUAL_ADJUSTMENT,
            'quantity_before' => 3,
            'quantity_delta' => 4,
            'quantity_after' => 7,
            'reason' => 'Changement couleur et réassort',
        ]);
    }
}
