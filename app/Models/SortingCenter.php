<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class SortingCenter extends Model
{
    protected $fillable = ['code', 'name', 'address', 'phone', 'is_active'];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot('granted_by')->withTimestamps();
    }

    public function scopeOperational(Builder $query): void
    {
        $query->where('is_active', true)->whereHas('users', fn (Builder $users) => $users
            ->where('role', 'sorting_center')->where('status', 'approved')->whereNotNull('email_verified_at'));
    }

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
