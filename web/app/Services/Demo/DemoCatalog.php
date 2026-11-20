<?php

namespace App\Services\Demo;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StoreVoucher;

class DemoCatalog
{
    public function __construct(private DemoFixtures $fixtures, private DemoProductPhotos $photos) {}

    public static function stores(): array
    {
        return [
            ['name' => 'Calios Kusina at Kape', 'department' => 'Food and Gourmet', 'description' => 'Pantry staples, snacks and coffee for neighborhood households.'],
            ['name' => 'Papel at Pangarap', 'department' => 'Office and School Supplies', 'description' => 'Everyday school and office supplies.'],
            ['name' => 'Bahay Calios Essentials', 'department' => 'Home and Garden', 'description' => 'Practical household and garden essentials.'],
            ['name' => 'Laguna Gadget Corner', 'department' => 'Electronics and Gadgets', 'description' => 'Phone accessories and small electronics.'],
        ];
    }

    public static function departments(): array
    {
        return ['Books and Media', ...array_column(self::stores(), 'department')];
    }

    public function create(array $sellers): array
    {
        // Product prices are fictional retail listing prices, never operational charges.
        $groups = [
            ['Fiction & Non-Fiction Books', [
                ['Mga Kuwento sa Laguna', 245, 350], ['Everyday Filipino Recipes', 320, 450], ['Practical Backyard Gardening', 280, 400],
                ['English Grammar Companion', 195, 300], ['Algebra Practice Workbook', 180, 280], ['Pocket Filipino Dictionary', 150, 240],
                ['Weekend Reading Collection', 390, 600], ['Children\'s Animal Stories', 210, 320], ['Small Business Notebook Guide', 265, 360],
            ]],
            ['Coffee, Tea & Beverages', [
                ['Roasted Barako Coffee 250g', 185, 300], ['Classic Ground Coffee 250g', 165, 300], ['Ginger Tea 20 Sachets', 95, 180],
                ['Calamansi Drink Mix 250g', 80, 300], ['Cocoa Tablea 200g', 135, 250], ['Lemongrass Tea 20 Bags', 110, 150],
                ['Breakfast Coffee Blend 500g', 295, 550], ['Brown Sugar Coffee Mix 10s', 120, 300], ['Roasted Rice Coffee 250g', 105, 300],
            ]],
            ['Notebooks & Paper Products', [
                ['Spiral Study Notebook A5', 65, 250], ['Hardbound Journal A5', 145, 350], ['Intermediate Paper Pad', 55, 300],
                ['Index Card Pack 100s', 75, 200], ['A4 Copy Paper 100 Sheets', 95, 550], ['Sticky Notes Set', 85, 180],
                ['Weekly Desk Planner', 165, 400], ['Graph Notebook A4', 95, 300], ['Drawing Paper Pad A4', 135, 450],
            ]],
            ['Gardening Tools', [
                ['Hand Garden Trowel', 120, 350], ['Plant Pruning Scissors', 245, 400], ['Garden Gloves Pair', 95, 180],
                ['Seedling Pot Set 6s', 160, 500], ['Watering Can 1 Liter', 195, 400], ['Plant Label Set 20s', 65, 120],
                ['Mini Garden Rake', 110, 300], ['Coir Seedling Tray', 135, 250], ['Garden Twine Roll', 85, 200],
            ]],
            ['Mobile Phones & Accessories', [
                ['Braided USB-C Cable 1m', 125, 120], ['Foldable Phone Stand', 165, 200], ['Universal Phone Pouch', 95, 150],
                ['USB-C Cable Organizer Set', 75, 100], ['Microfiber Screen Cloth Set', 65, 100], ['Adjustable Tablet Stand', 295, 450],
                ['Wired Earphones 3.5mm', 185, 150], ['Travel Gadget Storage Pouch', 245, 220], ['Phone Grip Ring', 85, 100],
            ]],
        ];
        $products = [];
        foreach ($sellers as $storeIndex => $seller) {
            [$categoryName, $items] = $groups[$storeIndex];
            $category = Category::query()->where('name', $categoryName)->where('is_active', true)->firstOrFail();
            $store = $seller->store;
            foreach ($items as $index => [$name, $price, $weight]) {
                $key = 'product:'.$storeIndex.':'.$index;
                $product = $this->fixtures->once($key, Product::class, function () use ($store, $category, $name, $price, $weight, $index, $storeIndex) {
                    $product = Product::query()->create(['store_id' => $store->id, 'category_id' => $category->id, 'name' => $name,
                        'description' => '[DEMO] Fictional marketplace listing for LubosMart demonstrations. '.$name.'. Packed carefully for local delivery. No real fulfillment.'."\n\n".$this->photos->credit($storeIndex.':'.$index),
                        'price' => $price, 'weight_grams' => $weight, 'stock' => 150, 'status' => 'active', 'image_path' => $this->photos->path($storeIndex.':'.$index)]);
                    if (in_array($storeIndex, [0, 2, 4], true) && $index % 3 === 0) {
                        foreach (['Blue', 'Cream'] as $option) {
                            ProductVariant::query()->create(['product_id' => $product->id, 'name' => $option, 'stock' => 75, 'is_active' => true]);
                        }
                    }

                    return $product;
                });
                $this->photos->install($storeIndex.':'.$index);
                $products[$storeIndex][] = $product;
            }
            foreach (['starter-10', 'starter-20'] as $templateKey) {
                $this->fixtures->once('voucher:'.$storeIndex.':'.$templateKey, StoreVoucher::class, function () use ($store, $templateKey, $storeIndex) {
                    $template = config('shop-vouchers.templates.'.$templateKey);

                    return StoreVoucher::query()->create(['store_id' => $store->id, 'code' => 'LMDEMO-'.$storeIndex.'-'.strtoupper($templateKey),
                        'amount_cents' => $template['amount_cents'], 'minimum_cents' => $template['minimum_cents'], 'usage_limit' => $template['usage_limit'],
                        'expires_at' => now()->addDays($template['days']), 'is_active' => true, 'is_public' => true]);
                });
            }
        }
        $this->photos->installCredits();

        return $products;
    }
}
