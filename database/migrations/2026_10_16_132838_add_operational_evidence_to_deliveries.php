<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->string('tracking_reference', 40)->nullable()->unique();
            $table->string('receipt_condition', 30)->nullable();
            $table->string('sorting_bin', 80)->nullable();
            $table->timestamp('dispatch_prepared_at')->nullable();
            $table->uuid('dispatch_reference')->nullable();
            $table->timestamp('dispatch_accepted_at')->nullable();
            $table->string('exception_status', 40)->nullable();
        });
        Schema::table('cod_collections', function (Blueprint $table) {
            $table->decimal('received_amount', 10, 2)->nullable();
            $table->string('handover_reference', 100)->nullable();
            $table->text('discrepancy_reason')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropUnique(['tracking_reference']);
            $table->dropColumn(['tracking_reference', 'receipt_condition', 'sorting_bin', 'dispatch_prepared_at', 'dispatch_reference', 'dispatch_accepted_at', 'exception_status']);
        });
        Schema::table('cod_collections', function (Blueprint $table) {
            $table->dropColumn(['received_amount', 'handover_reference', 'discrepancy_reason']);
        });
    }
};
