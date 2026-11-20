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
        DB::table('stores')->orderBy('id')->chunkById(500, function ($stores) use (&$seen) {
            foreach ($stores as $store) {
                $key = mb_strtolower(trim($store->name));
                if (isset($seen[$key])) {
                    throw new RuntimeException('Duplicate normalized shop names exist. Reconcile store IDs '.$seen[$key].' and '.$store->id.' before migrating. No accounts were changed.');
                }
                $seen[$key] = $store->id;
            }
        });
        if (! Schema::hasColumn('stores', 'name_normalized')) {
            Schema::table('stores', function (Blueprint $table) {
                $column = $table->string('name_normalized', 160)->nullable()->unique();
                if (DB::getDriverName() === 'mysql') {
                    $column->collation('utf8mb4_bin');
                }
            });
        }
        DB::table('stores')->orderBy('id')->chunkById(500, function ($stores) {
            foreach ($stores as $store) {
                DB::table('stores')->where('id', $store->id)->update(['name_normalized' => mb_strtolower(trim($store->name))]);
            }
        });
        foreach (['registration_contract' => 40, 'seller_type' => 30, 'region_code' => 9, 'tin' => 15] as $column => $length) {
            if (! Schema::hasColumn('registration_applications', $column)) {
                Schema::table('registration_applications', function (Blueprint $table) use ($column, $length) {
                    $field = $table->string($column, $length)->nullable();
                    if ($column === 'tin') {
                        $field->unique();
                    }
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException('Forward-only migration: preserve business identifiers and registration history.');
    }
};
