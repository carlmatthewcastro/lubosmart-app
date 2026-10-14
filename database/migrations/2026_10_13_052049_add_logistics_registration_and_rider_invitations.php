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
        $seen = [];
        $plates = [];
        DB::table('rider_profiles')->whereNotNull('plate_number')->orderBy('id')->chunkById(500, function ($rows) use (&$plates) {
            foreach ($rows as $row) {
                $key = strtoupper(trim($row->plate_number));
                if ($key === '') {
                    continue;
                } if (isset($plates[$key])) {
                    throw new RuntimeException('Duplicate legacy rider plates require reconciliation before migration.');
                } $plates[$key] = $row->id;
            }
        });
        DB::table('registration_applications')->where('requested_role', 'sorting_center')->whereNotNull('business_name')->orderBy('id')->chunkById(500, function ($rows) use (&$seen) {
            foreach ($rows as $row) {
                $key = mb_strtolower(trim($row->business_name));
                if ($key === '') {
                    continue;
                }
                if (isset($seen[$key])) {
                    throw new RuntimeException('Duplicate legacy company names require reconciliation. Application IDs '.$seen[$key].', '.$row->id);
                }
                $seen[$key] = $row->id;
            }
        });
        foreach (['company_name_normalized' => 160, 'sec_number' => 11, 'position' => 100] as $column => $length) {
            if (! Schema::hasColumn('registration_applications', $column)) {
                Schema::table('registration_applications', function (Blueprint $table) use ($column, $length) {
                    $field = $table->string($column, $length)->nullable();
                    if (in_array($column, ['company_name_normalized', 'sec_number'], true)) {
                        if (DB::getDriverName() === 'mysql') {
                            $field->collation('utf8mb4_bin');
                        } $field->unique();
                    }
                });
            }
        }
        if (! Schema::hasColumn('registration_applications', 'service_regions')) {
            Schema::table('registration_applications', fn (Blueprint $t) => $t->json('service_regions')->nullable());
        }
        if (! Schema::hasColumn('registration_applications', 'service_region_names')) {
            Schema::table('registration_applications', fn (Blueprint $t) => $t->json('service_region_names')->nullable());
        }
        DB::table('registration_applications')->where('requested_role', 'sorting_center')->whereNotNull('business_name')->orderBy('id')->chunkById(500, function ($rows) {
            foreach ($rows as $row) {
                DB::table('registration_applications')->where('id', $row->id)->update(['company_name_normalized' => trim($row->business_name) === '' ? null : mb_strtolower(trim($row->business_name))]);
            }
        });
        if (! Schema::hasColumn('sorting_centers', 'company_user_id')) {
            Schema::table('sorting_centers', fn (Blueprint $t) => $t->foreignId('company_user_id')->nullable()->constrained('users')->restrictOnDelete());
        }
        if (! Schema::hasColumn('users', 'logistics_company_id')) {
            Schema::table('users', fn (Blueprint $t) => $t->foreignId('logistics_company_id')->nullable()->constrained('users')->restrictOnDelete());
        }
        if (! Schema::hasColumn('rider_profiles', 'license_number')) {
            Schema::table('rider_profiles', function (Blueprint $t) {
                $t->string('license_number', 13)->nullable()->unique();
                $t->date('license_expires_at')->nullable();
                $t->string('plate_normalized', 30)->nullable()->unique();
            });
        }
        DB::table('rider_profiles')->whereNotNull('plate_number')->orderBy('id')->chunkById(500, function ($rows) {
            foreach ($rows as $row) {
                DB::table('rider_profiles')->where('id', $row->id)->update(['plate_normalized' => trim($row->plate_number) === '' ? null : strtoupper(trim($row->plate_number))]);
            }
        });
        if (! Schema::hasTable('rider_activation_invitations')) {
            Schema::create('rider_activation_invitations', function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
                $t->foreignId('company_id')->constrained('users')->restrictOnDelete();
                $t->foreignId('sorting_center_id')->constrained()->restrictOnDelete();
                $t->string('email', 160);
                $t->string('token_hash', 64)->unique();
                // Explicit dates avoid implicit zero TIMESTAMP defaults on XAMPP MariaDB.
                $t->dateTime('expires_at');
                $t->dateTime('consumed_at')->nullable();
                $t->dateTime('last_sent_at');
                $t->dateTime('window_started_at');
                $t->unsignedTinyInteger('send_count')->default(1);
                $t->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException('Forward-only migration: preserve company ownership and invitation history.');
    }
};
