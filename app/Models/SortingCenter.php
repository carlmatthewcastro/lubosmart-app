<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SortingCenter extends Model
{
    protected $fillable = ['code', 'name', 'address', 'phone', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
