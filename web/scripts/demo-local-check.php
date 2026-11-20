<?php

use App\Actions\Checkout\CreateOrderFromCart;
use App\Http\Controllers\ApplicationReviewController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Requests\Auth\RegisterAccountRequest;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Notifications\VerifyAccountEmail;
use App\Services\Demo\DemoActions;
use App\Services\Demo\DemoFixtures;
use App\Services\Demo\DemoPreflight;
use App\Services\Demo\DemoVerification;
use App\Services\RegistrationEmailCodes;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\Store;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

// Executes local registration/checkout/API smoke checks without sending messages.
require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
set_exception_handler(static function (Throwable $exception): void {
    fwrite(STDERR, 'Demo local check failed: '.($exception::class === RuntimeException::class ? $exception->getMessage() : 'See the private application log.').PHP_EOL);
    exit(1);
});

if (! app()->environment('local')) {
    throw new RuntimeException('This check writes local demo records and is forbidden in deployed environments.');
}
$context = app(DemoPreflight::class)->inspect();
config(['session.driver' => 'array', 'mail.default' => 'array', 'mail.security_mailer' => 'array']);
Mail::fake();
Notification::fake();
$fixtures = app(DemoFixtures::class);
$credentialsPath = 'demo/lubosmart-credentials.json';
$credentials = json_decode(Storage::disk('local')->get($credentialsPath), true, flags: JSON_THROW_ON_ERROR);
$email = 'lubosmart.demo.new-buyer@example.invalid';
if (! isset($credentials[$email])) {
    $credentials[$email] = ['password' => Str::password(24), 'status' => 'New buyer registration/checkout smoke account'];
    Storage::disk('local')->put($credentialsPath, json_encode($credentials, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
    chmod(Storage::disk('local')->path($credentialsPath), 0600);
}
$buyer = DB::transaction(function () use ($context, $fixtures, $email, $credentials) {
    DB::table('demo_fixtures')->where('fixture_key', 'lubosmart-v1:root')->lockForUpdate()->first();

    return $fixtures->once('account:new-buyer-check', User::class, function () use ($context, $email, $credentials) {
        if (User::query()->where('email_normalized', $email)->exists()) {
            throw new RuntimeException('Smoke-check email already exists without fixture ownership.');
        }
        $area = $context['areas']['buyer'];
        $password = $credentials[$email]['password'];
        $request = RegisterAccountRequest::create('/register', 'POST', [
            'first_name' => 'Elena', 'last_name' => 'Mercado', 'sex' => 'female', 'email' => $email, 'phone' => '09880000888',
            'birthday' => '1995-01-01', 'role' => 'buyer', 'password' => $password, 'password_confirmation' => $password,
            'policy_accepted' => true, 'province_code' => $area->province_code, 'city_code' => $area->city_code,
            'barangay_code' => $area->barangay_code, 'region_code' => '040000000', 'line1' => '88 Demo Lane (fictional)', 'zip' => $context['addresses']['buyer']->zip,
        ], files: ['identity' => new UploadedFile(database_path('demo/assets/evidence.png'), 'synthetic-demo-identity.png', 'image/png', null, true)]);
        $session = new Store('demo-registration-check', new ArraySessionHandler(120));
        $session->start();
        $request->setLaravelSession($session);
        $request->setUserResolver(fn () => null);
        $request->setContainer(app());
        $request->setRedirector(app('redirect'));
        $request->validateResolved();
        app()->call([app(RegisteredUserController::class), 'store'], ['request' => $request]);
        $user = User::query()->where('email', $email)->firstOrFail();
        $code = Notification::sent($user, VerifyAccountEmail::class)->sole()->code;
        app(RegistrationEmailCodes::class)->verify($user, $code);
        app(DemoActions::class)->call($context['accounts']['admin'], ApplicationReviewController::class, 'update', ['decision' => 'approved'], ['application' => $user->application]);

        return $user->fresh();
    });
});
$purchase = DB::transaction(function () use ($context, $fixtures, $buyer) {
    DB::table('demo_fixtures')->where('fixture_key', 'lubosmart-v1:root')->lockForUpdate()->first();

    return $fixtures->once('order:new-buyer-check', Order::class, function () use ($context, $fixtures, $buyer) {
        $product = Product::query()->availableToShoppers()->whereIn('id', $fixtures->ids(Product::class))->where('name', 'Mga Kuwento sa Laguna')->firstOrFail();
        $cart = Cart::query()->firstOrCreate(['user_id' => $buyer->id]);
        if ($cart->items()->exists()) {
            throw new RuntimeException('Smoke buyer cart contains existing work; preserved.');
        }
        $variant = $product->variants()->orderBy('id')->firstOrFail();
        CartItem::query()->create(['cart_id' => $cart->id, 'product_id' => $product->id, 'product_variant_id' => $variant->id,
            'variant_key' => (string) $variant->id, 'quantity' => 2]);

        return app(CreateOrderFromCart::class)->handle($buyer, $buyer->addresses()->firstOrFail()->id, $context['center']->id,
            expectedShippingCents: 3800, voucherCode: 'LMDEMO-0-STARTER-10', expectedDiscountCents: 1000);
    });
});
$result = ['new_buyer_registration' => 'passed (actual location service; messages suppressed)', 'new_buyer_checkout' => 'passed',
    'order_id' => $purchase->id, 'shipping' => $purchase->shipping_total, 'total' => $purchase->total, 'api_authentication' => [],
    'primary_rider_api_login' => 'unverified: current password not supplied', 'primary_rider_parcel_retrieval' => 'pending'];
$kernel = app(Illuminate\Contracts\Http\Kernel::class);
$temporaryTokens = [];
$api = function (string $method, string $uri, array $data = [], ?string $token = null) use ($kernel) {
    // The registration action logged into this process's isolated array session.
    // API checks must authenticate independently with the issued bearer token.
    app('session')->driver()->flush();
    Auth::forgetGuards();
    $request = Request::create('http://127.0.0.1'.$uri, $method, $data, server: ['HTTP_ACCEPT' => 'application/json',
        ...($token ? ['HTTP_AUTHORIZATION' => 'Bearer '.$token] : [])]);
    $response = $kernel->handle($request);
    $payload = json_decode($response->getContent(), true);
    if ($response->getStatusCode() >= 400) {
        throw new RuntimeException('Local API smoke check failed: '.$uri.' HTTP '.$response->getStatusCode());
    }

    return $payload;
};
try {
    foreach ($credentials as $accountEmail => $credential) {
        if (! User::query()->where('email', $accountEmail)->exists()) {
            continue;
        }
        $payload = $api('POST', '/api/v1/auth/tokens', ['email' => $accountEmail, 'password' => $credential['password'], 'device_name' => 'LubosMart temporary local verification']);
        $token = $payload['data']['access_token'];
        $temporaryTokens[] = PersonalAccessToken::findToken($token)->id;
        $me = $api('GET', '/api/v1/me', token: $token);
        $result['api_authentication'][] = ['email' => $accountEmail, 'role' => $me['data']['role'], 'status' => 'passed'];
        if ($me['data']['role'] === 'rider') {
            $api('GET', '/api/v1/deliveries', token: $token);
        }
    }
    $token = $context['accounts']['rider']->createToken('LubosMart temporary primary rider retrieval', ['api:v1', 'role:rider'], now()->addMinutes(5));
    $temporaryTokens[] = $token->accessToken->id;
    $api('GET', '/api/v1/deliveries', token: $token->plainTextToken);
    $api('GET', '/api/v1/returns', token: $token->plainTextToken);
    $result['primary_rider_parcel_retrieval'] = 'passed through existing API with a temporary scoped token; password login unverified';
    $result['primary_rider_return_retrieval'] = 'passed through existing API';
    $result['reconciliation'] = app(DemoVerification::class)->reconcile();
} finally {
    PersonalAccessToken::query()->whereIn('id', $temporaryTokens)->delete();
}
Storage::disk('local')->put('demo/local-check-results.json', json_encode($result, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
chmod(Storage::disk('local')->path('demo/local-check-results.json'), 0600);
echo 'Local registration and checkout passed; '.count($result['api_authentication']).' accounts authenticated through the API. Temporary tokens revoked.'.PHP_EOL;
