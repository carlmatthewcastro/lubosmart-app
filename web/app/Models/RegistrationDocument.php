<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistrationDocument extends Model
{
    protected $fillable = ['registration_application_id', 'kind', 'disk', 'path', 'mime_type', 'size_bytes'];

    public function application(): BelongsTo
    {
        return $this->belongsTo(RegistrationApplication::class, 'registration_application_id');
    }
}
