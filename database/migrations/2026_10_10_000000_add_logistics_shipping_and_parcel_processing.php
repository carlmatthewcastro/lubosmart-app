<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commerce_settings', fn (Blueprint $table) => $table->boolean('logistics_shipping_enabled')->default(false));
        Schema::create('shipping_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_area_id')->unique()->constrained()->restrictOnDelete();
            $table->unsignedInteger('base_fee_cents');
            $table->unsignedInteger('included_weight_grams');
            $table->unsignedInteger('extra_kg_fee_cents');
            $table->unsignedInteger('max_weight_grams');
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });
        Schema::table('products', fn (Blueprint $table) => $table->unsignedInteger('weight_grams')->nullable());
        Schema::table('seller_orders', function (Blueprint $table) {
            $table->json('shipping_quote')->nullable();
            $table->unsignedInteger('shipping_weight_grams')->nullable();
        });
        Schema::table('deliveries', function (Blueprint $table) {
            $table->timestamp('pickup_approved_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('sorted_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', fn (Blueprint $table) => $table->dropColumn(['pickup_approved_at', 'received_at', 'sorted_at']));
        Schema::table('seller_orders', fn (Blueprint $table) => $table->dropColumn(['shipping_quote', 'shipping_weight_grams']));
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn('weight_grams'));
        Schema::dropIfExists('shipping_rates');
        Schema::table('commerce_settings', fn (Blueprint $table) => $table->dropColumn('logistics_shipping_enabled'));
    }
};
