<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnEvent extends Model
{
    protected $fillable = ['parcel_return_id', 'actor_id', 'action', 'notes'];
}
