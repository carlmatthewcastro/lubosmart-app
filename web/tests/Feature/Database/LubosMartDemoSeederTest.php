<?php

use App\Actions\Checkout\CreateOrderFromCart;
use App\Http\Controllers\ApplicationReviewController;
use App\Http\Controllers\OrderController;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\CommerceSetting;
use App\Models\Delivery;
use App\Models\LogisticsCenter;
use App\Models\Order;
use App\Models\ParcelReturn;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Notifications\VerifyAccountEmail;
use App\Services\Demo\DemoActions;
use App\Services\Demo\DemoPreflight;
use App\Services\Demo\DemoVerification;
use App\Services\PhilippinePostalCodes;
use Database\Seeders\LubosMartDemoSeeder;
use Database\Seeders\MarketplaceCategorySeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

function comprehensiveDemoEnvironment(): array
{
    Storage::fake('local');
    Storage::fake('public');
    test()->seed(MarketplaceCategorySeeder::class);
    $users = [];
    foreach (config('demo.primary') as $role => $email) {
        $users[$role] = User::factory()->create(['email' => $email, 'role' => $role, 'status' => 'approved']);
    }
    $center = LogisticsCenter::query()->create(['code' => 'APP-DEMO-TEST', 'name' => 'Demo test facility', 'address' => 'Fictional facility', 'is_active' => true]);
    $center->forceFill(['company_user_id' => $users['logistics']->id])->save();
    foreach (['logistics', 'rider'] as $role) {
        $users[$role]->logisticsCenters()->attach($center->id, ['granted_by' => $users['logistics']->id]);
    }
    $users['rider']->forceFill(['logistics_center_id' => $center->id, 'logistics_company_id' => $users['logistics']->id, 'rider_capability' => 'both'])->save();
    DB::table('rider_profiles')->insert(['user_id' => $users['rider']->id, 'vehicle_type' => 'motorcycle']);
    foreach ([['seller', 'Calios', 'Santa Cruz', '043426000', '043426004', 1000, '4009'], ['buyer', 'Barangay II (Pob.)', 'Pagsanjan', '043419000', '043419013', 3800, '4008']] as [$role, $barangay, $city, $cityCode, $barangayCode, $extra, $zip]) {
        $area = DB::table('service_areas')->insertGetId(['logistics_center_id' => $center->id, 'code' => 'COVERAGE-'.$role,
            'name' => $barangay.', '.$city, 'province_code' => '043400000', 'city_code' => $cityCode, 'barangay_code' => $barangayCode,
            'province_name' => 'Laguna', 'city_name' => $city, 'barangay_name' => $barangay, 'is_active' => true]);
        DB::table('shipping_rates')->insert(['service_area_id' => $area, 'base_fee_cents' => 3800, 'included_weight_grams' => 1000,
            'extra_kg_fee_cents' => $extra, 'max_weight_grams' => 20000, 'is_active' => true]);
        DB::table('rider_service_area')->insert(['rider_id' => $users['rider']->id, 'service_area_id' => $area]);
        $users[$role]->addresses()->create(['label' => 'Original', 'recipient_name' => $users[$role]->name, 'phone' => '09123456789',
            'line1' => 'Original fixture address', 'barangay' => $barangay, 'city' => $city, 'province' => 'Laguna', 'region' => '040000000', 'zip' => $zip]);
    }
    Store::query()->create(['user_id' => $users['seller']->id, 'name' => 'Valora', 'status' => 'approved',
        'business_category_id' => Category::query()->where('name', 'Books and Media')->value('id')]);
    CommerceSetting::query()->findOrFail(1)->forceFill(['logistics_shipping_enabled' => true, 'platform_commission_basis_points' => 500, 'return_window_days' => 7])->save();

    return $users;
}

test('comprehensive fixtures preserve accounts carts configuration and live progress on reruns', function () {
    $users = comprehensiveDemoEnvironment();
    $unrelated = User::factory()->create(['name' => 'Unrelated buyer']);
    $unrelated->refresh();
    $originalProduct = Product::query()->create(['store_id' => $users['seller']->store->id,
        'category_id' => Category::query()->where('name', 'Fiction & Non-Fiction Books')->value('id'),
        'name' => 'Original preserved book', 'price' => 99, 'stock' => 12, 'weight_grams' => 100, 'status' => 'active']);
    $originalCart = Cart::query()->create(['user_id' => $users['buyer']->id]);
    CartItem::query()->create(['cart_id' => $originalCart->id, 'product_id' => $originalProduct->id, 'quantity' => 2, 'variant_key' => 'base']);
    $before = app(DemoVerification::class)->snapshot();
    $this->seed(LubosMartDemoSeeder::class);
    app(DemoVerification::class)->preserve($before);
    expect(Order::query()->count())->toBe(33)->and(Product::query()->count())->toBe(46)
        ->and(ParcelReturn::query()->count())->toBe(6)->and(DB::table('product_reviews')->count())->toBe(30);
    expect($unrelated->fresh()->getRawOriginal())->toBe($unrelated->getRawOriginal());
    $credentials = json_decode(Storage::disk('local')->get('demo/lubosmart-credentials.json'), true);
    foreach ($credentials as $email => $credential) {
        expect(Hash::check($credential['password'], User::query()->where('email', $email)->value('password')))->toBeTrue();
    }
    $pending = Order::query()->where('status', 'pending')->firstOrFail()->sellerOrders()->firstOrFail();
    app(DemoActions::class)->call($pending->store->user, OrderController::class, 'prepare', ['status' => 'processing'], ['sellerOrder' => $pending]);
    $counts = collect(['users', 'products', 'orders', 'deliveries', 'parcel_assignments', 'parcel_events', 'wallet_transactions', 'refund_fund_entries', 'product_reviews'])->mapWithKeys(fn ($t) => [$t => DB::table($t)->count()]);
    $stocks = Product::query()->orderBy('id')->pluck('stock', 'id')->all();
    $variantStocks = DB::table('product_variants')->orderBy('id')->pluck('stock', 'id')->all();
    $this->seed(LubosMartDemoSeeder::class);
    expect($pending->fresh()->status)->toBe('processing');
    foreach ($counts as $table => $count) {
        expect(DB::table($table)->count())->toBe($count);
    }
    expect(Product::query()->orderBy('id')->pluck('stock', 'id')->all())->toBe($stocks)
        ->and(DB::table('product_variants')->orderBy('id')->pluck('stock', 'id')->all())->toBe($variantStocks);
    expect(app(DemoVerification::class)->reconcile()['order_finances_and_wallets'])->toBe('reconciled');
});

test('missing approved shipping configuration stops before creating synthetic users', function () {
    comprehensiveDemoEnvironment();
    DB::table('shipping_rates')->update(['is_active' => false]);
    expect(fn () => $this->seed(LubosMartDemoSeeder::class))->toThrow(RuntimeException::class);
    expect(User::query()->count())->toBe(5)->and(Order::query()->count())->toBe(0);
    Storage::disk('local')->assertMissing('demo/lubosmart-credentials.json');
});

test('real photo upgrades preserve custom seller images stock and existing order history', function () {
    comprehensiveDemoEnvironment();
    $this->seed(LubosMartDemoSeeder::class);
    $product = Product::query()->where('name', 'Mga Kuwento sa Laguna')->firstOrFail();
    $custom = Product::query()->where('name', 'Everyday Filipino Recipes')->firstOrFail();
    $product->update(['image_path' => 'demo/catalog/0-0.svg']);
    $custom->update(['image_path' => 'products/seller-chosen-photo.jpg']);
    $stock = $product->stock;
    $price = $product->price;
    $orders = DB::table('orders')->orderBy('id')->get()->toJson();
    $this->artisan('lubosmart:demo-photos')->expectsOutputToContain('1 demo product images replaced; 1 custom seller images preserved.')->assertSuccessful();
    $product->refresh();
    expect($product->image_path)->toStartWith('demo/catalog/photos/')->toEndWith('.jpg');
    expect($product->stock)->toBe($stock)->and($product->price)->toBe($price)
        ->and($custom->fresh()->image_path)->toBe('products/seller-chosen-photo.jpg')
        ->and(DB::table('orders')->orderBy('id')->get()->toJson())->toBe($orders);
    Storage::disk('public')->assertExists($product->image_path);
    expect(getimagesize(Storage::disk('public')->path($product->image_path))['mime'])->toBe('image/jpeg');
    Storage::disk('public')->assertExists('demo/catalog/photos/credits.html');
    $this->artisan('lubosmart:demo-photos')->expectsOutputToContain('0 demo product images replaced; 1 custom seller images preserved.')->assertSuccessful();
});

test('deployed demo execution is disabled unless explicitly configured', function () {
    app()->detectEnvironment(fn () => 'production');
    config(['demo.deployed_enabled' => false]);
    expect(fn () => app(DemoPreflight::class)->inspect())->toThrow(RuntimeException::class);
    expect(DB::table('demo_fixtures')->count())->toBe(0);
});

test('an unowned demonstration email collision rolls back the whole fixture batch without adopting the account', function () {
    comprehensiveDemoEnvironment();
    $existing = User::factory()->create(['email' => 'lubosmart.demo.teresa-ramos@example.invalid', 'name' => 'Existing unrelated identity']);
    $before = app(DemoVerification::class)->snapshot();
    expect(fn () => $this->seed(LubosMartDemoSeeder::class))->toThrow(RuntimeException::class, 'Reserved demo email exists');
    app(DemoVerification::class)->preserve($before);
    expect(User::query()->count())->toBe(6)->and(Order::query()->count())->toBe(0)
        ->and(DB::table('demo_fixtures')->where('record_type', User::class)->count())->toBe(0);
});

test('a new approved buyer can buy seeded variations using normal checkout and obtain a shipping quote', function () {
    $users = comprehensiveDemoEnvironment();
    $this->seed(LubosMartDemoSeeder::class);
    $buyer = User::factory()->create();
    $address = $buyer->addresses()->create([...$users['buyer']->addresses()->firstOrFail()->only(['label', 'recipient_name', 'phone', 'line1', 'barangay', 'city', 'province', 'region', 'zip'])]);
    $product = Product::query()->availableToShoppers()->whereHas('variants')->firstOrFail();
    $cart = Cart::query()->create(['user_id' => $buyer->id]);
    CartItem::query()->create(['cart_id' => $cart->id, 'product_id' => $product->id, 'product_variant_id' => $product->variants()->firstOrFail()->id, 'variant_key' => (string) $product->variants()->firstOrFail()->id, 'quantity' => 2]);
    $center = $users['rider']->logistics_center_id;
    $order = app(CreateOrderFromCart::class)->handle($buyer, $address->id, $center);
    expect($order->sellerOrders->sole()->store_id)->toBe($users['seller']->store->id)
        ->and($order->shipping_total)->toBe('38.00')->and($order->sellerOrders->sole()->shipping_quote['basis'])->toBe('destination_and_weight');
    $this->actingAs($buyer)->get('/shop')->assertSuccessful();
    $unsupported = $buyer->addresses()->create([...$address->only(['label', 'recipient_name', 'phone', 'line1', 'province', 'region']),
        'city' => 'Lumban', 'barangay' => 'Maytalang II', 'zip' => app(PhilippinePostalCodes::class)->forCity('Laguna', 'Lumban')]);
    $this->put('/cart/'.$product->id, ['quantity' => 1, 'product_variant_id' => $product->variants()->firstOrFail()->id])->assertSessionHasNoErrors();
    $stock = $product->fresh()->stock;
    $this->postJson('/checkout', ['address_id' => $unsupported->id, 'checkout_key' => (string) Str::uuid(),
        'logistics_center_id' => $center, 'expected_shipping_total' => '38.00'])->assertUnprocessable()->assertJsonValidationErrors('logistics_center_id');
    expect($product->fresh()->stock)->toBe($stock);
});

test('rider API returns actionable seeded pickup delivery and return tasks without exposing secrets', function () {
    $users = comprehensiveDemoEnvironment();
    $this->seed(LubosMartDemoSeeder::class);
    $response = $this->postJson('/api/v1/auth/tokens', ['email' => $users['rider']->email, 'password' => 'password', 'device_name' => 'Demo test'])
        ->assertCreated()->assertJsonMissingPath('data.user.password');
    $rider = $users['rider'];
    expect(Delivery::query()->where('pickup_rider_id', $rider->id)->where('status', 'assigned')->exists())->toBeTrue()
        ->and(Delivery::query()->where('delivery_rider_id', $rider->id)->whereNotNull('dispatch_prepared_at')->whereNull('dispatch_accepted_at')->exists())->toBeTrue()
        ->and(ParcelReturn::query()->where('rider_id', $rider->id)->whereHas('task', fn ($q) => $q->where('status', 'assigned'))->exists())->toBeTrue()
        ->and(ParcelReturn::query()->where('seller_return_rider_id', $rider->id)->whereHas('task', fn ($q) => $q->where('status', 'seller_assigned'))->exists())->toBeTrue();
    app('auth')->forgetGuards();
    $this->withToken($response->json('data.access_token'))->getJson('/api/v1/deliveries')->assertOk();
});

test('normal registration and Google registration can complete requirements and purchase demo products', function (bool $google) {
    $users = comprehensiveDemoEnvironment();
    $this->seed(LubosMartDemoSeeder::class);
    Notification::fake();
    Mail::fake();
    Http::preventStrayRequests();
    Http::fake([
        'https://psgc.gitlab.io/api/regions/' => Http::response([['code' => '040000000', 'name' => 'CALABARZON']]),
        'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '043400000', 'name' => 'Laguna', 'regionCode' => '040000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '043419000', 'name' => 'Pagsanjan', 'provinceCode' => '043400000', 'regionCode' => '040000000']]),
        'https://psgc.gitlab.io/api/cities-municipalities/043419000/barangays/' => Http::response([['code' => '043419013', 'name' => 'Barangay II (Pob.)']]),
    ]);
    $email = 'fresh-demo-buyer@example.invalid';
    if ($google) {
        Socialite::fake('google', Laravel\Socialite\Two\User::fake(['id' => 'demo-google-provider', 'name' => 'Fresh Buyer', 'email' => $email, 'verified_email' => true]));
        $this->withSession(['google_registration' => ['intent' => 'login', 'started_at' => now()->timestamp]])
            ->get(route('auth.google.callback'))->assertRedirect(route('register'));
    }
    $this->post('/register', ['first_name' => 'Fresh', 'last_name' => 'Buyer', 'sex' => 'female', 'email' => $email,
        'phone' => '09174445566', 'birthday' => '1995-01-01', 'role' => 'buyer', 'password' => 'DemoRegister@2026', 'password_confirmation' => 'DemoRegister@2026',
        'policy_accepted' => true, 'region_code' => '040000000', 'province_code' => '043400000', 'city_code' => '043419000', 'barangay_code' => '043419013',
        'line1' => '16 Fictional Demo Lane', 'zip' => '4008', 'identity' => new UploadedFile(database_path('demo/assets/evidence.png'), 'synthetic-id.png', 'image/png', null, true)])
        ->assertSessionHasNoErrors()->assertRedirect(route('verification.notice'));
    $buyer = User::query()->where('email', $email)->firstOrFail();
    expect($buyer->google_id)->toBe($google ? 'demo-google-provider' : null)->and($buyer->status)->toBe('unverified');
    $code = Notification::sent($buyer, VerifyAccountEmail::class)->sole()->code;
    $this->post('/verify-email/code', ['code' => $code])->assertSessionHasNoErrors();
    expect($buyer->fresh()->status)->toBe('pending');
    app(DemoActions::class)->call($users['admin'], ApplicationReviewController::class, 'update', ['decision' => 'approved'], ['application' => $buyer->application]);
    $this->actingAs($buyer->fresh());
    $product = Product::query()->where('name', 'Mga Kuwento sa Laguna')->firstOrFail();
    $variant = $product->variants()->firstOrFail();
    $this->get('/products/'.$product->id)->assertOk();
    $this->put('/cart/'.$product->id, ['quantity' => 1, 'product_variant_id' => $variant->id])->assertSessionHasNoErrors();
    $this->put('/cart/'.$product->id, ['quantity' => 2, 'product_variant_id' => $variant->id])->assertSessionHasNoErrors();
    $address = $buyer->addresses()->firstOrFail();
    $this->getJson('/cart/shipping-quote?address_id='.$address->id)->assertOk()->assertJsonPath('options.0.total', 38);
    $this->post('/checkout', ['address_id' => $address->id, 'checkout_key' => (string) Str::uuid(),
        'logistics_center_id' => $users['rider']->logistics_center_id, 'expected_items_subtotal' => '490.00',
        'expected_shipping_total' => '38.00', 'voucher_code' => 'LMDEMO-0-STARTER-10', 'expected_discount_total' => '10.00'])
        ->assertSessionHasNoErrors()->assertRedirect(route('orders.index'));
    $order = Order::query()->where('buyer_id', $buyer->id)->sole();
    expect($order->total)->toBe('518.00')->and($order->sellerOrders()->sole()->store_id)->toBe($users['seller']->store->id);
    $this->flushSession();
    $this->actingAs($users['seller'])->get('/orders')->assertOk()
        ->assertInertia(fn ($page) => $page->where('orders.data.0.order_id', $order->id));
})->with(['password registration' => false, 'Google registration (provider mocked)' => true]);

test('primary provisioning audits preserve existing identities and refuses missing private credentials', function () {
    comprehensiveDemoEnvironment();
    $before = app(DemoVerification::class)->snapshot();
    $this->artisan('lubosmart:demo-provision-primary', ['--apply' => true])->assertSuccessful();
    app(DemoVerification::class)->preserve($before);
    config(['demo.primary.buyer' => 'missing-primary@example.invalid']);
    $this->artisan('lubosmart:demo-provision-primary', ['--apply' => true])->assertFailed();
    expect(User::query()->count())->toBe(5);
});
