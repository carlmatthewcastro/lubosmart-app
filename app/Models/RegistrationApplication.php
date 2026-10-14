<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class RegistrationApplication extends Model
{
    protected $attributes = ['status' => 'draft'];

    protected $appends = ['draft_data', 'draft_saved_at'];

    public function scopeAdminReviewable(Builder $query): void
    {
        $query->where('requested_role', '!=', 'courier');
    }

    protected static function booted(): void
    {
        static::saving(function (RegistrationApplication $application) {
            if ($application->requested_role === 'sorting_center') {
                $application->company_name_normalized = filled($application->business_name) ? mb_strtolower(trim($application->business_name)) : null;
            }
        });
    }

    protected $fillable = ['user_id', 'requested_role', 'status', 'business_name', 'sorting_center_id', 'policy_version', 'policy_accepted_at', 'submitted_at', 'reviewed_at', 'reviewer_id', 'rejection_reason', 'registration_contract', 'seller_type', 'tin', 'region_code', 'company_name_normalized', 'sec_number', 'position', 'service_regions', 'service_region_names'];

    protected function casts(): array
    {
        return ['policy_accepted_at' => 'datetime', 'submitted_at' => 'datetime', 'reviewed_at' => 'datetime', 'service_regions' => 'array', 'service_region_names' => 'array'];
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
