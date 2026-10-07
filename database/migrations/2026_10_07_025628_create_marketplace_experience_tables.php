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
        Schema::table('orders', function (Blueprint $table) {
            $table->uuid('checkout_key')->nullable();
            $table->unique(['buyer_id', 'checkout_key']);
        });
        Schema::create('order_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_order_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->text('body');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_messages');
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['buyer_id', 'checkout_key']);
            $table->dropColumn('checkout_key');
        });
    }
};
