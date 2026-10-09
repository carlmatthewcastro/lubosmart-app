<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class PhilippineLocations
{
    public function provinces(): array
    {
        return [...$this->fetch('provinces'), ['code' => '130000000', 'name' => 'Metro Manila (NCR)', 'regionCode' => '130000000']];
    }

    public function cities(string $province): array
    {
        return array_values(array_filter($this->fetch('cities-municipalities'), fn ($city) => $province === '130000000'
            ? ($city['regionCode'] ?? null) === $province
            : ($city['provinceCode'] ?? null) === $province));
    }

    public function barangays(string $city): array
    {
        return $this->fetch('cities-municipalities/'.$city.'/barangays');
    }

    public function resolve(string $provinceCode, string $cityCode, string $barangayCode): array
    {
        $province = collect($this->provinces())->firstWhere('code', $provinceCode);
        $city = collect($this->cities($provinceCode))->firstWhere('code', $cityCode);
        $barangay = $city ? collect($this->barangays($cityCode))->firstWhere('code', $barangayCode) : null;
        if (! $province || ! $city || ! $barangay) {
            throw ValidationException::withMessages(['barangay_code' => 'Choose a valid province, city or municipality, and barangay.']);
        }

        return ['province' => $province['name'], 'city' => $city['name'], 'barangay' => $barangay['name'], 'region' => $city['regionCode']];
    }

    public function validateDraft(array $selection): void
    {
        $province = $selection['province_code'] ?? null;
        $city = $selection['city_code'] ?? null;
        $barangay = $selection['barangay_code'] ?? null;
        if (! $province && ! $city && ! $barangay) {
            return;
        }
        if (! $province || ! collect($this->provinces())->firstWhere('code', $province)) {
            throw ValidationException::withMessages(['province_code' => 'Choose a valid province.']);
        }
        if (($city || $barangay) && (! $city || ! collect($this->cities($province))->firstWhere('code', $city))) {
            throw ValidationException::withMessages(['city_code' => 'Choose a municipality belonging to the selected province.']);
        }
        if ($barangay && ! collect($this->barangays($city))->firstWhere('code', $barangay)) {
            throw ValidationException::withMessages(['barangay_code' => 'Choose a barangay belonging to the selected municipality.']);
        }
    }

    private function fetch(string $path): array
    {
        try {
            return Cache::remember('psgc:'.$path, now()->addDay(), function () use ($path) {
                $response = Http::acceptJson()->connectTimeout(5)->timeout(15)->get('https://psgc.gitlab.io/api/'.$path.'/')->throw();
                $data = $response->json();
                if (! is_array($data) || ! array_is_list($data)) {
                    throw new \RuntimeException('Invalid location response.');
                }

                return $data;
            });
        } catch (\Exception $exception) {
            report($exception);
            throw ValidationException::withMessages(['province_code' => 'The address service is temporarily unavailable. Please try again.']);
        }
    }
}
