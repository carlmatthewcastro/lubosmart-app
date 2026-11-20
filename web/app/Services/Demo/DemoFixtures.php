<?php

namespace App\Services\Demo;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class DemoFixtures
{
    public function once(string $key, string $type, callable $create): Model
    {
        $existing = DB::table('demo_fixtures')->where('fixture_key', 'lubosmart-v1:'.$key)->first();
        if ($existing) {
            if ($existing->record_type !== $type || ! ($model = $type::query()->find($existing->record_id))) {
                throw new RuntimeException('Demo fixture missing or changed: '.$key.'. Restore/review it rather than resetting live progress.');
            }

            return $model;
        }

        return DB::transaction(function () use ($key, $type, $create) {
            $model = $create();
            DB::table('demo_fixtures')->insert(['fixture_key' => 'lubosmart-v1:'.$key, 'record_type' => $type, 'record_id' => $model->getKey(), 'created_at' => now(), 'updated_at' => now()]);

            return $model;
        });
    }

    public function ids(string $type): array
    {
        return DB::table('demo_fixtures')->where('record_type', $type)->pluck('record_id')->all();
    }
}
