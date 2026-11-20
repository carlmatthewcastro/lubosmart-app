<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MarketplaceCategorySeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            foreach (config('marketplace_categories') as $departmentName => $children) {
                $departmentSlug = Str::slug($departmentName);
                $department = Category::query()->where('slug', $departmentSlug)->first();

                // Adopt an existing exact-name root without changing referenced IDs.
                $department ??= Category::query()
                    ->whereNull('parent_id')
                    ->whereNull('slug')
                    ->where('name', $departmentName)
                    ->first();

                $department ??= new Category;
                $department->fill([
                    'name' => $departmentName,
                    'slug' => $departmentSlug,
                    'parent_id' => null,
                ])->save();

                foreach ($children as $position => $name) {
                    Category::query()->updateOrCreate(
                        ['slug' => $departmentSlug.'--'.Str::slug($name)],
                        ['name' => $name, 'parent_id' => $department->id, 'sort_order' => $position],
                    );
                }
            }
        });
    }
}
