<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('name', 160);
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamps();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->timestamps();
        });

        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('label', 40);
            $table->string('recipient_name', 160);
            $table->string('phone', 30);
            $table->string('line1', 200);
            $table->string('line2', 200)->nullable();
            $table->string('barangay', 100);
            $table->string('city', 100);
            $table->string('province', 100);
            $table->string('region', 100);
            $table->string('zip', 10);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained();
            $table->foreignId('category_id')->constrained();
            $table->string('name', 160);
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->unsignedInteger('stock')->default(0);
            $table->string('image_path', 255)->nullable();
            $table->enum('status', ['active', 'hidden'])->default('active');
            $table->timestamps();
            $table->index(['category_id', 'status']);
            $table->index(['store_id', 'status']);
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->timestamps();
            $table->unique(['cart_id', 'product_id'], 'cart_product_unique');
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users');
            $table->foreignId('address_id')->nullable()->constrained()->nullOnDelete();
            $table->string('shipping_recipient_name', 160);
            $table->string('shipping_phone', 30);
            $table->string('shipping_line1', 200);
            $table->string('shipping_line2', 200)->nullable();
            $table->string('shipping_barangay', 100);
            $table->string('shipping_city', 100);
            $table->string('shipping_province', 100);
            $table->string('shipping_region', 100);
            $table->string('shipping_zip', 10);
            $table->enum('payment_method', ['cod'])->default('cod');
            $table->decimal('total', 10, 2);
            $table->enum('status', ['pending', 'processing', 'completed', 'cancelled'])->default('pending');
            $table->timestamps();
            $table->index(['buyer_id', 'created_at']);
        });

        Schema::create('seller_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained();
            $table->decimal('shipping_fee', 10, 2)->default(0);
            $table->enum('status', ['pending', 'processing', 'shipped', 'completed', 'cancelled'])
                ->default('pending');
            $table->timestamps();
            $table->unique(['order_id', 'store_id']);
            $table->index(['store_id', 'status']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained();
            $table->string('product_name', 160);
            $table->unsignedInteger('quantity');
            $table->decimal('price_each', 10, 2);
            $table->timestamps();
            $table->unique(['seller_order_id', 'product_id']);
        });

        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_order_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('rider_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['unassigned', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed'])
                ->default('unassigned');
            $table->string('proof_photo_path', 255)->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deliveries');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('seller_orders');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('products');
        Schema::dropIfExists('addresses');
        Schema::dropIfExists('carts');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('stores');
    }
};
