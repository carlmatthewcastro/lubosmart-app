<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportCaseMessage extends Model
{
    protected $fillable = ['support_case_id', 'user_id', 'body', 'attachment_path', 'attachment_name'];

    protected $hidden = ['attachment_path'];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
