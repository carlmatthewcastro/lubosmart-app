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
        Schema::table('users', fn (Blueprint $table) => $table->string('rider_capability', 20)->default('both'));
        Schema::table('deliveries', function (Blueprint $table) {
            $table->foreignId('pickup_rider_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('delivery_rider_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('pickup_assigned_at')->nullable();
            $table->timestamp('delivery_assigned_at')->nullable();
            $table->string('custody_type', 20)->nullable();
            $table->foreignId('custody_rider_id')->nullable()->constrained('users')->restrictOnDelete();
        });
        Schema::create('parcel_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->constrained()->restrictOnDelete();
            $table->foreignId('rider_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('assigned_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('logistics_center_id')->constrained()->restrictOnDelete();
            $table->string('leg', 20);
            $table->string('reason', 1000)->nullable();
            $table->timestamp('assigned_at');
        });
        // Only checkpoint actors are reliable evidence of historical physical work.
        DB::table('deliveries')->orderBy('id')->chunkById(200, function ($deliveries) {
            foreach ($deliveries as $delivery) {
                $events = DB::table('parcel_events')->where('delivery_id', $delivery->id)->orderBy('id')->get();
                $pickup = $events->firstWhere('type', 'picked_up');
                $handover = $events->firstWhere('type', 'accept_dispatch') ?? $events->firstWhere('type', 'delivered');
                DB::table('deliveries')->where('id', $delivery->id)->update([
                    'pickup_rider_id' => $pickup?->actor_id ?? (! $delivery->received_at ? $delivery->rider_id : null),
                    'delivery_rider_id' => $handover?->actor_id ?? ($delivery->dispatch_prepared_at ? $delivery->rider_id : null),
                ]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new RuntimeException('Assignment and capability history must be preserved. Use a forward migration.');
    }
};
