<?php

namespace App\Console\Commands;

use App\Services\Demo\DemoPreflight;
use App\Services\Demo\DemoVerification;
use Illuminate\Console\Command;

class DemoVerify extends Command
{
    protected $signature = 'lubosmart:demo-verify';

    protected $description = 'Read-only financial reconciliation of registered LubosMart demo fixtures';

    public function handle(DemoPreflight $preflight, DemoVerification $verification): int
    {
        $preflight->inspect();
        $this->info(json_encode($verification->reconcile(), JSON_THROW_ON_ERROR));

        return self::SUCCESS;
    }
}
