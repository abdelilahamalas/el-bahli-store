<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Upgrade product_sizes to full variants (size + color + stock)
        Schema::table('product_sizes', function (Blueprint $table) {
            $table->index('product_id', 'product_sizes_product_id_idx');
        });

        Schema::table('product_sizes', function (Blueprint $table) {
            $table->dropUnique('product_sizes_product_id_size_unique');
            $table->string('color', 50)->default('Standard')->after('size');
            $table->unique(['product_id', 'size', 'color'], 'product_size_color_unique');
        });

        // 2. Create images_produits table for multi-image galleries
        Schema::create('images_produits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('produit_id')->constrained('products')->cascadeOnDelete();
            $table->string('chemin_image');
            $table->string('chemin_miniature')->nullable();
            $table->boolean('est_principale')->default(false);
            $table->unsignedInteger('ordre_affichage')->default(0);
            $table->string('texte_alternatif')->nullable();
            $table->timestamps();

            $table->index(['produit_id', 'est_principale']);
            $table->index(['produit_id', 'ordre_affichage']);
        });

        // 3. Migrate existing product images into images_produits without losing data or files
        $products = DB::table('products')->whereNotNull('image')->get();
        foreach ($products as $p) {
            DB::table('images_produits')->insert([
                'produit_id' => $p->id,
                'chemin_image' => $p->image,
                'chemin_miniature' => $p->thumbnail,
                'est_principale' => true,
                'ordre_affichage' => 1,
                'texte_alternatif' => $p->name,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 4. Add couleur_copie to order_items (historical orders preserved)
        Schema::table('order_items', function (Blueprint $table) {
            $table->string('couleur_copie', 50)->default('Standard')->after('size');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('couleur_copie');
        });

        Schema::dropIfExists('images_produits');

        Schema::table('product_sizes', function (Blueprint $table) {
            $table->dropUnique('product_size_color_unique');
            $table->dropColumn('color');
            $table->unique(['product_id', 'size'], 'product_sizes_product_id_size_unique');
        });
    }
};
