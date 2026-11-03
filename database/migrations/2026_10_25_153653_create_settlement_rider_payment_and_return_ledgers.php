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
        Schema::table('product_variants', function (Blueprint $table) {
            $table->boolean('is_legacy')->default(false);
        });
        Schema::create('seller_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_order_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->unsignedBigInteger('amount_cents');
            $table->string('reference', 100)->unique();
            $table->string('notes', 500)->nullable();
            $table->timestamps();
        });
        Schema::create('rider_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->constrained()->restrictOnDelete();
            $table->foreignId('rider_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('logistics_center_id')->constrained()->restrictOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->string('leg', 20);
            $table->unsignedBigInteger('amount_cents');
            $table->string('notes', 500);
            $table->string('payment_reference', 100)->nullable();
            $table->foreignId('paid_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->unique(['delivery_id', 'rider_id', 'leg']);
            $table->index(['rider_id', 'paid_at']);
        });
        Schema::create('parcel_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_order_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('rider_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('status', 30)->default('requested');
            $table->text('reason');
            $table->string('decision_reason', 500)->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('collected_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->string('condition', 30)->nullable();
            $table->boolean('restocked')->default(false);
            $table->unsignedBigInteger('refund_cents')->nullable();
            $table->unsignedBigInteger('seller_debit_cents')->default(0);
            $table->unsignedBigInteger('commission_reversal_cents')->default(0);
            $table->string('refund_reference', 100)->nullable()->unique();
            $table->foreignId('refunded_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('refunded_at')->nullable();
            $table->timestamps();
            $table->index(['buyer_id', 'status']);
        });
        Schema::create('return_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parcel_return_id')->constrained()->restrictOnDelete();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('action', 30);
            $table->text('notes');
            $table->timestamps();
        });
        Schema::create('seller_costs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->restrictOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->date('incurred_on');
            $table->string('category', 40);
            $table->string('description', 500);
            $table->unsignedBigInteger('amount_cents');
            $table->string('void_reason', 500)->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->timestamps();
            $table->index(['store_id', 'incurred_on']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::table('product_variants')->where('is_legacy', true)->exists()) {
            throw new RuntimeException('Restored historical stock exists. Use a forward migration.');
        }
        foreach (['seller_payouts', 'rider_payments', 'parcel_returns', 'seller_costs'] as $table) {
            if (DB::table($table)->exists()) {
                throw new RuntimeException('Financial or return records exist. Use a forward migration.');
            }
        }
        Schema::dropIfExists('return_events');
        Schema::dropIfExists('parcel_returns');
        Schema::dropIfExists('seller_costs');
        Schema::dropIfExists('rider_payments');
        Schema::dropIfExists('seller_payouts');
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('is_legacy');
        });
    }
};
