<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('subtotal', 10, 2)->after('shipping_zip');
            $table->decimal('shipping_total', 10, 2)->after('subtotal');
        });

        Schema::table('seller_orders', function (Blueprint $table) {
            $table->decimal('subtotal', 10, 2)->after('store_id');
        });

        Schema::create('commerce_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->decimal('shipping_fee_per_seller_order', 10, 2)->default(50.00);
            $table->timestamps();
        });

        DB::table('commerce_settings')->insert([
            'id' => 1,
            'shipping_fee_per_seller_order' => 50.00,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('commerce_settings');

        Schema::table('seller_orders', function (Blueprint $table) {
            $table->dropColumn('subtotal');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['subtotal', 'shipping_total']);
        });
    }
};
