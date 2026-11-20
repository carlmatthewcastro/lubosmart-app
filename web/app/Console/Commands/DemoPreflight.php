<?php

namespace App\Console\Commands;

use App\Services\Demo\DemoPreflight as InspectDemo;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DemoPreflight extends Command
{
    protected $signature = 'lubosmart:demo-preflight';

    protected $description = 'Read-only audit of the primary accounts and approved demo prerequisites';

    public function handle(InspectDemo $preflight): int
    {
        try {
            $context = $preflight->inspect();
            $this->line('Database: '.DB::connection()->getDatabaseName());
            $this->line('Facility: '.$context['center']->name.' (#'.$context['center']->id.')');
            $this->table(['Role', 'Email', 'ID', 'Password'], collect($context['accounts'])->map(fn ($user, $role) => [$role, $user->email, $user->id, 'Existing password retained'])->all());
            foreach ($context['areas'] as $role => $area) {
                $this->line($role.': '.$area->barangay_name.', '.$area->city_name.'; base cents='.$area->base_fee_cents.'; extra kg cents='.$area->extra_kg_fee_cents);
            }
            $this->warn('Rider compensation requires an approved manual amount and will not be seeded.');

            return self::SUCCESS;
        } catch (\RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
    }
}
