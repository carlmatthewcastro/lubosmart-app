<?php

namespace App\Models;

use App\Services\Admin\AdminPermissions;
use App\Services\EmailVerificationLinks;
use App\Support\AccountRules;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $attributes = ['status' => 'unverified'];

    protected $appends = ['email_verified'];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'google_id',
        'password',
        'role',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'bank_account',
        'email_normalized',
        'phone_normalized',
    ];

    protected static function booted(): void
    {
        static::saving(function (User $user) {
            $user->email_normalized = AccountRules::email($user->email);
            $user->phone_normalized = AccountRules::validPhone($user->phone) ? AccountRules::phone($user->phone) : null;
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'logistics_company_id' => 'integer',
            'bank_account' => 'encrypted',
        ];
    }

    public function application(): HasOne
    {
        return $this->hasOne(RegistrationApplication::class);
    }

    public function scopeNonAdmin(Builder $query): void
    {
        $query->where(fn (Builder $query) => $query->where('role', '!=', 'admin')->orWhereNull('role'));
    }

    public function getEmailVerifiedAttribute(): bool
    {
        return $this->hasVerifiedEmail();
    }

    public function scopeManagedRiders(Builder $query, User $actor): void
    {
        if ($actor->role === 'sorting_center') {
            $query->where(fn ($q) => $q->whereNull('logistics_company_id')->orWhere('logistics_company_id', $actor->id));
        }
    }

    public function sendEmailVerificationNotification(): void
    {
        app(EmailVerificationLinks::class)->send($this);
    }

    public function onboardingRoute(): string
    {
        return match (true) {
            ! $this->hasVerifiedEmail() => 'verification.notice',
            $this->role === null => 'role.choose',
            $this->status === 'pending' => 'application.waiting',
            $this->status !== 'approved' => 'application.edit',
            default => 'dashboard',
        };
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    public function store(): HasOne
    {
        return $this->hasOne(Store::class);
    }

    public function sortingCenters(): BelongsToMany
    {
        $relation = $this->belongsToMany(SortingCenter::class)->withPivot('granted_by')->withTimestamps();
        if ($this->role === 'sorting_center') {
            $relation->where(fn ($q) => $q->whereNull('sorting_centers.company_user_id')->orWhere('sorting_centers.company_user_id', $this->id));
        }

        return $relation;
    }

    public function logisticsCenter(): BelongsTo
    {
        return $this->belongsTo(SortingCenter::class, 'sorting_center_id');
    }

    public function riderCreationCenters(): BelongsToMany
    {
        return $this->sortingCenters()->operational()->where(fn ($centers) => $centers->where('company_user_id', $this->id)
            ->orWhere(fn ($legacy) => $legacy->whereNull('company_user_id')->whereHas('users', fn ($users) => $users->where('role', 'sorting_center'), '=', 1)));
    }

    public function adminPermissions(): array
    {
        return $this->role === 'admin' ? AdminPermissions::ALL : [];
    }

    public function canAdmin(string $permission): bool
    {
        return $this->role === 'admin' && $this->canOperate() && in_array($permission, $this->adminPermissions(), true);
    }

    public function canOperate(): bool
    {
        return $this->status === 'approved' && $this->hasVerifiedEmail()
            && ($this->role !== 'courier' || $this->logisticsCenter()->operational()->exists());
    }
}
