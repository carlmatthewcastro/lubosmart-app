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
        Schema::table('support_cases', fn (Blueprint $table) => $table->unsignedBigInteger('last_admin_seen_message_id')->nullable());
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('support_cases', fn (Blueprint $table) => $table->dropColumn('last_admin_seen_message_id'));
    }
};
