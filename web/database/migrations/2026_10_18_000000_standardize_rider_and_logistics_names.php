<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        Schema::withoutForeignKeyConstraints(function () {
            $this->convertRoles(['courier' => 'rider', 'sorting_center' => 'logistics']);
            $this->renameSchema('sorting_centers', 'logistics_centers', 'sorting_center_user', 'logistics_center_user', 'sorting_center_id', 'logistics_center_id');
        });
    }

    public function down(): void
    {
        Schema::withoutForeignKeyConstraints(function () {
            $this->renameSchema('logistics_centers', 'sorting_centers', 'logistics_center_user', 'sorting_center_user', 'logistics_center_id', 'sorting_center_id');
            $this->convertRoles(['rider' => 'courier', 'logistics' => 'sorting_center']);
        });
    }

    private function convertRoles(array $names): void
    {
        foreach (['users' => 'role', 'registration_applications' => 'requested_role'] as $table => $column) {
            $roles = ['buyer', 'seller', ...array_keys($names), ...array_values($names)];
            if ($table === 'users') {
                $roles[] = 'admin';
            }
            Schema::table($table, function (Blueprint $blueprint) use ($column, $roles, $table) {
                $definition = $blueprint->enum($column, $roles);
                if ($table === 'users') {
                    $definition->nullable();
                }
                $definition->change();
            });
            foreach ($names as $old => $new) {
                DB::table($table)->where($column, $old)->update([$column => $new]);
            }
            $roles = ['buyer', 'seller', ...array_values($names)];
            if ($table === 'users') {
                $roles[] = 'admin';
            }
            Schema::table($table, function (Blueprint $blueprint) use ($column, $roles, $table) {
                $definition = $blueprint->enum($column, $roles);
                if ($table === 'users') {
                    $definition->nullable();
                }
                $definition->change();
            });
        }
    }

    private function renameSchema(string $oldTable, string $newTable, string $oldPivot, string $newPivot, string $oldColumn, string $newColumn): void
    {
        DB::table('registration_application_drafts')->orderBy('id')->chunkById(200, function ($drafts) use ($oldColumn, $newColumn) {
            foreach ($drafts as $draft) {
                $data = json_decode($draft->data, true, 512, JSON_THROW_ON_ERROR);
                if (array_key_exists($oldColumn, $data)) {
                    $data[$newColumn] = $data[$oldColumn];
                    unset($data[$oldColumn]);
                    DB::table('registration_application_drafts')->where('id', $draft->id)->update(['data' => json_encode($data, JSON_THROW_ON_ERROR)]);
                }
            }
        });
        $schema = DB::connection()->getDriverName() === 'mysql' ? DB::connection()->getDatabaseName() : null;
        foreach (Schema::getTableListing($schema) as $table) {
            if (Schema::hasColumn($table, $oldColumn)) {
                Schema::table($table, fn (Blueprint $blueprint) => $blueprint->renameColumn($oldColumn, $newColumn));
            }
        }
        Schema::rename($oldTable, $newTable);
        Schema::rename($oldPivot, $newPivot);
    }
};
