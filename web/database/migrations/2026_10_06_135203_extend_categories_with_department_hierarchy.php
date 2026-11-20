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
        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique(['name']);
            $table->foreignId('parent_id')->nullable()->constrained('categories')->restrictOnDelete();
            $table->string('slug', 220)->nullable()->unique();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->unique(['parent_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::table('categories')
            ->select('name')->groupBy('name')->havingRaw('COUNT(*) > 1')->exists()) {
            throw new RuntimeException('Category names repeat across departments. Resolve them before restoring the flat taxonomy; no rows have been deleted.');
        }

        Schema::table('categories', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropUnique(['parent_id', 'name']);
            $table->dropUnique(['slug']);
            $table->dropColumn(['parent_id', 'slug', 'sort_order', 'is_active']);
            $table->unique('name');
        });
    }
};
