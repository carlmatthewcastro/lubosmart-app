<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountServiceArea extends Model
{
    public $timestamps = false;

    public $incrementing = false;

    protected $fillable = ['account_id', 'region_code'];
}
