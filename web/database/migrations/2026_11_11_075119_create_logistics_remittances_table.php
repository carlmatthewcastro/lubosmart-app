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
        Schema::create('logistics_remittances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_order_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('logistics_center_id')->constrained()->restrictOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->unsignedBigInteger('amount_cents');
            $table->string('reference', 100)->unique();
            $table->date('received_on');
            $table->string('notes', 500)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::table('logistics_remittances')->exists()) {
            throw new RuntimeException('Cash remittance records exist. Use a forward migration.');
        }
        Schema::dropIfExists('logistics_remittances');
    }
};
