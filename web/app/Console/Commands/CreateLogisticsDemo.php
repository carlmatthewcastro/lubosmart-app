<?php

namespace App\Console\Commands;

use App\Models\Address;
use App\Models\Category;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CreateLogisticsDemo extends Command
{
    protected $signature = 'lubosmart:logistics-demo {account : Existing logistics account ID} {--center= : Choose an owned operational center when more than one exists}';

    protected $description = 'Add clearly labelled, local-only sample parcels without resetting existing records';

    public function handle(): int
    {
        if (! app()->environment('local', 'testing')) {
            $this->error('Demo parcels are only available in local and testing environments.');

            return self::FAILURE;
        }
        $owner = User::query()->find($this->argument('account'));
        if (! $owner || $owner->role !== 'logistics' || $owner->status !== 'approved') {
            $this->error('Choose an approved logistics account.');

            return self::FAILURE;
        }
        $centers = $owner->logisticsCenters()->where('is_active', true)->where(fn ($query) => $query->whereNull('company_user_id')->orWhere('company_user_id', $owner->id))->when($this->option('center'), fn ($query, $id) => $query->where('logistics_centers.id', $id))->get();
        if ($centers->count() !== 1) {
            $this->error('Choose exactly one owned operational center using --center.');

            return self::FAILURE;
        }
        $center = $centers->first();
        $credentials = [];
        $rows = DB::transaction(function () use ($owner, $center, &$credentials) {
            User::query()->whereKey($owner->id)->lockForUpdate()->firstOrFail();
            $accounts = [];
            foreach (['buyer', 'seller', 'rider'] as $role) {
                $email = 'demo-logistics-'.$owner->id.'-'.$role.'@example.invalid';
                $user = User::query()->where('email', $email)->first();
                if (! $user) {
                    $password = Str::password(20);
                    $user = User::query()->create(['name' => 'DEMO '.ucfirst($role).' '.$owner->id, 'email' => $email, 'role' => $role, 'password' => $password]);
                    $user->forceFill(['status' => 'approved', 'email_verified_at' => now()])->save();
                    $credentials[$email] = $password;
                    if ($role === 'rider') {
                        $user->forceFill(['logistics_center_id' => $center->id, 'logistics_company_id' => $owner->id])->save();
                        $user->logisticsCenters()->attach($center->id, ['granted_by' => $owner->id]);
                        $user->application()->create(['requested_role' => 'rider', 'status' => 'approved', 'logistics_center_id' => $center->id]);
                    }
                }
                if ($user->role !== $role || ($role === 'rider' && ($user->logistics_center_id !== $center->id || $user->logistics_company_id !== $owner->id))) {
                    throw new \RuntimeException('A reserved demo account has conflicting ownership. No data was changed.');
                }
                $accounts[$role] = $user;
            }
            $store = Store::query()->firstOrCreate(['user_id' => $accounts['seller']->id], ['name' => 'DEMO Logistics Store '.$owner->id, 'status' => 'approved', 'description' => 'Synthetic local test parcels. No physical shipment.']);
            $category = Category::query()->firstOrCreate(['name' => 'DEMO Logistics Items'], ['slug' => 'demo-logistics-items', 'is_active' => false]);
            $product = Product::query()->firstOrCreate(['store_id' => $store->id, 'name' => 'DEMO Test Parcel'], ['category_id' => $category->id, 'price' => 100, 'stock' => 0, 'weight_grams' => 500, 'status' => 'hidden']);
            $address = ['recipient_name' => 'DEMO Recipient', 'phone' => '09000000000', 'line1' => 'DEMO 10 Test Street', 'barangay' => 'Sample Barangay', 'city' => 'Sample City', 'province' => 'Sample Province', 'region' => 'DEMO Region', 'zip' => '0000'];
            Address::query()->firstOrCreate(['user_id' => $accounts['seller']->id, 'label' => 'DEMO pickup'], $address);
            $area = DB::table('service_areas')->where('code', 'DEMO-'.$owner->id.'-'.$center->id)->first();
            if (! $area) {
                $id = DB::table('service_areas')->insertGetId(['logistics_center_id' => $center->id, 'code' => 'DEMO-'.$owner->id.'-'.$center->id, 'name' => 'DEMO Sample Barangay - local testing only', 'province_code' => '000000001', 'city_code' => '000000002', 'barangay_code' => '000000003', 'province_name' => $address['province'], 'city_name' => $address['city'], 'barangay_name' => $address['barangay'], 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
                $area = DB::table('service_areas')->find($id);
            }
            DB::table('rider_service_area')->insertOrIgnore(['rider_id' => $accounts['rider']->id, 'service_area_id' => $area->id]);
            $rows = [];
            foreach (['pickups', 'incoming', 'sorting', 'dispatch', 'monitoring'] as $stage) {
                $marker = 'DEMO-LOGISTICS-'.$owner->id.'-'.$center->id.'-'.$stage;
                $order = Order::query()->where('buyer_id', $accounts['buyer']->id)->where('shipping_line2', $marker)->first();
                if (! $order) {
                    $order = Order::query()->create(['buyer_id' => $accounts['buyer']->id, 'shipping_recipient_name' => 'DEMO '.$stage.' recipient', 'shipping_phone' => $address['phone'], 'shipping_line1' => $address['line1'], 'shipping_line2' => $marker, 'shipping_barangay' => $address['barangay'], 'shipping_city' => $address['city'], 'shipping_province' => $address['province'], 'shipping_region' => $address['region'], 'shipping_zip' => $address['zip'], 'subtotal' => 100, 'shipping_total' => 50, 'total' => 150, 'payment_method' => 'cod', 'status' => 'processing']);
                    $parcel = $order->sellerOrders()->create(['store_id' => $store->id, 'subtotal' => 100, 'shipping_fee' => 50, 'shipping_weight_grams' => 500, 'shipping_quote' => ['basis' => 'destination_and_weight', 'demo' => true, 'base_fee_cents' => 5000, 'extra_kg' => 0], 'status' => 'shipped']);
                    $parcel->items()->create(['product_id' => $product->id, 'product_name' => 'DEMO parcel - '.$stage, 'quantity' => 1, 'price_each' => 100]);
                    $delivery = $parcel->delivery()->create(['logistics_center_id' => $center->id, 'service_area_id' => $area->id, 'rider_id' => $stage === 'pickups' ? null : $accounts['rider']->id, 'status' => $stage === 'pickups' ? 'unassigned' : ($stage === 'monitoring' ? 'out_for_delivery' : 'picked_up'), 'pickup_approved_at' => $stage === 'pickups' ? null : now()->subHour(), 'picked_up_at' => $stage === 'pickups' ? null : now()->subMinutes(45), 'received_at' => in_array($stage, ['sorting', 'dispatch', 'monitoring'], true) ? now()->subMinutes(30) : null, 'sorted_at' => in_array($stage, ['dispatch', 'monitoring'], true) ? now()->subMinutes(15) : null]);
                    if ($stage === 'monitoring') {
                        $delivery->update(['dispatch_prepared_at' => now()->subMinutes(10), 'dispatch_accepted_at' => now()->subMinutes(5), 'dispatch_reference' => (string) Str::uuid()]);
                    }
                    DB::table('parcel_events')->insert(['delivery_id' => $delivery->id, 'logistics_center_id' => $center->id, 'actor_id' => $owner->id, 'type' => 'demo_seeded', 'reference' => (string) Str::uuid(), 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
                } else {
                    $delivery = Delivery::query()->whereHas('sellerOrder', fn ($query) => $query->where('order_id', $order->id))->firstOrFail();
                }
                $rows[] = [$stage, $delivery->id, $delivery->seller_order_id, $delivery->ensureTrackingReference(), $delivery->status];
            }

            return $rows;
        });
        $path = 'demo/logistics-'.$owner->id.'-credentials.json';
        if ($credentials) {
            $saved = json_decode(Storage::disk('local')->get($path) ?? '{}', true) ?: [];
            Storage::disk('local')->put($path, json_encode([...$saved, ...$credentials], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
        }
        $this->table(['Starting queue', 'Parcel / delivery ID', 'Waybill / seller order ID', 'Tracking reference', 'Current status'], $rows);
        $this->info('DEMO parcels ready. Existing orders and progress were preserved. No shipping rates or global settings were changed.');
        $this->line('Test logins are saved privately at storage/app/private/'.$path);
        $this->warn('Synthetic records appear in local queues and reports. Do not physically ship them.');

        return self::SUCCESS;
    }
}
