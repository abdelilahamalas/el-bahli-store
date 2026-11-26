<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Permet la suppression définitive des produits tout en préservant 100% de l'historique
     * des mouvements de stock et des retours de commandes.
     */
    public function up(): void
    {
        $isSqlite = DB::getDriverName() === 'sqlite';

        // 1. Mise à jour de la table stock_movements
        if (!$isSqlite) {
            Schema::table('stock_movements', function (Blueprint $table) {
                $table->dropForeign('stock_movements_product_size_id_foreign');
            });
        }

        Schema::table('stock_movements', function (Blueprint $table) use ($isSqlite) {
            $table->unsignedBigInteger('product_size_id')->nullable()->change();
            if (!Schema::hasColumn('stock_movements', 'variant_label')) {
                $table->string('variant_label', 100)->nullable()->after('product_size_id');
            }
            if (!$isSqlite) {
                $table->foreign('product_size_id', 'stock_movements_product_size_id_foreign')
                    ->references('id')
                    ->on('product_sizes')
                    ->nullOnDelete();
            }
        });

        // 2. Mise à jour de la table order_returns
        if (!$isSqlite) {
            Schema::table('order_returns', function (Blueprint $table) {
                $table->dropForeign('order_returns_product_size_id_foreign');
            });
        }

        Schema::table('order_returns', function (Blueprint $table) use ($isSqlite) {
            $table->unsignedBigInteger('product_size_id')->nullable()->change();
            if (!$isSqlite) {
                $table->foreign('product_size_id', 'order_returns_product_size_id_foreign')
                    ->references('id')
                    ->on('product_sizes')
                    ->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $isSqlite = DB::getDriverName() === 'sqlite';

        if (!$isSqlite) {
            Schema::table('order_returns', function (Blueprint $table) {
                $table->dropForeign('order_returns_product_size_id_foreign');
                $table->foreign('product_size_id', 'order_returns_product_size_id_foreign')
                    ->references('id')
                    ->on('product_sizes')
                    ->cascadeOnDelete();
            });

            Schema::table('stock_movements', function (Blueprint $table) {
                $table->dropForeign('stock_movements_product_size_id_foreign');
                $table->dropColumn('variant_label');
                $table->foreign('product_size_id', 'stock_movements_product_size_id_foreign')
                    ->references('id')
                    ->on('product_sizes')
                    ->cascadeOnDelete();
            });
        }
    }
};
