<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SupportCase extends Model
{
    protected $fillable = ['opened_by', 'seller_order_id', 'kind', 'subject', 'status', 'resolution', 'resolved_by', 'resolved_at'];

    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'support_case_participants');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportCaseMessage::class);
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(SupportCaseMessage::class)->latestOfMany();
    }
}
