<?php

namespace Tests\Feature;

use App\Models\Categorie;
use App\Models\Category;
use App\Models\ImageProduit;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductSize;
use App\Models\Produit;
use App\Models\VarianteProduit;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ArchitectureBaseDeDonneesTest extends TestCase
{
    use RefreshDatabase;

    public function test_tables_and_columns_exist(): void
    {
        $this->assertTrue(Schema::hasTable('images_produits'));
        $this->assertTrue(Schema::hasColumns('images_produits', [
            'id', 'produit_id', 'chemin_image', 'chemin_miniature', 'est_principale', 'ordre_affichage', 'texte_alternatif', 'created_at', 'updated_at',
        ]));

        $this->assertTrue(Schema::hasColumn('product_sizes', 'color'));
        $this->assertTrue(Schema::hasColumn('order_items', 'couleur_copie'));
    }

    public function test_unique_constraint_on_product_size_color(): void
    {
        $category = Category::create([
            'name' => 'Test Cat',
            'slug' => 'test-cat',
        ]);

        $product = Product::create([
            'category_id' => $category->id,
            'name' => 'T-Shirt',
            'slug' => 't-shirt-unique',
            'price' => 100.00,
        ]);

        // Same size, DIFFERENT colors -> ALLOWED
        $variantNoir = ProductSize::create([
            'product_id' => $product->id,
            'size' => 'M',
            'color' => 'Noir',
            'stock' => 10,
        ]);

        $variantBlanc = ProductSize::create([
            'product_id' => $product->id,
            'size' => 'M',
            'color' => 'Blanc',
            'stock' => 5,
        ]);

        $this->assertNotNull($variantNoir);
        $this->assertNotNull($variantBlanc);

        // Same size, SAME color -> MUST THROW UNIQUE VIOLATION
        $this->expectException(QueryException::class);
        ProductSize::create([
            'product_id' => $product->id,
            'size' => 'M',
            'color' => 'Noir',
            'stock' => 3,
        ]);
    }

    public function test_product_images_and_gallery_relations(): void
    {
        $category = Category::create([
            'name' => 'Vestes',
            'slug' => 'vestes',
        ]);

        $product = Product::create([
            'category_id' => $category->id,
            'name' => 'Blouson Aviateur',
            'slug' => 'blouson-aviateur',
            'price' => 750.00,
        ]);

        $img1 = ImageProduit::create([
            'produit_id' => $product->id,
            'chemin_image' => 'products/main.webp',
            'chemin_miniature' => 'products/thumbnails/main.webp',
            'est_principale' => true,
            'ordre_affichage' => 1,
            'texte_alternatif' => 'Vue de face',
        ]);

        $img2 = ImageProduit::create([
            'produit_id' => $product->id,
            'chemin_image' => 'products/back.webp',
            'chemin_miniature' => 'products/thumbnails/back.webp',
            'est_principale' => false,
            'ordre_affichage' => 2,
            'texte_alternatif' => 'Vue de dos',
        ]);

        $this->assertCount(2, $product->images);
        $this->assertEquals('products/main.webp', $product->mainImage->chemin_image);
        $this->assertEquals($product->id, $img1->product->id);
    }

    public function test_french_model_aliases_work_identically(): void
    {
        $cat = Categorie::create([
            'name' => 'Sweats',
            'slug' => 'sweats',
        ]);

        $prod = Produit::create([
            'category_id' => $cat->id,
            'name' => 'Sweat Capuche',
            'slug' => 'sweat-capuche',
            'price' => 350.00,
        ]);

        $variante = VarianteProduit::create([
            'product_id' => $prod->id,
            'size' => 'L',
            'color' => 'Gris',
            'stock' => 15,
        ]);

        $this->assertEquals('Sweat Capuche', $prod->name);
        $this->assertEquals('Gris', $variante->color);
        $this->assertEquals($prod->id, $variante->product->id);
    }

    public function test_order_items_retain_couleur_copie(): void
    {
        $order = Order::create([
            'reference' => 'EB-ORD12345',
            'customer_name' => 'Karim',
            'customer_phone' => '+212600000000',
            'city' => 'Rabat',
            'address' => 'Hassan',
            'subtotal' => '350.00',
            'delivery_fee' => '0.00',
            'total' => '350.00',
        ]);

        $item = OrderItem::create([
            'order_id' => $order->id,
            'product_name' => 'Sweat Capuche',
            'size' => 'L',
            'couleur_copie' => 'Gris',
            'unit_price' => '350.00',
            'quantity' => 1,
            'line_total' => '350.00',
        ]);

        $this->assertEquals('Gris', $item->couleur_copie);
        $this->assertEquals($order->id, $item->order->id);
    }
}
