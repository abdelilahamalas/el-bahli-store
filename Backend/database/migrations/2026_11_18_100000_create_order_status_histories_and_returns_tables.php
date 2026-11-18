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
        // 1. Enrich orders table with workflow timestamps and internal admin notes
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('processing_at')->nullable()->after('confirmed_at');
            $table->timestamp('return_requested_at')->nullable()->after('delivered_at');
            $table->timestamp('return_received_at')->nullable()->after('return_requested_at');
            $table->timestamp('returned_at')->nullable()->after('return_received_at');
            $table->text('admin_notes')->nullable()->after('note');
        });

        // 2. Create order_status_histories table
        Schema::create('order_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('from_status');
            $table->string('to_status');
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'created_at']);
        });

        // 3. Create order_returns table
        Schema::create('order_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('order_item_id')->constrained('order_items')->cascadeOnDelete();
            $table->foreignId('product_size_id')->constrained('product_sizes')->cascadeOnDelete();
            $table->unsignedInteger('quantity_returned');
            $table->unsignedInteger('quantity_resellable')->default(0);
            $table->unsignedInteger('quantity_damaged')->default(0);
            $table->boolean('restocked')->default(false);
            $table->string('reason')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['order_id', 'product_size_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_returns');
        Schema::dropIfExists('order_status_histories');

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'processing_at',
                'return_requested_at',
                'return_received_at',
                'returned_at',
                'admin_notes',
            ]);
        });
    }
};
