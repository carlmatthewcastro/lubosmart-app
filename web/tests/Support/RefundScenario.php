<?php

use App\Models\Category;
use App\Models\Delivery;
use App\Models\LogisticsCenter;
use App\Models\LogisticsRemittance;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SellerOrder;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

function refundScenario(): array
{
    $buyer = User::factory()->create();
    $seller = User::factory()->create(['role' => 'seller']);
    $logistics = User::factory()->create(['role' => 'logistics']);
    $rider = User::factory()->create(['role' => 'rider']);
    $admin = User::factory()->create(['role' => 'admin']);
    $center = LogisticsCenter::query()->create(['code' => 'LEDGER-'.$logistics->id, 'name' => 'Ledger center '.$logistics->id, 'address' => 'Test']);
    $center->forceFill(['company_user_id' => $logistics->id])->save();
    foreach ([$logistics, $rider] as $user) {
        $user->logisticsCenters()->attach($center->id, ['granted_by' => $logistics->id]);
    }
    $rider->forceFill(['logistics_center_id' => $center->id])->save();
    $store = Store::query()->create(['user_id' => $seller->id, 'name' => 'Ledger store '.$seller->id, 'status' => 'approved']);
    $category = Category::query()->create(['name' => 'Test clothes']);
    $product = Product::query()->create(['store_id' => $store->id, 'category_id' => $category->id, 'name' => 'Cotton shirt', 'price' => 100, 'stock' => 8, 'status' => 'active']);
    $variant = ProductVariant::query()->create(['product_id' => $product->id, 'name' => 'Large / Purple', 'stock' => 8]);
    $order = Order::query()->create(['buyer_id' => $buyer->id, 'shipping_recipient_name' => 'Test buyer', 'shipping_phone' => '09123456789', 'shipping_line1' => '10 Test street', 'shipping_barangay' => 'Test', 'shipping_city' => 'Manila', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR', 'shipping_zip' => '1000', 'subtotal' => 200, 'shipping_total' => 50, 'total' => 250, 'status' => 'completed', 'payment_method' => 'cod']);
    $parcel = SellerOrder::query()->create(['order_id' => $order->id, 'store_id' => $store->id, 'subtotal' => 200, 'shipping_fee' => 50, 'commission_basis_points' => 1000, 'commission_amount' => 20, 'seller_proceeds' => 180, 'status' => 'completed']);
    OrderItem::query()->create(['seller_order_id' => $parcel->id, 'product_id' => $product->id, 'product_name' => $product->name, 'product_variant_id' => $variant->id, 'variant_key' => (string) $variant->id, 'variant_name' => $variant->name, 'quantity' => 2, 'price_each' => 100]);
    $delivery = Delivery::query()->create(['seller_order_id' => $parcel->id, 'rider_id' => $rider->id, 'logistics_center_id' => $center->id, 'status' => 'delivered', 'delivered_at' => now()]);
    DB::table('cod_collections')->insert(['delivery_id' => $delivery->id, 'rider_id' => $rider->id, 'reference' => (string) Str::uuid(), 'amount' => 250, 'received_amount' => 250, 'handover_reference' => 'CASH-'.$delivery->id, 'status' => 'reconciled', 'collected_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
    LogisticsRemittance::query()->create(['seller_order_id' => $parcel->id, 'logistics_center_id' => $center->id, 'recorded_by' => $admin->id, 'amount_cents' => 20000, 'reference' => 'PRODUCT-CASH-'.$parcel->id, 'received_on' => '2026-10-25', 'notes' => 'Synthetic actual platform receipt evidence; shipping retained by Logistics.']);
    foreach (['picked_up', 'delivered'] as $type) {
        DB::table('parcel_events')->insert(['delivery_id' => $delivery->id, 'logistics_center_id' => $center->id, 'actor_id' => $rider->id, 'type' => $type, 'reference' => (string) Str::uuid(), 'notes' => '{}', 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
    }

    $parcel->update(['shipping_quote' => ['pickup_address' => ['recipient_name' => 'Test seller', 'phone' => '09123456789', 'line1' => 'Seller street', 'barangay' => 'Test', 'city' => 'Manila', 'province' => 'Metro Manila']]]);
    $area = DB::table('service_areas')->insertGetId(['logistics_center_id' => $center->id, 'code' => 'REFUND-'.$center->id, 'name' => 'Refund test area', 'province_code' => '130000000', 'city_code' => '133900000', 'barangay_code' => '133900001', 'province_name' => 'Metro Manila', 'city_name' => 'Manila', 'barangay_name' => 'Test', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
    DB::table('rider_service_area')->insert(['rider_id' => $rider->id, 'service_area_id' => $area]);

    return compact('buyer', 'seller', 'logistics', 'rider', 'admin', 'center', 'store', 'product', 'variant', 'parcel', 'delivery');
}
