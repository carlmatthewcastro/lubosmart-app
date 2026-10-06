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
        Schema::table('commerce_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('platform_commission_basis_points')->default(1000);
        });

        Schema::table('seller_orders', function (Blueprint $table) {
            // Existing orders have no agreed snapshot; never charge them retroactively.
            $table->unsignedSmallInteger('commission_basis_points')->nullable();
            $table->decimal('commission_amount', 10, 2)->nullable();
            $table->decimal('seller_proceeds', 10, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('seller_orders', function (Blueprint $table) {
            $table->dropColumn(['commission_basis_points', 'commission_amount', 'seller_proceeds']);
        });

        Schema::table('commerce_settings', function (Blueprint $table) {
            $table->dropColumn('platform_commission_basis_points');
        });
    }
};
