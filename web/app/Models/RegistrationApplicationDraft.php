<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistrationApplicationDraft extends Model
{
    protected $fillable = ['data', 'saved_at'];

    protected function casts(): array
    {
        return ['data' => 'array', 'saved_at' => 'datetime'];
    }
}
