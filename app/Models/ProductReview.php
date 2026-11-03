<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductReview extends Model
{
    protected $fillable = ['order_item_id', 'product_id', 'user_id', 'rating', 'body', 'is_visible', 'moderation_reason'];

    protected $hidden = ['user_id', 'moderation_reason'];

    protected function casts(): array
    {
        return ['rating' => 'integer', 'is_visible' => 'boolean'];
    }
}
