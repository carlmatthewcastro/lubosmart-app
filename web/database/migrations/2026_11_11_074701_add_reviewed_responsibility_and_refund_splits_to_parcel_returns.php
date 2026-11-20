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
        Schema::table('parcel_returns', function (Blueprint $table) {
            $table->string('responsibility', 30)->nullable();
            $table->string('responsibility_reason', 500)->nullable();
            $table->foreignId('responsibility_reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('responsibility_reviewed_at')->nullable();
            $table->unsignedBigInteger('product_refund_cents')->nullable();
            $table->unsignedBigInteger('shipping_refund_cents')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::table('parcel_returns')->whereNotNull('responsibility')->orWhereNotNull('product_refund_cents')->exists()) {
            throw new RuntimeException('Reviewed financial records exist. Use a forward migration.');
        }
        Schema::table('parcel_returns', function (Blueprint $table) {
            $table->dropConstrainedForeignId('responsibility_reviewed_by');
            $table->dropColumn(['responsibility', 'responsibility_reason', 'responsibility_reviewed_at', 'product_refund_cents', 'shipping_refund_cents']);
        });
    }
};
