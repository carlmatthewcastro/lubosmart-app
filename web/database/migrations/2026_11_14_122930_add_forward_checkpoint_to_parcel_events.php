<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', fn (Blueprint $table) => $table->text('delivery_notes')->nullable());
        Schema::table('parcel_events', function (Blueprint $table) {
            // Preserve historical events; delivery timestamps also guard legacy checkpoints.
            $table->string('forward_checkpoint', 30)->nullable();
            $table->unique(['delivery_id', 'forward_checkpoint']);
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', fn (Blueprint $table) => $table->dropColumn('delivery_notes'));
        Schema::table('parcel_events', function (Blueprint $table) {
            $table->dropUnique(['delivery_id', 'forward_checkpoint']);
            $table->dropColumn('forward_checkpoint');
        });
    }
};
