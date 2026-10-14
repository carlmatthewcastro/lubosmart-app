<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Product extends Model
{
    protected $appends = ['image_url'];

    protected function imageUrl(): Attribute
    {
        return Attribute::get(fn () => $this->image_path ? Storage::disk('public')->url($this->image_path) : null);
    }

    protected $fillable = [
        'store_id',
        'category_id',
        'name',
        'description',
        'price',
        'stock',
        'weight_grams',
        'image_path',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'stock' => 'integer',
            'weight_grams' => 'integer',
        ];
    }

    public function scopeAvailableToShoppers(Builder $query): Builder
    {
        return $query->where('status', 'active')
            ->whereHas('store', fn ($q) => $q->where('status', 'approved')->whereHas('user', fn ($user) => $user->where('role', 'seller')->where('status', 'approved')->whereNotNull('email_verified_at')))
            ->whereHas('category', fn ($q) => $q->where('is_active', true)->where(fn ($q) => $q->whereNull('parent_id')->orWhereHas('parent', fn ($q) => $q->where('is_active', true))));
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
