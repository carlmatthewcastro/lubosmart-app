<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChangeRequest extends Model
{
    public $timestamps = false;

    protected $fillable = ['account_id', 'field', 'old_value', 'new_value', 'status', 'reason', 'requested_at', 'reviewed_by', 'reviewed_at'];

    protected function casts(): array
    {
        return ['old_value' => 'array', 'new_value' => 'array', 'requested_at' => 'datetime', 'reviewed_at' => 'datetime'];
    }
}
