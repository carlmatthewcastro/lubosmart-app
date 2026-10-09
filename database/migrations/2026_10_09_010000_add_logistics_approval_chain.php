<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('status', ['incomplete', 'pending', 'approved', 'rejected', 'suspended', 'deactivated'])->default('incomplete')->change();
            $table->foreignId('logistics_id')->nullable()->constrained('sorting_centers')->restrictOnDelete();
            $table->text('bank_account')->nullable();
        });
        Schema::table('deliveries', function (Blueprint $table) {
            $table->enum('status', ['unassigned', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed'])->default('unassigned')->change();
        });
        Schema::table('service_areas', function (Blueprint $table) {
            $table->string('province_name')->nullable();
            $table->string('city_name')->nullable();
            $table->string('barangay_name')->nullable();
        });
        DB::table('commerce_settings')->where('id', 1)->update(['platform_commission_basis_points' => 1000]);
        // Keep the existing applications as the authoritative rider affiliation.
        DB::table('users')->where('role', 'rider')->orderBy('id')->each(function ($user) {
            $centerId = DB::table('registration_applications')->where('user_id', $user->id)->value('sorting_center_id');
            $centerId ??= DB::table('sorting_center_user')->where('user_id', $user->id)->orderBy('sorting_center_id')->value('sorting_center_id');
            DB::table('users')->where('id', $user->id)->update(['logistics_id' => $centerId]);
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Account lifecycle migrations are forward-only to preserve approval history.');
    }
};
