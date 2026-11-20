<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_orders', function (Blueprint $t) {
            $t->unsignedBigInteger('coins_redeemed_cents')->default(0);
            $t->unsignedBigInteger('merchandise_cash_cents')->nullable();
            $t->unsignedBigInteger('cod_due_cents')->nullable();
        });
        Schema::create('buyer_wallets', function (Blueprint $t) {
            $t->id();
            $t->foreignId('buyer_id')->unique()->constrained('users')->restrictOnDelete();
            $t->unsignedBigInteger('balance_cents')->default(0);
        });
        Schema::create('wallet_transactions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('buyer_id')->constrained('users')->restrictOnDelete();
            $t->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $t->foreignId('order_id')->nullable()->constrained()->restrictOnDelete();
            $t->foreignId('parcel_return_id')->nullable()->constrained('parcel_returns')->restrictOnDelete();
            $t->string('type', 40);
            $t->bigInteger('amount_cents');
            $t->unsignedBigInteger('balance_after_cents');
            $t->string('reference', 100)->unique();
            $t->string('operation_key', 150)->unique();
            $t->timestamp('created_at')->useCurrent();
            $t->index(['buyer_id', 'id']);
        });
        Schema::create('coin_allocations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('seller_order_id')->unique()->constrained()->restrictOnDelete();
            $t->foreignId('wallet_transaction_id')->constrained()->restrictOnDelete();
            $t->unsignedBigInteger('amount_cents');
            $t->timestamp('restored_at')->nullable();
            $t->timestamp('created_at')->useCurrent();
        });
        Schema::create('refund_offers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('parcel_return_id')->constrained('parcel_returns')->restrictOnDelete();
            $t->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $t->unsignedBigInteger('product_cents');
            $t->unsignedBigInteger('shipping_cents');
            $t->unsignedBigInteger('return_shipping_cents')->default(0);
            $t->unsignedBigInteger('coin_restore_cents');
            $t->unsignedBigInteger('cash_refund_cents');
            $t->string('method', 20);
            $t->string('responsibility', 30);
            $t->text('reason');
            $t->timestamp('accepted_at')->nullable();
            $t->foreignId('accepted_by')->nullable()->constrained('users')->restrictOnDelete();
            $t->timestamp('created_at')->useCurrent();
        });
        Schema::table('parcel_returns', function (Blueprint $t) {
            $t->foreignId('refund_offer_id')->nullable()->constrained()->restrictOnDelete();
            $t->string('refund_method', 20)->nullable();
            $t->unsignedBigInteger('coins_refunded_cents')->default(0);
            $t->unsignedBigInteger('cash_refunded_cents')->default(0);
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Preserve wallet liabilities and payment snapshots; use a forward migration.');
    }
};
