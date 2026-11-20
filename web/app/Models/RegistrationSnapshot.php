<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use LogicException;

class RegistrationSnapshot extends Model
{
    public $timestamps = false;

    protected $fillable = ['account_id', 'payload'];

    protected function casts(): array
    {
        return ['payload' => 'array'];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Registration snapshots are immutable.'));
        static::deleting(fn () => throw new LogicException('Registration snapshots are immutable.'));
    }
}
