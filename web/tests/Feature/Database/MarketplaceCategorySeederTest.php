<?php

use App\Models\Category;
use Database\Seeders\MarketplaceCategorySeeder;

it('seeds the complete course taxonomy without replacing existing category identities', function () {
    $legacy = Category::query()->create(['name' => 'Legacy category']);
    $existing = Category::query()->create(['name' => 'Pet Supplies']);

    $this->seed(MarketplaceCategorySeeder::class);
    $this->seed(MarketplaceCategorySeeder::class);

    expect(Category::query()->whereNotNull('slug')->count())->toBe(97);
    expect(Category::query()->whereNull('parent_id')->whereNotNull('slug')->count())->toBe(14);
    expect(Category::query()->whereNotNull('parent_id')->count())->toBe(83);
    expect($legacy->fresh()->name)->toBe('Legacy category');
    expect($existing->fresh()->slug)->toBe('pet-supplies');
    expect($existing->fresh()->children)->toHaveCount(6);
});

it('keeps repeated subcategory labels in their correct departments', function () {
    $this->seed(MarketplaceCategorySeeder::class);

    $categories = Category::query()->with('parent')->where('name', 'Shoes & Accessories')->get();

    expect($categories)->toHaveCount(2);
    expect($categories->pluck('parent.name')->sort()->values()->all())
        ->toBe(["Men's Apparel", "Women's Apparel"]);
    expect($categories->pluck('slug')->unique())->toHaveCount(2);
});

it('preserves disabled category settings when the taxonomy is reseeded', function () {
    $this->seed(MarketplaceCategorySeeder::class);
    $category = Category::query()->where('slug', 'pet-supplies--dog-food-treats')->firstOrFail();
    $category->update(['is_active' => false]);

    $this->seed(MarketplaceCategorySeeder::class);

    expect($category->fresh()->is_active)->toBeFalse();
});
