<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parcel_returns', function (Blueprint $table) {
            $table->index('seller_order_id', 'parcel_returns_parcel_lookup');
            $table->dropUnique(['seller_order_id']);
            $table->string('refund_status', 30)->default('pending');
            $table->boolean('physical_return_required')->nullable();
            $table->string('return_shipping_responsibility', 30)->nullable();
            $table->unsignedBigInteger('requested_shipping_cents')->default(0);
            $table->string('approval_fingerprint', 64)->nullable();
        });
        Schema::create('return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parcel_return_id')->constrained('parcel_returns')->restrictOnDelete();
            $table->foreignId('order_item_id')->constrained('order_items')->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->unsignedBigInteger('requested_cents');
            $table->unsignedBigInteger('approved_cents')->nullable();
            $table->unsignedInteger('approved_quantity')->nullable();
            $table->unique(['parcel_return_id', 'order_item_id']);
        });
        Schema::create('return_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parcel_return_id')->unique()->constrained('parcel_returns')->restrictOnDelete();
            $table->string('reference', 100)->unique();
            $table->string('status', 30)->default('approved');
            $table->json('buyer_address')->nullable();
            $table->json('seller_address')->nullable();
            $table->timestamp('seller_delivered_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });
        Schema::create('return_task_proofs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('return_task_id')->constrained('return_tasks')->restrictOnDelete();
            $table->string('leg', 20);
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('path');
            $table->string('recipient_name', 150);
            $table->timestamp('created_at');
            $table->unique(['return_task_id', 'leg']);
        });
        Schema::table('return_events', fn (Blueprint $table) => $table->string('evidence_path')->nullable());
        Schema::table('rider_payments', function (Blueprint $table) {
            $table->index('delivery_id', 'rider_payments_delivery_lookup');
            $table->dropUnique(['delivery_id', 'rider_id', 'leg']);
            $table->foreignId('return_task_id')->nullable()->constrained('return_tasks')->restrictOnDelete();
            $table->string('operation_key', 150)->nullable()->unique();
        });
        DB::table('rider_payments')->orderBy('id')->each(fn ($payment) => DB::table('rider_payments')->where('id', $payment->id)->update(['operation_key' => 'delivery:'.$payment->delivery_id.':'.$payment->rider_id.':'.$payment->leg]));
        Schema::table('refund_fund_entries', function (Blueprint $table) {
            $table->string('responsibility', 30)->nullable();
            $table->foreignId('logistics_center_id')->nullable()->constrained()->restrictOnDelete();
        });
        // Preserve facts only. Legacy approvals without financial terms need review.
        DB::table('parcel_returns')->whereIn('status', ['rejected', 'closed'])->update(['refund_status' => 'rejected']);
        DB::table('parcel_returns')->whereNotNull('refunded_at')->update(['refund_status' => 'credited']);
        DB::table('parcel_returns')->whereNotIn('status', ['requested', 'rejected', 'closed', 'refunded'])->update(['refund_status' => 'approved_uncredited']);
        DB::table('parcel_returns')->orderBy('id')->each(function ($case) {
            if ($case->refund_method === 'coins' && $case->refunded_at) {
                $credited = (int) DB::table('wallet_transactions')->where('parcel_return_id', $case->id)->whereIn('type', ['return_restoration', 'approved_refund_credit'])->sum('amount_cents');
                if ($credited !== (int) $case->coins_refunded_cents) {
                    DB::table('parcel_returns')->where('id', $case->id)->update(['refund_status' => 'approved_uncredited']);
                }
            }
            if (in_array($case->status, ['requested', 'rejected', 'closed'], true)) {
                return;
            }
            $parcel = DB::table('seller_orders')->where('id', $case->seller_order_id)->first();
            $order = $parcel ? DB::table('orders')->where('id', $parcel->order_id)->first() : null;
            $quote = $parcel?->shipping_quote ? json_decode($parcel->shipping_quote, true) : [];
            $sellerId = $parcel ? DB::table('stores')->where('id', $parcel->store_id)->value('user_id') : null;
            $sellerAddress = $quote['pickup_address'] ?? ($sellerId ? DB::table('addresses')->where('user_id', $sellerId)->orderByDesc('is_default')->first(['recipient_name', 'phone', 'line1', 'barangay', 'city', 'province']) : null);
            DB::table('return_tasks')->insert([
                'parcel_return_id' => $case->id, 'reference' => 'RT-LEGACY-'.$case->id,
                'status' => $case->status === 'refunded' ? ($case->received_at ? 'received' : 'legacy_unknown') : $case->status,
                'confirmed_at' => $case->received_at, 'created_at' => now(), 'updated_at' => now(),
                'confirmed_by' => $case->received_at ? DB::table('return_events')->where('parcel_return_id', $case->id)->where('action', 'receive')->orderBy('id')->value('actor_id') : null,
                'buyer_address' => $order ? json_encode(['recipient_name' => $order->shipping_recipient_name, 'phone' => $order->shipping_phone,
                    'line1' => $order->shipping_line1, 'barangay' => $order->shipping_barangay, 'city' => $order->shipping_city, 'province' => $order->shipping_province]) : null,
                'seller_address' => $sellerAddress ? json_encode($sellerAddress) : null,
            ]);
            DB::table('parcel_returns')->where('id', $case->id)->update(['physical_return_required' => true]);
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Preserve refund obligations and custody evidence; use a forward migration.');
    }
};
