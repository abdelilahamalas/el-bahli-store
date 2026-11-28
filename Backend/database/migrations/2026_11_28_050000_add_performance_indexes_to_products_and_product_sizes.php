<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->index('is_active', 'products_is_active_idx');
        });

        Schema::table('product_sizes', function (Blueprint $table) {
            $table->index('stock', 'product_sizes_stock_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_is_active_idx');
        });

        Schema::table('product_sizes', function (Blueprint $table) {
            $table->dropIndex('product_sizes_stock_idx');
        });
    }
};
