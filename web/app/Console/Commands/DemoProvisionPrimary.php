<?php

namespace App\Console\Commands;

use App\Http\Requests\Auth\RegisterAccountRequest;
use App\Models\User;
use App\Services\Demo\DemoPreflight;
use App\Services\RegisterAccount;
use App\Support\AccountRules;
use Illuminate\Console\Command;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Validator;

class DemoProvisionPrimary extends Command
{
    protected $signature = 'lubosmart:demo-provision-primary {--input= : Private JSON file containing missing account registration data} {--apply : Create missing accounts; otherwise audit only}';

    protected $description = 'Audit primary accounts and optionally provision missing identities without updating existing users';

    public function handle(DemoPreflight $preflight): int
    {
        $preflight->assertEnvironment();
        $missing = [];
        foreach (config('demo.primary') as $role => $email) {
            $existing = User::query()->where('email_normalized', $email)->first();
            if ($existing) {
                $this->line($role.': existing #'.$existing->id.'; credentials, OAuth and account state retained.');
                if ($existing->role !== $role) {
                    $this->error('Role conflict requires operator review; no changes made.');

                    return self::FAILURE;
                }
            } else {
                $missing[$email] = $role;
                $this->warn($role.': missing '.$email);
            }
        }
        if (! $this->option('apply') || ! $missing) {
            $this->line('Audit only; no existing account was changed.');

            return self::SUCCESS;
        }
        $path = $this->option('input');
        if (! $path || ! is_file($path)) {
            $this->error('Missing accounts require --input pointing to a private JSON registration file.');

            return self::FAILURE;
        }
        $records = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
        foreach ($missing as $email => $role) {
            if (! isset($records[$email]) || ! is_array($records[$email])) {
                $this->error('Private provisioning data missing for '.$email.'. No accounts created.');

                return self::FAILURE;
            }
        }
        $mail = Mail::getFacadeRoot();
        $notifications = Notification::getFacadeRoot();
        Mail::fake();
        Notification::fake();
        try {
            DB::transaction(function () use ($missing, $records) {
                foreach ($missing as $email => $role) {
                    // Recheck inside the transaction: never replace an account created meanwhile.
                    if (User::query()->where('email_normalized', $email)->lockForUpdate()->exists()) {
                        continue;
                    }
                    $data = [...$records[$email], 'email' => $email, 'role' => $role];
                    if ($role === 'admin') {
                        Validator::make($data, ['name' => ['required', ...AccountRules::name(160)],
                            'password' => ['required', 'confirmed', ...AccountRules::password()]])->validate();
                        // Admin has no public registration route. This is explicit CLI bootstrap only.
                        $user = User::query()->create(collect($data)->only(['name', 'email', 'password', 'role'])->all());
                        $user->forceFill(['status' => 'approved', 'email_verified_at' => now()])->save();
                    } else {
                        $files = [];
                        foreach (['identity', 'business_permit', 'dti_certificate', 'sec_certificate', 'bir_2303', 'license', 'vehicle_registration'] as $kind) {
                            if (isset($data[$kind])) {
                                $file = $data[$kind];
                                if (! is_string($file) || ! is_file($file)) {
                                    throw new \RuntimeException('Required private document file is missing: '.$kind);
                                }
                                $files[$kind] = new UploadedFile($file, basename($file), null, null, true);
                                unset($data[$kind]);
                            }
                        }
                        $request = RegisterAccountRequest::create('/register', 'POST', $data, files: $files);
                        $request->setContainer(app());
                        $request->setRedirector(app('redirect'));
                        $request->setUserResolver(fn () => null);
                        $request->validateResolved();
                        app(RegisterAccount::class)->create($request->validated());
                        // Supplied credentials do not establish verified email or business approval.
                        // Finish the real verification/approval workflow after provisioning.
                    }
                }
            });
            $this->info('Missing identities provisioned. Non-admin accounts still require normal verification and approval.');

            return self::SUCCESS;
        } finally {
            Mail::swap($mail);
            Notification::swap($notifications);
        }
    }
}
