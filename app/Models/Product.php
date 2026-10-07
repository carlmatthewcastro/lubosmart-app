<?php

namespace App\Models;

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
        'image_path',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'stock' => 'integer',
        ];
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
