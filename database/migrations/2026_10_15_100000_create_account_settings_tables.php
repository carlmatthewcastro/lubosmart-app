<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registration_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('users')->restrictOnDelete();
            $table->json('payload');
            $table->timestamp('created_at')->useCurrent();
        });
        Schema::create('change_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('users')->restrictOnDelete();
            $table->string('field');
            $table->json('old_value');
            $table->json('new_value');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('reason')->nullable();
            $table->timestamp('requested_at');
            $table->foreignId('reviewed_by')->nullable()->constrained('users');
            $table->timestamp('reviewed_at')->nullable();
            $table->index(['account_id', 'field', 'status']);
        });
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('actor_id')->constrained('users');
            $table->string('action');
            $table->string('field');
            $table->json('old_value')->nullable();
            $table->json('new_value')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
        Schema::create('psgc_locations', function (Blueprint $table) {
            $table->id();
            foreach (['region', 'province', 'city', 'barangay'] as $level) {
                $table->string($level.'_code', 10)->index();
                $table->string($level.'_name');
            }
            $table->string('postal_code', 4);
            $table->unique(['barangay_code', 'postal_code']);
        });
        Schema::create('account_service_areas', function (Blueprint $table) {
            $table->foreignId('account_id')->constrained('users')->restrictOnDelete();
            $table->string('region_code', 10);
            $table->primary(['account_id', 'region_code']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->json('notification_preferences')->nullable();
            $table->enum('status', ['unverified', 'incomplete', 'pending', 'approved', 'rejected', 'suspended', 'deactivated', 'pending_reverification'])->default('unverified')->change();
        });
    }

    public function down(): void
    {
        if (DB::table('users')->where('status', 'pending_reverification')->exists()) {
            throw new RuntimeException('Review pending re-verifications before rolling back account settings.');
        }
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('notification_preferences');
            $table->enum('status', ['unverified', 'incomplete', 'pending', 'approved', 'rejected', 'suspended', 'deactivated'])->default('unverified')->change();
        });
        foreach (['account_service_areas', 'psgc_locations', 'audit_logs', 'change_requests', 'registration_snapshots'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
