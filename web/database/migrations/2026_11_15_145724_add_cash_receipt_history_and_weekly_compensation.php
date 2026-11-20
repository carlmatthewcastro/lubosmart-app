<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cod_receipt_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->constrained()->restrictOnDelete();
            $table->foreignId('rider_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('received_by')->constrained('users')->restrictOnDelete();
            $table->unsignedBigInteger('expected_cents');
            $table->unsignedBigInteger('actual_cents');
            $table->bigInteger('discrepancy_cents');
            $table->string('reference', 100);
            $table->string('operation_key', 36)->unique();
            $table->text('notes')->nullable();
            $table->timestamp('recorded_at');
        });
        Schema::create('weekly_rider_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rider_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('logistics_center_id')->constrained()->restrictOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->unsignedBigInteger('amount_cents');
            $table->date('payment_date');
            $table->string('payment_reference', 100)->nullable()->unique();
            $table->foreignId('paid_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['rider_id', 'period_start']);
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Preserve financial history; use a forward migration.');
    }
};
