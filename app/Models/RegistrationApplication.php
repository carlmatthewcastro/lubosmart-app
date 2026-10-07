<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RegistrationApplication extends Model
{
    protected $attributes = ['status' => 'draft'];

    protected $fillable = ['user_id', 'requested_role', 'status', 'business_name', 'sorting_center_id', 'policy_version', 'policy_accepted_at', 'submitted_at', 'reviewed_at', 'reviewer_id', 'rejection_reason'];

    protected function casts(): array
    {
        return ['policy_accepted_at' => 'datetime', 'submitted_at' => 'datetime', 'reviewed_at' => 'datetime', 'draft_saved_at' => 'datetime', 'draft_data' => 'array'];
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
