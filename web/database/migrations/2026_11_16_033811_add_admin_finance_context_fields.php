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
        Schema::table('deliveries', function (Blueprint $table) {
            $table->unsignedSmallInteger('return_window_days')->nullable();
        });
        Schema::table('logistics_remittances', function (Blueprint $table) {
            $table->string('external_reference', 100)->nullable()->unique();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Policy snapshots and receipt evidence must survive rollback attempts.
        throw new RuntimeException('Use a forward migration to preserve recorded financial context.');
    }
};
