<?php

namespace App\Console\Commands;

use App\Services\Demo\DemoPreflight;
use App\Services\Demo\DemoProductPhotos;
use Illuminate\Console\Command;

class DemoPhotos extends Command
{
    protected $signature = 'lubosmart:demo-photos';

    protected $description = 'Replace owned demo SVG placeholders with reviewed, licensed real photographs';

    public function handle(DemoPreflight $preflight, DemoProductPhotos $photos): int
    {
        $preflight->inspect();
        $result = $photos->upgrade();
        $this->info($result['updated'].' demo product images replaced; '.$result['preserved'].' custom seller images preserved.');

        return self::SUCCESS;
    }
}
