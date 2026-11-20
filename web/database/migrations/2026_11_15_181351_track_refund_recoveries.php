<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parcel_returns', function (Blueprint $t) {
            $t->unsignedBigInteger('seller_recovered_cents')->default(0);
            $t->unsignedBigInteger('logistics_recovered_cents')->default(0);
        });
        Schema::table('wallet_transactions', fn (Blueprint $t) => $t->text('notes')->nullable());
    }

    public function down(): void
    {
        throw new RuntimeException('Preserve recovery and correction history; use a forward migration.');
    }
};
