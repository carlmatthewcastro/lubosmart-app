<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'description' => $this->description,
            'price' => $this->price, 'currency' => 'PHP', 'stock' => $this->stock,
            'weight_grams' => $this->weight_grams, 'image_url' => $this->image_url,
            'store' => ['id' => $this->store->id, 'name' => $this->store->name],
            'category' => ['id' => $this->category->id, 'name' => $this->category->name],
            'variants' => $this->variants->where('is_active', true)->where('is_legacy', false)->values()->map(fn ($variant) => [
                'id' => $variant->id, 'name' => $variant->name, 'stock' => $variant->stock,
            ]),
            'review_count' => (int) $this->reviews_count,
            'average_rating' => $this->reviews_avg_rating === null ? null : round((float) $this->reviews_avg_rating, 2),
        ];
    }
}
