<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductVariant extends Model
{
    protected $fillable = ['product_id', 'name', 'stock', 'is_active', 'is_legacy'];

    protected function casts(): array
    {
        return ['stock' => 'integer', 'is_active' => 'boolean', 'is_legacy' => 'boolean'];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
