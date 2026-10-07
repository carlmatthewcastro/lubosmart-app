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
        Schema::table('registration_applications', function (Blueprint $table) {
            $table->json('draft_data')->nullable();
            $table->timestamp('draft_saved_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('registration_applications', function (Blueprint $table) {
            $table->dropColumn(['draft_data', 'draft_saved_at']);
        });
    }
};
