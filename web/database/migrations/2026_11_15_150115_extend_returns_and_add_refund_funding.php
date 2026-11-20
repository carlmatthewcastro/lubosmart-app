<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commerce_settings', fn (Blueprint $t) => $t->unsignedSmallInteger('return_window_days')->default(7));
        Schema::table('parcel_returns', function (Blueprint $t) {
            $t->unsignedTinyInteger('workflow_version')->default(1);
            $t->string('reason_kind', 40)->nullable();
            $t->text('description')->nullable();
            $t->json('evidence_paths')->nullable();
            $t->foreignId('collection_rider_id')->nullable()->constrained('users')->restrictOnDelete();
            $t->foreignId('seller_return_rider_id')->nullable()->constrained('users')->restrictOnDelete();
            $t->timestamp('facility_received_at')->nullable();
            $t->timestamp('seller_dispatched_at')->nullable();
            $t->unsignedBigInteger('logistics_debit_cents')->default(0);
            $t->unsignedBigInteger('platform_expense_cents')->default(0);
            $t->unsignedBigInteger('return_shipping_cents')->default(0);
        });
        Schema::create('return_window_exceptions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('seller_order_id')->unique()->constrained()->restrictOnDelete();
            $t->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $t->text('reason');
            $t->timestamp('created_at')->useCurrent();
        });
        Schema::create('refund_reserves', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('available_cents')->default(0);
        });
        DB::table('refund_reserves')->insert(['id' => 1, 'available_cents' => 0]);
        Schema::create('refund_fund_entries', function (Blueprint $t) {
            $t->id();
            $t->bigInteger('amount_cents');
            $t->string('type', 40);
            $t->foreignId('parcel_return_id')->nullable()->constrained('parcel_returns')->restrictOnDelete();
            $t->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $t->string('operation_key', 150)->unique();
            $t->string('reference', 100)->unique();
            $t->text('notes');
            $t->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Preserve return and funding history; use a forward migration.');
    }
};
