<?php

namespace App\Services\Demo;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class DemoProductPhotos
{
    private ?array $sources = null;

    private ?array $catalog = null;

    private array $installed = [];

    public function photo(string $key): array
    {
        $this->sources ??= json_decode(file_get_contents(database_path('demo/assets/photos/sources.json')), true, flags: JSON_THROW_ON_ERROR);
        $this->catalog ??= json_decode(file_get_contents(database_path('demo/assets/photos/catalog.json')), true, flags: JSON_THROW_ON_ERROR);
        $photo = $this->sources[$this->catalog[$key] ?? ''] ?? null;
        if (! $photo || ! preg_match('/^[a-z]+\.jpg$/', $photo['file'])) {
            throw new RuntimeException('A reviewed real catalog photograph is missing for '.$key);
        }

        return $photo;
    }

    public function path(string $key): string
    {
        $photo = $this->photo($key);

        return 'demo/catalog/photos/'.substr($photo['sha256'], 0, 12).'-'.$photo['file'];
    }

    public function credit(string $key): string
    {
        $photo = $this->photo($key);

        return 'Illustrative real photograph; actual demo item/packaging may differ. Photo: '.$photo['artist'].'. '.$photo['license'].' ('.$photo['license_url'].'). Source: '.$photo['source'];
    }

    public function install(string $key): string
    {
        $target = $this->path($key);
        if (isset($this->installed[$target])) {
            return $target;
        }
        $photo = $this->photo($key);
        $source = database_path('demo/assets/photos/'.$photo['file']);
        if (! is_file($source) || ! hash_equals($photo['sha256'], hash_file('sha256', $source))) {
            throw new RuntimeException('Catalog photo is absent or corrupted: '.$photo['file']);
        }
        $disk = Storage::disk('public');
        if (! $disk->exists($target)) {
            if (! $disk->put($target, file_get_contents($source))) {
                throw new RuntimeException('Cannot install real product photograph.');
            }
        }
        $this->installed[$target] = true;

        return $target;
    }

    /** Only the original demo placeholder is eligible; preserve seller-supplied images. */
    public function upgrade(): array
    {
        return DB::transaction(function () {
            DB::table('demo_fixtures')->where('fixture_key', 'lubosmart-v1:root')->lockForUpdate()->first();
            $updated = $preserved = 0;
            foreach (DB::table('demo_fixtures')->where('record_type', Product::class)->orderBy('id')->get() as $fixture) {
                if (! preg_match('/^lubosmart-v1:product:(\d):(\d)$/', $fixture->fixture_key, $matches)) {
                    continue;
                }
                $key = $matches[1].':'.$matches[2];
                $product = Product::query()->whereKey($fixture->record_id)->lockForUpdate()->firstOrFail();
                $target = $this->install($key);
                if ($product->image_path === $target) {
                    continue;
                }
                if ($product->image_path !== 'demo/catalog/'.$matches[1].'-'.$matches[2].'.svg') {
                    $preserved++;

                    continue;
                }
                // Keep the original description; add the photo's attribution and clear illustration note.
                $description = (string) $product->description;
                if (! str_contains($description, $this->credit($key))) {
                    $description .= "\n\n".$this->credit($key);
                }
                $product->fill(['image_path' => $target, 'description' => $description])->save();
                $updated++;
            }
            $this->installCredits();

            return compact('updated', 'preserved');
        });
    }

    public function installCredits(): void
    {
        if (! Storage::disk('public')->put('demo/catalog/photos/credits.html', file_get_contents(database_path('demo/assets/photos/credits.html')))) {
            throw new RuntimeException('Cannot install product photograph credits.');
        }
    }
}
