<?php

namespace Database\Seeders;

use App\Models\Delivery;
use App\Models\LogisticsCenter;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class RiderDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local', 'testing')) {
            throw new RuntimeException('Rider demo data is only available in local and testing environments.');
        }
        DB::transaction(function () {
            $email = 'demo-rider-logistics@example.invalid';
            $owner = User::query()->where('email', $email)->first();
            if (! $owner) {
                $password = Str::password(20);
                $owner = User::query()->create(['name' => 'DEMO Rider Logistics', 'email' => $email, 'password' => $password, 'role' => 'logistics']);
                $owner->forceFill(['status' => 'approved', 'email_verified_at' => now()])->save();
                Storage::disk('local')->put('demo/logistics-login.json', json_encode(['email' => $owner->email, 'password' => $password, 'dashboard' => '/dashboard/logistics'], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
            }
            if ($owner->role !== 'logistics' || ! $owner->hasVerifiedEmail() || $owner->status !== 'approved') {
                throw new RuntimeException('The reserved demo owner has changed. Existing account state was preserved.');
            }
            $center = LogisticsCenter::query()->firstOrCreate(['code' => 'DEMO-RIDER'], ['name' => 'DEMO Rider Logistics', 'address' => 'Synthetic local testing address', 'is_active' => true]);
            if ($center->company_user_id && $center->company_user_id !== $owner->id) {
                throw new RuntimeException('The reserved demo center has conflicting ownership.');
            }
            $center->forceFill(['company_user_id' => $owner->id])->save();
            $owner->logisticsCenters()->syncWithoutDetaching([$center->id => ['granted_by' => $owner->id]]);
            if (Artisan::call('lubosmart:logistics-demo', ['account' => $owner->id, '--center' => $center->id]) !== 0) {
                throw new RuntimeException('Could not prepare Rider demo parcels.');
            }
            $rider = User::query()->where('email', 'demo-logistics-'.$owner->id.'-rider@example.invalid')->firstOrFail();
            foreach (Delivery::query()->where('rider_id', $rider->id)->orWhereHas('sellerOrder.order', fn ($q) => $q->where('shipping_line2', 'DEMO-LOGISTICS-'.$owner->id.'-'.$center->id.'-pickups'))->get() as $parcel) {
                if (DB::table('parcel_events')->where('delivery_id', $parcel->id)->where('type', 'rider_demo_prepared')->exists()) {
                    continue;
                }
                $stage = $parcel->sellerOrder->order->shipping_line2;
                if (str_ends_with($stage, '-pickups') && $parcel->status === 'unassigned') {
                    $parcel->update(['rider_id' => $rider->id, 'status' => 'assigned', 'pickup_approved_at' => now()]);
                }
                if (str_ends_with($stage, '-dispatch')) {
                    $parcel->update(['status' => 'in_transit', 'dispatch_prepared_at' => now(), 'dispatch_reference' => (string) Str::uuid()]);
                }
                if (str_ends_with($stage, '-monitoring')) {
                    $parcel->update(['dispatch_prepared_at' => now(), 'dispatch_accepted_at' => now(), 'dispatch_reference' => (string) Str::uuid()]);
                }
                DB::table('parcel_events')->insert(['delivery_id' => $parcel->id, 'logistics_center_id' => $center->id, 'actor_id' => $owner->id, 'type' => 'rider_demo_prepared', 'reference' => (string) Str::uuid(), 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            }
            $credentials = json_decode(Storage::disk('local')->get('demo/logistics-'.$owner->id.'-credentials.json'), true, 512, JSON_THROW_ON_ERROR);
            Storage::disk('local')->put('demo/rider-login.json', json_encode(['email' => $rider->email, 'password' => $credentials[$rider->email], 'dashboard' => '/dashboard/rider'], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
        });
        $this->command?->info('Demo ready. Private logins: storage/app/private/demo/rider-login.json and logistics-login.json. Reruns preserve passwords and parcel progress; existing owner passwords are never reset.');
        if (! Storage::disk('local')->exists('demo/logistics-login.json')) {
            $this->command?->warn('This demo company predates saved owner logins. Use its existing credentials, or prepare samples under your own logistics account with lubosmart:logistics-demo.');
        }
    }
}
