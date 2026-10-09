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
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['buyer', 'seller', 'rider', 'logistics', 'courier', 'sorting_center', 'admin'])->nullable()->change();
            $table->enum('status', ['unverified', 'incomplete', 'pending', 'approved', 'rejected', 'suspended', 'deactivated'])->default('unverified')->change();
            if (Schema::hasColumn('users', 'logistics_id')) {
                $table->renameColumn('logistics_id', 'sorting_center_id');
            }
        });
        Schema::table('registration_applications', function (Blueprint $table) {
            $table->enum('requested_role', ['buyer', 'seller', 'rider', 'logistics', 'courier', 'sorting_center'])->change();
        });
        foreach (['rider' => 'courier', 'logistics' => 'sorting_center'] as $old => $new) {
            DB::table('users')->where('role', $old)->update(['role' => $new]);
            DB::table('registration_applications')->where('requested_role', $old)->update(['requested_role' => $new]);
        }
        DB::table('users')->where('status', 'incomplete')->whereNull('email_verified_at')->update(['status' => 'unverified']);
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['buyer', 'seller', 'courier', 'sorting_center', 'admin'])->nullable()->change();
            if (! Schema::hasIndex('users', 'users_role_status_index')) {
                $table->index(['role', 'status']);
            }
        });
        Schema::table('registration_applications', function (Blueprint $table) {
            $table->enum('requested_role', ['buyer', 'seller', 'courier', 'sorting_center'])->change();
            if (! Schema::hasIndex('registration_applications', 'registration_applications_sorting_center_id_status_index')) {
                $table->index(['sorting_center_id', 'status']);
            }
        });
        if (! Schema::hasTable('registration_application_drafts')) {
            Schema::create('registration_application_drafts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('registration_application_id')->unique('application_drafts_application_unique');
                $table->json('data');
                $table->dateTime('saved_at');
                $table->timestamps();
            });
        }
        if (! collect(Schema::getForeignKeys('registration_application_drafts'))->contains(fn ($key) => $key['columns'] === ['registration_application_id'])) {
            Schema::table('registration_application_drafts', function (Blueprint $table) {
                $table->foreign('registration_application_id', 'application_drafts_application_foreign')->references('id')->on('registration_applications')->cascadeOnDelete();
            });
        }
        if (Schema::hasColumn('registration_applications', 'draft_data')) {
            DB::table('registration_applications')->whereNotNull('draft_data')->orderBy('id')->chunkById(200, function ($applications) {
                foreach ($applications as $application) {
                    DB::table('registration_application_drafts')->updateOrInsert(['registration_application_id' => $application->id], [
                        'data' => $application->draft_data,
                        'saved_at' => $application->draft_saved_at ?? $application->updated_at,
                        'created_at' => $application->created_at, 'updated_at' => $application->updated_at,
                    ]);
                }
            });
            Schema::table('registration_applications', fn (Blueprint $table) => $table->dropColumn(['draft_data', 'draft_saved_at']));
        }
        Schema::table('addresses', function (Blueprint $table) {
            if (! Schema::hasColumn('addresses', 'street')) {
                $table->string('street', 160)->nullable();
            }
            if (! Schema::hasColumn('addresses', 'house_number')) {
                $table->string('house_number', 30)->nullable();
            }
        });
        if (! Schema::hasTable('email_verification_tokens')) {
            Schema::create('email_verification_tokens', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
                $table->string('email', 160);
                $table->string('token_hash', 64)->unique();
                $table->dateTime('expires_at')->index();
                $table->timestamp('consumed_at')->nullable();
                $table->dateTime('last_sent_at');
                $table->timestamps();
            });
        }
        Schema::table('audit_events', function (Blueprint $table) {
            if (! Schema::hasColumn('audit_events', 'old_status')) {
                $table->string('old_status', 30)->nullable();
            }
            if (! Schema::hasColumn('audit_events', 'new_status')) {
                $table->string('new_status', 30)->nullable();
            }
            if (! Schema::hasColumn('audit_events', 'reason')) {
                $table->text('reason')->nullable();
            }
        });
        DB::table('audit_events')->whereNotNull('changes')->orderBy('id')->chunkById(200, function ($events) {
            foreach ($events as $event) {
                $changes = json_decode($event->changes, true) ?: [];
                DB::table('audit_events')->where('id', $event->id)->update([
                    'old_status' => $changes['from'] ?? $changes['before']['status'] ?? null,
                    'new_status' => $changes['to'] ?? $changes['after']['status'] ?? null,
                    'reason' => $changes['reason'] ?? null,
                ]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException('Use a forward migration to preserve account decisions, verification, and drafts.');
    }
};
