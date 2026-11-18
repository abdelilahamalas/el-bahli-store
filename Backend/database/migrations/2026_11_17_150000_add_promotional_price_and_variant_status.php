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
            $table->decimal('promotional_price', 10, 2)->nullable()->after('price');
        });

        Schema::table('product_sizes', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('stock');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('promotional_price');
        });

        Schema::table('product_sizes', function (Blueprint $table) {
            $table->dropColumn('is_active');
        });
    }
};
