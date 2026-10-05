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
        Schema::create('stores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('name', 160);
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamp('created_at')->nullable()->useCurrent();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
        });

        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->timestamp('created_at')->nullable()->useCurrent();
        });

        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('label', 40);
            $table->string('line1', 200);
            $table->string('city', 100);
            $table->string('province', 100);
            $table->string('zip', 10);
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained();
            $table->string('name', 160);
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->unsignedInteger('stock')->default(0);
            $table->string('image_path', 255)->nullable();
            $table->enum('status', ['active', 'hidden'])->default('active');
            $table->timestamp('created_at')->nullable()->useCurrent();
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->unique(['cart_id', 'product_id'], 'cart_product_unique');
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users');
            $table->foreignId('address_id')->constrained('addresses');
            $table->enum('payment_method', ['cod'])->default('cod');
            $table->decimal('total', 10, 2);
            $table->enum('status', ['pending', 'processing', 'shipped', 'completed', 'cancelled'])
                ->default('pending');
            $table->timestamp('created_at')->nullable()->useCurrent();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('store_id')->constrained('stores');
            $table->unsignedInteger('quantity');
            $table->decimal('price_each', 10, 2);
            $table->enum('status', ['pending', 'processing', 'shipped'])->default('pending');
        });

        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('rider_id')->nullable()->constrained('users');
            $table->enum('status', ['unassigned', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed'])
                ->default('unassigned');
            $table->string('proof_photo_path', 255)->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deliveries');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('products');
        Schema::dropIfExists('addresses');
        Schema::dropIfExists('carts');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('stores');
    }
};
