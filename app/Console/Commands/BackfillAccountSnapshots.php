<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\AccountSettings;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BackfillAccountSnapshots extends Command
{
    protected $signature = 'account:backfill-snapshots';

    protected $description = 'Capture immutable baselines for existing approved logistics accounts';

    public function handle(AccountSettings $settings): int
    {
        User::query()->where('role', 'logistics')->where('status', 'approved')->whereHas('application', fn ($query) => $query->where('status', 'approved'))->eachById(function ($account) use ($settings) {
            DB::transaction(function () use ($account, $settings) {
                $user = User::query()->whereKey($account->id)->lockForUpdate()->firstOrFail();
                if ($user->status === 'approved') {
                    $settings->capture($user);
                }
            });
        });
        $this->info('Approved logistics account baselines captured.');

        return self::SUCCESS;
    }
}
