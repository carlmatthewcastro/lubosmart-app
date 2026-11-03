<?php

namespace App\Console\Commands;

use App\Models\PsgcLocation;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ImportAccountLocations extends Command
{
    protected $signature = 'account:import-locations {file : Local CSV with PSGC hierarchy and validated postal codes}';

    protected $description = 'Import validated registration location rows without external lookups';

    public function handle(): int
    {
        $handle = fopen($this->argument('file'), 'r');
        if (! $handle) {
            $this->error('Unable to read the CSV file.');

            return self::FAILURE;
        }
        try {
            $columns = ['region_code', 'region_name', 'province_code', 'province_name', 'city_code', 'city_name', 'barangay_code', 'barangay_name', 'postal_code'];
            if (fgetcsv($handle) !== $columns) {
                $this->error('Expected header: '.implode(',', $columns));

                return self::FAILURE;
            }
            DB::transaction(function () use ($handle, $columns) {
                while (($row = fgetcsv($handle)) !== false) {
                    if (count($row) !== count($columns)) {
                        throw new \InvalidArgumentException('Malformed CSV row.');
                    }
                    $data = array_combine($columns, $row);
                    $rules = array_fill_keys($columns, ['required', 'string', 'max:255']);
                    $rules['region_code'] = ['required', Rule::in(array_keys(config('account-regions')))];
                    $rules['postal_code'] = ['required', 'regex:/\A[0-9]{4}\z/'];
                    foreach (['region_code', 'province_code', 'city_code', 'barangay_code'] as $code) {
                        $rules[$code] = [...(array) $rules[$code], 'regex:/\A[0-9]{9}\z/'];
                    }
                    Validator::make($data, $rules)->validate();
                    PsgcLocation::query()->updateOrCreate(['barangay_code' => $data['barangay_code'], 'postal_code' => $data['postal_code']], $data);
                }
            });
        } finally {
            fclose($handle);
        }
        $this->info('Validated location rows imported.');

        return self::SUCCESS;
    }
}
