<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class RegistrationApplication extends Model
{
    protected $attributes = ['status' => 'draft'];

    protected $appends = ['draft_data', 'draft_saved_at'];

    protected $fillable = ['user_id', 'requested_role', 'status', 'business_name', 'sorting_center_id', 'policy_version', 'policy_accepted_at', 'submitted_at', 'reviewed_at', 'reviewer_id', 'rejection_reason'];

    protected function casts(): array
    {
        return ['policy_accepted_at' => 'datetime', 'submitted_at' => 'datetime', 'reviewed_at' => 'datetime'];
    }

    public function draftRecord(): HasOne
    {
        return $this->hasOne(RegistrationApplicationDraft::class);
    }

    public function getDraftDataAttribute(): ?array
    {
        return $this->draftRecord?->data;
    }

    public function getDraftSavedAtAttribute(): mixed
    {
        return $this->draftRecord?->saved_at;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(RegistrationDocument::class);
    }
}
