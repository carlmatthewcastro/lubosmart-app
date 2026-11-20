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
        Schema::table('support_cases', function (Blueprint $table) {
            $table->string('fulfillment_concern', 40)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::table('support_cases')->whereNotNull('fulfillment_concern')->exists()) {
            throw new RuntimeException('Fulfillment concern reports exist. Use a forward migration.');
        }
        Schema::table('support_cases', function (Blueprint $table) {
            $table->dropColumn('fulfillment_concern');
        });
    }
};
