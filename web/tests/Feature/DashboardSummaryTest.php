<?php

use App\Models\Delivery;
use App\Models\Order;
use App\Models\ParcelReturn;
use App\Models\SellerOrder;
use App\Models\SellerPayout;
use App\Models\Store;
use App\Models\User;
use App\Models\WeeklyRiderPayment;
use Database\Seeders\RiderDemoSeeder;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

function dashboardSummaryParcel(User $seller, string $amount): SellerOrder
{
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Summary test store '.$seller->id, 'status' => 'approved']);
    $order = Order::query()->create([
        'buyer_id' => User::factory()->create()->id, 'shipping_recipient_name' => 'Test buyer',
        'shipping_phone' => '09171234567', 'shipping_line1' => 'Test street', 'shipping_barangay' => 'Test',
        'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR',
        'shipping_zip' => '1000', 'subtotal' => $amount, 'shipping_total' => 0, 'total' => $amount, 'status' => 'completed',
    ]);
    $parcel = SellerOrder::query()->create(['order_id' => $order->id, 'store_id' => $store->id, 'subtotal' => $amount, 'shipping_fee' => 0, 'seller_proceeds' => $amount, 'status' => 'completed']);
    Delivery::query()->create(['seller_order_id' => $parcel->id, 'status' => 'delivered', 'delivered_at' => now()]);

    return $parcel;
}

test('seller dashboard separates completed sales from payouts and excludes other stores', function () {
    $this->travelTo(now()->setTime(12, 0));
    $seller = User::factory()->create(['role' => 'seller']);
    $parcel = dashboardSummaryParcel($seller, '125.00');
    $foreign = dashboardSummaryParcel(User::factory()->create(['role' => 'seller']), '900.00');
    SellerPayout::query()->create(['seller_order_id' => $foreign->id, 'recorded_by' => $seller->id, 'amount_cents' => 90000, 'reference' => 'FOREIGN']);

    $this->actingAs($seller)->get('/dashboard/seller')->assertInertia(fn (Assert $page) => $page
        ->where('summary.sales', '125')->where('summary.received', '0.00')
        ->has('summary.series', 7)->where('summary.series.6.value', 125)
        ->where('summary.series.0.value', 0)->has('recentOrders', 1));

    SellerPayout::query()->create(['seller_order_id' => $parcel->id, 'recorded_by' => $seller->id, 'amount_cents' => 12500, 'reference' => 'OWN']);
    $this->get('/dashboard/seller')->assertInertia(fn (Assert $page) => $page
        ->where('summary.sales', '125')->where('summary.received', '125.00'));
});

test('buyer dashboard counts shipped parcels even while the parent order remains processing and scopes wallet credits', function () {
    $parcel = dashboardSummaryParcel(User::factory()->create(['role' => 'seller']), '100.00');
    $parcel->update(['status' => 'shipped']);
    $parcel->order->update(['status' => 'processing']);
    $buyer = $parcel->order->buyer;
    DB::table('buyer_wallets')->insert(['buyer_id' => $buyer->id, 'balance_cents' => 12345]);
    DB::table('buyer_wallets')->insert(['buyer_id' => User::factory()->create()->id, 'balance_cents' => 99000]);

    $this->actingAs($buyer)->get('/dashboard/buyer')->assertInertia(fn (Assert $page) => $page
        ->where('stats.Orders to receive', 1)->where('stats.Orders to ship', 0)
        ->where('stats.Available Lubos Coins', 123.45)->where('stats.Completed orders', 0));
});

test('logistics dashboard with no operational centers shows recorded zero values', function () {
    $this->actingAs(User::factory()->create(['role' => 'logistics']))->get('/dashboard/logistics')
        ->assertInertia(fn (Assert $page) => $page->where('summary.atCenter', 0)
            ->where('summary.outForDelivery', 0)->where('summary.deliveredToday', 0)
            ->where('summary.receivedCod', '0')->where('summary.returns', 0));
});

test('admin dashboard reports commission after recorded reversals separately from gross sales', function () {
    $parcel = dashboardSummaryParcel(User::factory()->create(['role' => 'seller']), '100.00');
    $parcel->update(['commission_amount' => '10.00']);
    ParcelReturn::query()->create(['seller_order_id' => $parcel->id, 'buyer_id' => $parcel->order->buyer_id,
        'status' => 'refunded', 'reason' => 'Test return', 'commission_reversal_cents' => 300]);

    $this->actingAs(User::factory()->create(['role' => 'admin']))->get('/dashboard/admin')
        ->assertInertia(fn (Assert $page) => $page->where('summary.orders', 1)
            ->where('summary.commission', '7.00')->where('summary.returns', 0));
});

test('rider dashboard separates own recorded compensation from other riders and refreshes paid amounts', function () {
    $this->seed(RiderDemoSeeder::class);
    $rider = User::query()->where('role', 'rider')->sole();
    $other = User::factory()->create(['role' => 'rider']);
    $payment = WeeklyRiderPayment::query()->create(['rider_id' => $rider->id, 'logistics_center_id' => $rider->logistics_center_id,
        'recorded_by' => $rider->logistics_company_id, 'period_start' => today()->startOfWeek(), 'period_end' => today()->endOfWeek(), 'amount_cents' => 50000, 'payment_date' => today(), 'payment_reference' => 'OWN-WEEKLY']);
    WeeklyRiderPayment::query()->create(['rider_id' => $other->id, 'logistics_center_id' => $rider->logistics_center_id,
        'recorded_by' => $rider->logistics_company_id, 'period_start' => today()->startOfWeek(), 'period_end' => today()->endOfWeek(), 'amount_cents' => 90000, 'payment_date' => today(), 'payment_reference' => 'OTHER-WEEKLY', 'paid_at' => now()]);

    $this->actingAs($rider)->get('/dashboard/rider')->assertInertia(fn (Assert $page) => $page
        ->where('summary.weekly', '500.00')->where('summary.paid', '0.00')->where('summary.fees', '0.00'));
    $payment->update(['paid_at' => now()]);
    $this->get('/dashboard/rider')->assertInertia(fn (Assert $page) => $page->where('summary.paid', '500.00'));
});
