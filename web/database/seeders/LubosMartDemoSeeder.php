<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\ParcelReturn;
use App\Models\Product;
use App\Models\User;
use App\Services\Demo\DemoAccounts;
use App\Services\Demo\DemoCatalog;
use App\Services\Demo\DemoFixtures;
use App\Services\Demo\DemoOrders;
use App\Services\Demo\DemoPreflight;
use App\Services\Demo\DemoVerification;
use Illuminate\Database\Seeder;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class LubosMartDemoSeeder extends Seeder
{
    public function run(): void
    {
        $context = app(DemoPreflight::class)->inspect();
        $originalTime = Carbon::getTestNow();
        $originalMail = Mail::getFacadeRoot();
        $originalNotifications = Notification::getFacadeRoot();
        $originalBus = Bus::getFacadeRoot();
        $originalHttp = Http::getFacadeRoot();
        Mail::fake();
        Notification::fake();
        Bus::fake();
        // Factory::fake mutates its receiver. Isolate it so later requests retain their client.
        Http::swap(new Factory(app('events')));
        Http::fake(fn () => throw new RuntimeException('Outbound HTTP is forbidden while creating demo fixtures.'));
        try {
            // The root row serializes all runs, including multiple CLI processes on MySQL.
            DB::table('demo_fixtures')->insertOrIgnore(['fixture_key' => 'lubosmart-v1:root', 'record_type' => 'manifest',
                'metadata' => json_encode(['base_time' => now()->subDays(3)->toDateTimeString()]), 'created_at' => now(), 'updated_at' => now()]);
            DB::transaction(function () use ($context) {
                $root = DB::table('demo_fixtures')->where('fixture_key', 'lubosmart-v1:root')->lockForUpdate()->first();
                $base = Carbon::parse(json_decode($root->metadata, true, flags: JSON_THROW_ON_ERROR)['base_time']);
                $verification = app(DemoVerification::class);
                $before = $verification->snapshot();
                Carbon::setTestNow($base);
                $accounts = app(DemoAccounts::class)->create($context);
                $products = app(DemoCatalog::class)->create($accounts['seller']);
                $orders = app(DemoOrders::class)->create($context, $accounts, $products, $base);
                Carbon::setTestNow($base->copy()->addHours(48));
                app(DemoOrders::class)->returnsAndReviews($context, $orders);
                Carbon::setTestNow($base->copy()->addHours(49));
                $orders[] = app(DemoOrders::class)->coinPurchase($context, $products);
                $verification->preserve($before, allowDemoInventory: true);
                $summary = $verification->reconcile();
                $report = ['summary' => $summary, 'facility' => $context['center']->only(['id', 'name']),
                    'primary_accounts' => collect($context['accounts'])->map(fn ($user) => [...$user->only(['id', 'role', 'name', 'email']),
                        'password' => 'Existing password retained; use current password', 'store' => $user->store?->name])->all(),
                    'additional_accounts' => User::query()->whereIn('id', app(DemoFixtures::class)->ids(User::class))->orderBy('id')->get()
                        ->map(fn ($user) => [...$user->only(['id', 'role', 'name', 'email']), 'store' => $user->store?->name,
                            'locations' => $user->addresses()->get(['line1', 'barangay', 'city', 'province'])->toArray()])->values()->all(),
                    'coverage' => collect($context['areas'])->map(fn ($area) => (array) $area)->all(),
                    'primary_locations' => collect($context['addresses'])->map(fn ($address) => $address->only(['line1', 'barangay', 'city', 'province', 'zip']))->all(),
                    'operational_configuration' => $context['setting']->only(['platform_commission_basis_points', 'return_window_days', 'logistics_shipping_enabled', 'shipping_fee_per_seller_order']),
                    'catalog' => Product::query()->whereIn('id', app(DemoFixtures::class)->ids(Product::class))->with('variants', 'store:id,name')->get()
                        ->map(fn ($product) => [...$product->only(['id', 'name', 'price', 'stock', 'weight_grams', 'image_path']),
                            'store' => $product->store->name, 'variants' => $product->variants->toArray()])->all(),
                    'returns' => ParcelReturn::query()->whereIn('id', app(DemoFixtures::class)->ids(ParcelReturn::class))
                        ->with('task')->get()->map(fn ($case) => ['id' => $case->id, 'seller_order_id' => $case->seller_order_id,
                            'refund_status' => $case->refund_status, 'transport_status' => $case->task?->status, 'rider_id' => $case->rider_id,
                            'refund_cents' => $case->refund_cents, 'return_reference' => $case->task?->reference])->all(),
                    'eligible_new_refund_order_id' => $orders[0]->id,
                    'credential_file' => 'lubosmart-credentials.json (private; never publish)',
                    'scenario_guide' => Order::query()->whereIn('id', app(DemoFixtures::class)->ids(Order::class))->orderBy('id')->get()->map(fn ($order) => ['order_id' => $order->id, 'buyer_id' => $order->buyer_id,
                        'parcels' => $order->sellerOrders()->with('delivery', 'store')->get()->map(fn ($parcel) => [
                            'seller_order_id' => $parcel->id, 'store' => $parcel->store->name, 'seller_stage' => $parcel->status,
                            'tracking_reference' => $parcel->delivery?->tracking_reference, 'delivery_stage' => $parcel->delivery?->status,
                            'pickup_rider_id' => $parcel->delivery?->pickup_rider_id, 'delivery_rider_id' => $parcel->delivery?->delivery_rider_id,
                            'waybill' => '/orders/'.$parcel->id.'/waybill', 'net_products' => $parcel->subtotal,
                            'shipping_fee' => $parcel->shipping_fee, 'coins_redeemed_cents' => $parcel->coins_redeemed_cents,
                            'cod_due_cents' => $parcel->cod_due_cents])->all()])->all(),
                    'notes' => ['All evidence and reviews marked synthetic.', 'Compensation awaits an approved amount.',
                        'No external messages or payments sent.', 'Primary account passwords were not tested; no plaintext was supplied.',
                        'Real Google OAuth and physical QR/POD acceptance require operator verification.']];
                if (! Storage::disk('local')->put('demo/lubosmart-guide.json', json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR))) {
                    throw new RuntimeException('Cannot persist the private demonstration guide.');
                }
                chmod(Storage::disk('local')->path('demo/lubosmart-guide.json'), 0600);
                $this->writeCredentialGuide($report);
                $this->command?->info('Demo prepared: '.json_encode($summary).'. Private guides: storage/app/private/demo/.');
            });
        } finally {
            Carbon::setTestNow($originalTime);
            Mail::swap($originalMail);
            Notification::swap($originalNotifications);
            Bus::swap($originalBus);
            Http::swap($originalHttp);
        }
    }

    private function writeCredentialGuide(array $report): void
    {
        $disk = Storage::disk('local');
        $passwords = $disk->exists('demo/lubosmart-credentials.json') ? json_decode($disk->get('demo/lubosmart-credentials.json'), true, flags: JSON_THROW_ON_ERROR) : [];
        $lines = ['# Private LubosMart demonstration guide', '', 'Contains credentials. Never publish, commit or share in screenshots.', '',
            '| Role | Name | Email | Password / retained status | Store |', '| --- | --- | --- | --- | --- |'];
        foreach ([...array_values($report['primary_accounts']), ...$report['additional_accounts']] as $user) {
            $cells = [$user['role'], $user['name'], $user['email'], $passwords[$user['email']]['password'] ?? 'Existing password retained; use current password', $user['store'] ?? ''];
            $lines[] = '| '.implode(' | ', array_map(fn ($value) => '<code>'.str_replace('|', '\\|', htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')).'</code>', $cells)).' |';
        }
        $lines = [...$lines, '', '## Live demonstration sequence', '',
            '1. Use the primary Buyer to browse Valora, choose an option, review shipping and buy. New Google buyers must complete the existing verification and approval requirements.',
            '2. Use the primary Seller to prepare the new purchase and print its system waybill.',
            '3. Use the primary Logistics account to approve and assign pickup to the primary Rider.',
            '4. Use the primary Rider API and the assigned pickup below for QR scanning. Continue through actual facility receipt, sorting and dispatch.',
            '5. Complete a delivery with new proof; confirm the buyer tracking and administrator financial records.',
            '6. Use order #'.$report['eligible_new_refund_order_id'].' for a new eligible return request. Existing historical evidence is synthetic.',
            '', '## Parcels (see lubosmart-guide.json for amounts, addresses and return task references)', '',
            '| Order | Seller parcel | Store | Seller stage | Delivery stage | Tracking reference |', '| --- | --- | --- | --- | --- | --- |'];
        foreach ($report['scenario_guide'] as $order) {
            foreach ($order['parcels'] as $parcel) {
                $lines[] = '| '.implode(' | ', [$order['order_id'], $parcel['seller_order_id'], $parcel['store'], $parcel['seller_stage'], $parcel['delivery_stage'], $parcel['tracking_reference']]).' |';
            }
        }
        $lines = [...$lines, '', 'Primary Rider: '.config('demo.primary.rider').'. Preserve all live progress; do not reset orders to repeat a scan.',
            'Rider pay amounts are unseeded. Google provider login, physical phone QR capture and live proof capture still require operator verification.'];
        if (! $disk->put('demo/DEMO_GUIDE.md', implode(PHP_EOL, $lines).PHP_EOL)) {
            throw new RuntimeException('Cannot save the private credential guide.');
        }
        chmod($disk->path('demo/DEMO_GUIDE.md'), 0600);
    }
}
