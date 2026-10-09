<?php

namespace App\Console\Commands;

use App\Models\Address;
use App\Models\Category;
use App\Models\Product;
use App\Models\SortingCenter;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\MarketplaceCategorySeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CreateTestAccounts extends Command
{
    protected $signature = 'lubosmart:test-accounts {--reset-passwords : Reset passwords for the five local test accounts} {--demo : Add a small synthetic test catalog and buyer address}';

    protected $description = 'Create local-only verified test accounts for the five role dashboards';

    public function handle(): int
    {
        if (! app()->environment('local', 'testing')) {
            $this->error('Test accounts are only available in local and testing environments.');

            return self::FAILURE;
        }
        $password = Str::password(20, symbols: false);
        $resetPasswords = (bool) $this->option('reset-passwords');
        $credentialsChanged = false;
        $accountStates = [];
        $savedPasswords = json_decode(Storage::disk('local')->get('test-account-passwords.json') ?? '{}', true) ?: [];
        try {
            $accounts = DB::transaction(function () use ($password, $resetPasswords, &$credentialsChanged, &$accountStates) {
                $accounts = [];
                foreach (['admin', 'buyer', 'seller', 'courier', 'sorting_center'] as $role) {
                    $email = 'lubosmart-'.$role.'@testing.app';
                    $user = User::query()->where('email', $email)->lockForUpdate()->first();
                    // Preserve existing local credentials after the canonical role migration.
                    if (! $user && in_array($role, ['courier', 'sorting_center'], true)) {
                        $legacyRole = $role === 'courier' ? 'rider' : 'logistics';
                        $user = User::query()->where('email', 'lubosmart-'.$legacyRole.'@testing.app')->lockForUpdate()->first();
                    }
                    if (! $user) {
                        $user = User::query()->where('email', $role.'@testing.lubosmart.invalid')->lockForUpdate()->first();
                        if ($user && $user->role === $role) {
                            $user->update(['email' => $email]);
                        }
                    }
                    if ($user && $user->role !== $role) {
                        throw new \DomainException('The reserved test email '.$email.' belongs to a different role. No accounts were changed.');
                    }
                    if (! $user) {
                        $user = User::query()->create(['name' => ucfirst($role).' Test', 'email' => $email, 'role' => $role, 'password' => Hash::make($password)]);
                        $user->forceFill(['status' => 'approved', 'email_verified_at' => now()])->save();
                        $accountStates[$role] = 'Created';
                        $credentialsChanged = true;
                    } elseif ($resetPasswords) {
                        $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
                        $accountStates[$role] = 'Password reset';
                        $credentialsChanged = true;
                    } else {
                        $accountStates[$role] = 'Existing';
                    }
                    $accounts[$role] = $user;
                }
                Store::query()->firstOrCreate(['user_id' => $accounts['seller']->id], ['name' => 'Test Store', 'description' => 'Local dashboard testing', 'status' => 'approved']);
                if (! $accounts['sorting_center']->sortingCenters()->exists()) {
                    $center = SortingCenter::query()->create(['code' => 'TEST-'.Str::upper(Str::random(8)), 'name' => 'Local Test Sorting Center', 'address' => 'Synthetic test address']);
                    $accounts['sorting_center']->sortingCenters()->attach($center->id, ['granted_by' => $accounts['admin']->id]);
                }
                $center = $accounts['sorting_center']->sortingCenters()->firstOrFail();
                if (! $accounts['courier']->sorting_center_id) {
                    $accounts['courier']->forceFill(['sorting_center_id' => $center->id])->save();
                }
                $accounts['courier']->sortingCenters()->syncWithoutDetaching([$center->id => ['granted_by' => $accounts['admin']->id]]);

                return $accounts;
            });
        } catch (\DomainException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
        $this->table(['Role', 'Email', 'Result'], collect($accounts)->map(fn ($user) => [$user->role, $user->email, $accountStates[$user->role]])->all());
        if ($credentialsChanged) {
            $this->line('Password for accounts marked Created or Password reset: '.$password);
            $this->line('Save this password locally. Other existing credentials were preserved.');
        } else {
            $this->info('All test accounts already exist. Existing credentials were preserved.');
        }
        if (! $resetPasswords) {
            $this->line('Forgot the test password? Run php artisan lubosmart:test-accounts --reset-passwords');
        }

        foreach ($accounts as $user) {
            if ($accountStates[$user->role] !== 'Existing') {
                $savedPasswords[$user->email] = $password;
            }
        }
        $disk = Storage::disk('local');
        if (! $disk->put('test-account-passwords.json', json_encode($savedPasswords, JSON_PRETTY_PRINT))) {
            $this->error('Accounts saved, but the password guide could not be written. Save the displayed password before closing this terminal.');

            return self::FAILURE;
        }
        $guide = "# LubosMart local test logins\n\nThese accounts are saved in your local database. Restarting `php artisan serve` does not change them.\n\nOpen http://127.0.0.1:8000/login. Log out before switching roles, or use separate browser profiles.\n\n| Role | Email | Password |\n| --- | --- | --- |\n";
        foreach ($accounts as $user) {
            $known = $savedPasswords[$user->email] ?? '';
            $display = $known && Hash::check($known, $user->password) ? '`'.$known.'`' : 'Existing password unknown; run the reset command below';
            $guide .= '| '.$user->role.' | '.$user->email.' | '.$display." |\n";
        }
        $guide .= "\n## Testing the complete flow\n\n1. Buyer: Discover → add to bag → choose an address → Place COD order.\n2. Seller: Fulfillment → Start preparing → Mark ready for pickup.\n3. Logistics: Parcel operations → Receive parcel → configure Rider Test coverage → select the destination area → Assign Rider Test.\n4. Rider: My deliveries → Confirm pickup → Start delivery → Mark out for delivery → upload a photo → confirm delivery and COD collection.\n5. Logistics: Confirm cash received. Admin: Reconcile COD.\n6. Buyer/seller: open Order conversation to send messages. Reports show completed sales.\n\nUse only synthetic personal information and photos for local testing.\n\n## Start again\n\nStart MySQL, then run `php artisan serve`. In another terminal use `npm run dev`, or build once with `npm run build`. Accounts need no regeneration.\n\nTo intentionally change test passwords: `php artisan lubosmart:test-accounts --reset-passwords`. This guide updates automatically. To add sample products: `php artisan lubosmart:test-accounts --demo`.\n\nThis private file and password metadata are ignored by Git. Do not publish or deploy them. These inboxes are synthetic test identities; do not send real email to them.\n";
        if (! $disk->put('local-test-accounts.md', $guide)) {
            $this->error('Unable to write the login guide. Check local storage permissions.');

            return self::FAILURE;
        }
        $this->info('Persistent login guide: storage/app/private/local-test-accounts.md');
        if ($this->option('demo')) {
            $this->createDemo($accounts);
        }

        return self::SUCCESS;
    }

    private function createDemo(array $accounts): void
    {
        $this->call('db:seed', ['--class' => MarketplaceCategorySeeder::class]);
        $category = Category::query()->where('is_active', true)->where('name', 'Shoes & Accessories')->firstOrFail();
        $store = $accounts['seller']->store;
        if ($store->business_category_id) {
            $category = Category::query()->where('is_active', true)->where('parent_id', $store->business_category_id)->firstOrFail();
        }
        foreach ([['Sample Everyday Tote', '399.00'], ['Sample Everyday Organizer', '249.00'], ['Sample Everyday Pouch', '149.00']] as [$name, $price]) {
            Product::query()->firstOrCreate(['store_id' => $store->id, 'name' => $name], ['category_id' => $category->id, 'description' => 'Synthetic sample listing for local workflow testing.', 'price' => $price, 'stock' => 30, 'status' => 'active']);
        }
        Address::query()->firstOrCreate(['user_id' => $accounts['buyer']->id, 'label' => 'Local test address'], ['recipient_name' => 'Buyer Test', 'phone' => '09000000000', 'line1' => '10 Sample Street', 'barangay' => 'Sample Barangay', 'city' => 'Manila', 'province' => 'Metro Manila', 'region' => 'NCR', 'zip' => '1000']);
        $this->info('Synthetic catalog and address ready. Existing stock and orders were preserved.');
    }
}
