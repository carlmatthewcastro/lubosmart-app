<?php

namespace App\Services\Demo;

use App\Http\Controllers\ApplicationReviewController;
use App\Models\Address;
use App\Models\Category;
use App\Models\Store;
use App\Models\User;
use App\Services\AccountVerificationLifecycle;
use App\Services\PhilippinePostalCodes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class DemoAccounts
{
    public function __construct(private DemoFixtures $fixtures, private DemoActions $actions) {}

    public function create(array $context): array
    {
        $definitions = [
            ['rider', 'Marco', 'Reyes'], ['rider', 'Liza', 'Mendoza'],
            ['seller', 'Teresa', 'Ramos'], ['seller', 'Paolo', 'Santos'], ['seller', 'Mara', 'Cruz'], ['seller', 'Nico', 'Garcia'],
            ['buyer', 'Ana', 'Dela Cruz'], ['buyer', 'Jose', 'Reyes'], ['buyer', 'Camille', 'Santos'],
            ['buyer', 'Rafael', 'Torres'], ['buyer', 'Bea', 'Navarro'], ['buyer', 'Miguel', 'Ramos'],
            ['buyer', 'Carla', 'Mendoza'], ['buyer', 'Luis', 'Aquino'], ['buyer', 'Dina', 'Flores'],
        ];
        $accounts = ['rider' => [$context['accounts']['rider']], 'seller' => [$context['accounts']['seller']], 'buyer' => [$context['accounts']['buyer']]];
        foreach ($definitions as $index => [$role, $first, $last]) {
            $email = 'lubosmart.demo.'.Str::slug($first.' '.$last).'@example.invalid';
            $user = $this->fixtures->once('account:'.$email, User::class, function () use ($context, $role, $first, $last, $email, $index) {
                // An unregistered reserved email must never adopt an unrelated existing user.
                if (User::query()->where('email_normalized', $email)->exists()) {
                    throw new RuntimeException('Reserved demo email exists without a fixture record: '.$email);
                }
                $password = $this->password($email);
                $user = User::query()->create(['name' => $first.' '.$last, 'email' => $email, 'role' => $role, 'password' => $password]);
                $area = $context['areas'][$role === 'buyer' ? 'buyer' : 'seller'];
                // Clearly fictional demo contact; it is never used for outbound messaging.
                $phone = '09'.str_pad((string) (880000000 + $index), 9, '0', STR_PAD_LEFT);
                if (User::query()->where('phone_normalized', $phone)->exists()) {
                    throw new RuntimeException('Demo contact collision; existing account preserved.');
                }
                $user->forceFill(['phone' => $phone])->save();
                DB::table('user_profiles')->insert(['user_id' => $user->id, 'first_name' => $first, 'last_name' => $last,
                    'sex' => 'prefer_not_to_say', 'birthday' => '1995-05-15', 'province_code' => $area->province_code,
                    'city_code' => $area->city_code, 'barangay_code' => $area->barangay_code, 'created_at' => now(), 'updated_at' => now()]);
                $zip = app(PhilippinePostalCodes::class)->forCity($area->province_name, $area->city_name);
                if (! $zip) {
                    throw new RuntimeException('Approved postal code missing for '.$area->city_name);
                }
                $address = Address::query()->create(['user_id' => $user->id, 'label' => 'Demo address', 'recipient_name' => $user->name,
                    'phone' => $phone, 'line1' => ($index + 10).' Demo Lane (fictional)', 'line2' => 'SYNTHETIC LUBOSMART DEMO',
                    'barangay' => $area->barangay_name, 'city' => $area->city_name, 'province' => $area->province_name,
                    'region' => '040000000', 'zip' => $zip, 'is_default' => true]);
                $application = $user->application()->create(['requested_role' => $role, 'status' => 'submitted',
                    'registration_contract' => $role === 'rider' ? 'self-service-rider-2026-10' : 'buyer-seller-2026-10',
                    'policy_version' => 'registration-2026-10', 'policy_accepted_at' => now(), 'submitted_at' => now(), 'address_id' => $address->id]);
                $documents = ['identity'];
                if ($role === 'seller') {
                    // Seller index is stable in the definition list (positions 2 through 5).
                    $definition = DemoCatalog::stores()[$index - 2];
                    $category = Category::query()->where('name', $definition['department'])->whereNull('parent_id')->firstOrFail();
                    Store::query()->create(['user_id' => $user->id, 'name' => $definition['name'],
                        'description' => 'Fictional LubosMart demonstration store. '.$definition['description'],
                        'business_category_id' => $category->id, 'status' => 'pending']);
                    $application->forceFill(['business_name' => $definition['name'], 'seller_type' => 'individual',
                        'tin' => '000-000-000-'.str_pad((string) (700 + $index), 3, '0', STR_PAD_LEFT), 'region_code' => '040000000'])->save();
                    $documents[] = 'business_permit';
                }
                if ($role === 'rider') {
                    $user->forceFill(['logistics_center_id' => $context['center']->id, 'logistics_company_id' => $context['accounts']['logistics']->id, 'rider_capability' => 'both'])->save();
                    $application->forceFill(['logistics_center_id' => $context['center']->id])->save();
                    DB::table('rider_profiles')->insert(['user_id' => $user->id, 'vehicle_type' => 'motorcycle', 'plate_number' => 'DEMO-'.($index + 1),
                        'plate_normalized' => 'DEMO-'.($index + 1), 'is_available' => true, 'created_at' => now(), 'updated_at' => now()]);
                    $user->logisticsCenters()->attach($context['center']->id, ['granted_by' => $context['accounts']['logistics']->id]);
                    foreach (collect($context['areas'])->unique('id') as $coverage) {
                        DB::table('rider_service_area')->insert(['rider_id' => $user->id, 'service_area_id' => $coverage->id, 'created_at' => now(), 'updated_at' => now()]);
                    }
                    $documents = ['identity', 'license', 'vehicle_registration'];
                }
                foreach ($documents as $kind) {
                    $path = 'demo/registration/'.$user->id.'/'.$kind.'.png';
                    Storage::disk('local')->put($path, file_get_contents(database_path('demo/assets/evidence.png')));
                    $application->documents()->create(['kind' => $kind, 'disk' => 'local', 'path' => $path, 'mime_type' => 'image/png', 'size_bytes' => Storage::disk('local')->size($path)]);
                }
                // Fixtures complete the same verification lifecycle and authorized application review.
                app(AccountVerificationLifecycle::class)->complete($user);
                $reviewer = $context['accounts'][$role === 'rider' ? 'logistics' : 'admin'];
                $this->actions->call($reviewer, ApplicationReviewController::class, 'update', ['decision' => 'approved'], ['application' => $application->fresh()]);

                return $user->fresh();
            });
            if ($user->role !== $role || ! $user->canOperate()) {
                throw new RuntimeException('Demo account changed eligibility: '.$email.'. State preserved.');
            }
            $accounts[$role][] = $user;
        }

        return $accounts;
    }

    private function password(string $email): string
    {
        $disk = Storage::disk('local');
        $path = 'demo/lubosmart-credentials.json';
        $credentials = $disk->exists($path) ? json_decode($disk->get($path), true, flags: JSON_THROW_ON_ERROR) : [];
        if (! isset($credentials[$email])) {
            $credentials[$email] = ['password' => Str::password(24), 'status' => 'New demonstration credential'];
            if (! $disk->put($path, json_encode($credentials, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR))) {
                throw new RuntimeException('Cannot securely persist generated demo credentials.');
            }
            chmod($disk->path($path), 0600);
        }

        return $credentials[$email]['password'];
    }
}
