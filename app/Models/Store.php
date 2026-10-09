<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Store extends Model
{
    protected $hidden = ['bank_account'];

    protected function casts(): array
    {
        return ['bank_account' => 'encrypted'];
    }

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'status',
        'business_category_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function businessCategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'business_category_id');
    }
}
