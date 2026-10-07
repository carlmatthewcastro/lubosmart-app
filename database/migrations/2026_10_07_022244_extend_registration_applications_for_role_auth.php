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
        Schema::table('registration_applications', function (Blueprint $table) {
            $table->enum('requested_role', ['buyer', 'seller', 'rider', 'logistics'])->change();
            $table->string('business_name', 160)->nullable();
            $table->foreignId('sorting_center_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('address_id')->nullable()->constrained()->nullOnDelete();
        });
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->string('province_code', 9)->nullable();
            $table->string('city_code', 9)->nullable();
            $table->string('barangay_code', 9)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::table('registration_applications')->where('requested_role', 'logistics')->exists()) {
            throw new RuntimeException('Logistics applications must be preserved. Use a forward migration.');
        }
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn(['province_code', 'city_code', 'barangay_code']);
        });
        Schema::table('registration_applications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('address_id');
            $table->dropConstrainedForeignId('sorting_center_id');
            $table->dropColumn('business_name');
            $table->enum('requested_role', ['buyer', 'seller', 'rider'])->change();
        });
    }
};
