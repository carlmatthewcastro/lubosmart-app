<?php

namespace App\Services;

class PhilippinePostalCodes
{
    private array $codes = [];

    public function __construct()
    {
        $rows = json_decode(file_get_contents(resource_path('data/phlpost-postal-codes.json')), true, flags: JSON_THROW_ON_ERROR)['rows'];
        foreach ($rows as $row) {
            $key = $this->normalize($row[1]).'|'.$this->normalize($row[2]);
            $this->codes[$key][$row[3]] = true;
        }
    }

    public function forCity(string $province, string $city): ?string
    {
        $codes = array_keys($this->codes[$this->normalize($province).'|'.$this->normalize($city)] ?? []);

        return count($codes) === 1 ? (string) $codes[0] : null;
    }

    private function normalize(string $name): string
    {
        $name = mb_strtolower($name);
        $name = preg_replace('/\b(city of|municipality of|city|municipality)\b|\(ncr\)/u', '', $name);
        $name = preg_replace('/\bsta\.?\s/u', 'santa ', $name);

        return trim(preg_replace('/[^\p{L}\p{N}]+/u', ' ', $name));
    }
}
