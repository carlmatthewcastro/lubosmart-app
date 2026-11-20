<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_vouchers', fn (Blueprint $t) => $t->boolean('is_public')->default(false));
    }

    public function down(): void
    {
        Schema::table('store_vouchers', fn (Blueprint $t) => $t->dropColumn('is_public'));
    }
};
