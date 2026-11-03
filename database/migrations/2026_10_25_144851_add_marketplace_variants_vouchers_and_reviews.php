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
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->unsignedInteger('stock')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['product_id', 'name']);
        });
        Schema::table('cart_items', function (Blueprint $table) {
            $table->foreignId('product_variant_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('variant_key', 30)->default('base');
            $table->unique(['cart_id', 'product_id', 'variant_key'], 'cart_product_variant_unique');
            $table->dropUnique('cart_product_unique');
        });
        Schema::table('order_items', function (Blueprint $table) {
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->string('variant_name', 100)->nullable();
            $table->string('variant_key', 30)->default('base');
            $table->unique(['seller_order_id', 'product_id', 'variant_key'], 'order_product_variant_unique');
            $table->dropUnique('order_items_seller_order_id_product_id_unique');
        });
        Schema::create('store_vouchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('code', 30)->unique();
            $table->unsignedInteger('amount_cents');
            $table->unsignedInteger('minimum_cents')->default(0);
            $table->unsignedInteger('usage_limit');
            $table->timestamp('expires_at');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::table('seller_orders', function (Blueprint $table) {
            $table->foreignId('store_voucher_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('voucher_code', 30)->nullable();
            $table->decimal('discount_amount', 12, 2)->default(0);
        });
        Schema::create('product_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_item_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('body');
            $table->boolean('is_visible')->default(true);
            $table->string('moderation_reason', 500)->nullable();
            $table->timestamps();
            $table->index(['product_id', 'is_visible']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Populated variant carts cannot safely be collapsed into the old unique key.
        if (DB::table('cart_items')->whereNotNull('product_variant_id')->exists()
            || DB::table('order_items')->whereNotNull('product_variant_id')->exists()
            || DB::table('store_vouchers')->exists() || DB::table('product_reviews')->exists()) {
            throw new RuntimeException('Commerce data exists. Use a forward migration instead of rolling back.');
        }
        Schema::dropIfExists('product_reviews');
        Schema::table('seller_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('store_voucher_id');
            $table->dropColumn(['voucher_code', 'discount_amount']);
        });
        Schema::dropIfExists('store_vouchers');
        Schema::table('order_items', function (Blueprint $table) {
            $table->unique(['seller_order_id', 'product_id']);
            $table->dropUnique('order_product_variant_unique');
            $table->dropConstrainedForeignId('product_variant_id');
            $table->dropColumn(['variant_name', 'variant_key']);
        });
        Schema::table('cart_items', function (Blueprint $table) {
            $table->unique(['cart_id', 'product_id'], 'cart_product_unique');
            $table->dropUnique('cart_product_variant_unique');
            $table->dropConstrainedForeignId('product_variant_id');
            $table->dropColumn('variant_key');
        });
        Schema::dropIfExists('product_variants');
    }
};
