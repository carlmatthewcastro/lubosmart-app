<?php

// Disposable browser acceptance server only. Never uses the configured database/mail.
use App\Models\Category;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Product;
use App\Models\RegistrationApplication;
use App\Models\SellerOrder;
use App\Models\SortingCenter;
use App\Models\Store;
use App\Models\User;
use App\Notifications\EmailSecurityCode;
use App\Notifications\VerifyAccountEmail;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Foundation\Vite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Laravel\Socialite\Facades\Socialite;

$stage = realpath(getenv('LUBOSMART_AUTH_BROWSER_STAGE') ?: '');
$temporary = realpath(sys_get_temp_dir());
if (! $stage || ! $temporary || ! str_starts_with($stage, $temporary.DIRECTORY_SEPARATOR)
    || ! str_starts_with(basename($stage), 'lubosmart-auth-browser-')
    || realpath(getenv('DB_DATABASE') ?: '') !== $stage.DIRECTORY_SEPARATOR.'test.sqlite') {
    throw new RuntimeException('Browser fixture requires an isolated temporary SQLite stage.');
}

$root = dirname(__DIR__, 2);
if (PHP_SAPI === 'cli-server') {
    $asset = realpath($root.'/public'.parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
    if ($asset && str_starts_with($asset, realpath($root.'/public').DIRECTORY_SEPARATOR) && is_file($asset)) {
        return false;
    }
}
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->instance('request', Request::capture());
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();
// Force the built assets; an unrelated developer Vite hot file may be present.
app(Vite::class)->useHotFile($stage.DIRECTORY_SEPARATOR.'unused.hot');
config(['app.env' => 'testing', 'inertia.ssr.enabled' => false, 'mail.default' => 'array', 'mail.security_mailer' => 'array',
    'filesystems.disks.public.url' => '/images/products/samples',
    'filesystems.disks.local.root' => $stage.DIRECTORY_SEPARATOR.'uploads', 'logging.channels.single.path' => $stage.DIRECTORY_SEPARATOR.'app.log']);
Http::preventStrayRequests();
Http::fake([
    'https://psgc.gitlab.io/api/regions/' => Http::response([['code' => '130000000', 'name' => 'NCR'], ['code' => '070000000', 'name' => 'Central Visayas'], ['code' => '030000000', 'name' => 'Central Luzon'], ['code' => '040000000', 'name' => 'CALABARZON']]),
    'https://psgc.gitlab.io/api/provinces/' => Http::response([['code' => '072200000', 'name' => 'Cebu', 'regionCode' => '070000000'], ['code' => '043400000', 'name' => 'Laguna', 'regionCode' => '040000000']]),
    'https://psgc.gitlab.io/api/cities-municipalities/' => Http::response([['code' => '137404000', 'name' => 'Quezon City', 'regionCode' => '130000000'], ['code' => '137403000', 'name' => 'Pasig City', 'regionCode' => '130000000'], ['code' => '043428000', 'name' => 'City of Santa Rosa', 'provinceCode' => '043400000', 'regionCode' => '040000000']]),
    'https://psgc.gitlab.io/api/cities-municipalities/043428000/barangays/' => Http::response([['code' => '043428001', 'name' => 'Test Barangay']]),
    'https://psgc.gitlab.io/api/cities-municipalities/137404000/barangays/' => Http::response([['code' => '137404001', 'name' => 'Commonwealth']]),
    'https://psgc.gitlab.io/api/cities-municipalities/137403000/barangays/' => Http::response([['code' => '137403016', 'name' => 'Kapitolyo']]),
]);
Notification::fake();
// Exercise the real OAuth callback with a provider fake in this disposable stage.
Socialite::fake('google', Laravel\Socialite\Two\User::fake([
    'id' => 'browser-google-new', 'name' => 'Google Browser Applicant', 'email' => 'google.browser@example.com', 'verified_email' => true,
]));
Route::middleware('web')->get('/__fixture/google-new', function (Request $request) {
    $request->session()->put('google_registration', ['intent' => 'login', 'started_at' => now()->timestamp]);

    return redirect()->route('auth.google.callback');
});

if (PHP_SAPI === 'cli' && ($argv[1] ?? '') === 'dashboard-seed') {
    $users = [];
    foreach (['buyer', 'seller', 'courier', 'sorting_center', 'admin'] as $role) {
        $users[$role] = User::factory()->create(['name' => 'Browser '.$role, 'role' => $role, 'email' => $role.'@dashboard.example.com', 'password' => 'Browser@2026']);
    }
    $center = SortingCenter::create(['code' => 'BROWSER', 'name' => 'Browser Logistics', 'address' => 'Synthetic center address', 'is_active' => true]);
    $center->forceFill(['company_user_id' => $users['sorting_center']->id])->save();
    $center->users()->attach($users['sorting_center']->id, ['granted_by' => $users['admin']->id]);
    $center->users()->attach($users['courier']->id, ['granted_by' => $users['sorting_center']->id]);
    $users['courier']->forceFill(['sorting_center_id' => $center->id, 'logistics_company_id' => $users['sorting_center']->id])->save();
    $store = Store::create(['user_id' => $users['seller']->id, 'name' => 'Browser Store', 'status' => 'approved']);
    $category = Category::create(['name' => 'Browser bags', 'is_active' => true]);
    foreach (['handbag.jpg', 'messenger.jpg', 'mug.jpg', null] as $index => $image) {
        Product::create(['store_id' => $store->id, 'category_id' => $category->id, 'name' => $index === 1 ? str_repeat('Long product name ', 8) : 'Browser product '.($index + 1), 'price' => 150 + $index, 'stock' => 5, 'status' => 'active', 'image_path' => $image, 'description' => 'Synthetic product details for browser verification.']);
    }
    foreach (['buyer', 'seller'] as $role) {
        $application = RegistrationApplication::create(['user_id' => $users[$role]->id, 'requested_role' => $role, 'status' => 'approved', 'seller_type' => $role === 'seller' ? 'individual' : null]);
        foreach (['identity', 'bir_2303'] as $kind) {
            $application->documents()->create(['kind' => $kind, 'disk' => 'local', 'path' => 'registration/synthetic-'.$role.'-'.$kind.'.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 7]);
        }
    }
    $order = Order::create(['buyer_id' => $users['buyer']->id, 'shipping_recipient_name' => 'Browser Buyer', 'shipping_phone' => '09171234567', 'shipping_line1' => 'Synthetic street', 'shipping_barangay' => 'Commonwealth', 'shipping_city' => 'Quezon City', 'shipping_province' => 'Metro Manila', 'shipping_region' => 'NCR', 'shipping_zip' => '1100', 'subtotal' => 100, 'shipping_total' => 50, 'total' => 150, 'status' => 'processing']);
    $parcel = SellerOrder::create(['order_id' => $order->id, 'store_id' => $store->id, 'subtotal' => 100, 'shipping_fee' => 50, 'status' => 'shipped']);
    Delivery::create(['seller_order_id' => $parcel->id, 'rider_id' => $users['courier']->id, 'sorting_center_id' => $center->id, 'status' => 'assigned']);
    echo json_encode(['orders' => Order::where('buyer_id', $users['buyer']->id)->count(), 'parcels' => Delivery::count()]);
    exit;
}

if (PHP_SAPI === 'cli' && ($argv[1] ?? '') === 'seed') {
    Category::create(['name' => 'Home & Living', 'slug' => 'home-living', 'is_active' => true]);
    $company = User::factory()->create(['name' => 'Browser Approver', 'role' => 'sorting_center', 'email' => 'logistics.approver@example.com', 'password' => 'Browser@2026']);
    $center = SortingCenter::create(['code' => 'SIGNUP', 'name' => 'Signup Logistics', 'address' => 'Synthetic address', 'is_active' => true]);
    $center->forceFill(['company_user_id' => $company->id])->save();
    $company->sortingCenters()->attach($center->id, ['granted_by' => $company->id]);
    exit;
}
if (PHP_SAPI === 'cli' && ($argv[1] ?? '') === 'reset-cache') {
    // This fixture's database is validated above and contains only synthetic data.
    Cache::flush();
    exit;
}
$request = Request::capture();
$response = $kernel->handle($request);
$response->send();
// Only fake notification payloads in the disposable stage; no customer recipient.
$notifications = Notification::sentNotifications();
foreach ($notifications as $recipients) {
    foreach ($recipients as $types) {
        foreach ($types as $items) {
            foreach ($items as $item) {
                $notification = $item['notification'];
                if ($notification instanceof VerifyAccountEmail) {
                    file_put_contents($stage.DIRECTORY_SEPARATOR.'verification.json', json_encode(['code' => $notification->code]));
                }
                if ($notification instanceof EmailSecurityCode) {
                    file_put_contents($stage.DIRECTORY_SEPARATOR.'recovery.json', json_encode(['code' => $notification->code]));
                }
            }
        }
    }
}
$kernel->terminate($request, $response);
