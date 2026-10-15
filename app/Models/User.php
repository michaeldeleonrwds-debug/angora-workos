<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, HasRoles, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'department',
        'phone',
        'avatar_url',
        'avatar',
        'status',
        'timezone',
        'weekly_capacity_hours',
        'daily_capacity_hours',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'legacy_role',
    ];

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
            'weekly_capacity_hours' => 'float',
            'daily_capacity_hours' => 'float',
        ];
    }

    public function getAvatarAttribute(?string $value): ?string
    {
        return $value ?? $this->avatar_url;
    }

    public function getAvatarUrlAttribute(?string $value): ?string
    {
        return $value ?? $this->attributes['avatar'] ?? null;
    }

    public function setAvatarAttribute(?string $value): void
    {
        $this->attributes['avatar'] = $value;
        $this->attributes['avatar_url'] = $value;
    }

    public function setAvatarUrlAttribute(?string $value): void
    {
        $this->attributes['avatar_url'] = $value;
        $this->attributes['avatar'] = $value;
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }

    public function primaryRoleName(): ?string
    {
        return $this->getRoleNames()->first();
    }

    public function toArray(): array
    {
        $attributes = parent::toArray();
        // Presentation compatibility only; there is no Eloquent role attribute.
        $attributes['role'] = $this->primaryRoleName();

        return $attributes;
    }

    public function notifications()
    {
        return $this->hasMany(SystemNotification::class);
    }

    public function systemNotifications()
    {
        return $this->hasMany(SystemNotification::class);
    }

    public function notificationPreferences()
    {
        return $this->hasMany(NotificationPreference::class);
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }

    public function hasPermission(string $permission): bool
    {
        return $this->checkPermissionTo($permission);
    }

    public function managedProjects()
    {
        return $this->hasMany(AgencyProject::class, 'project_manager_id');
    }

    public function ledProjects()
    {
        return $this->hasMany(AgencyProject::class, 'project_leader_id');
    }

    public function projectMemberships()
    {
        return $this->hasMany(ProjectMember::class, 'user_id');
    }

    public function projects()
    {
        return $this->belongsToMany(AgencyProject::class, 'project_members', 'user_id', 'project_id')
            ->withPivot('agency_role')
            ->withTimestamps();
    }

    public function customerProfile()
    {
        return $this->hasOne(SalesCustomer::class, 'user_id');
    }

    public function workspaces()
    {
        return $this->belongsToMany(Workspace::class, 'workspace_members');
    }

    public function getCurrentWorkspaceIdAttribute(): ?int
    {
        return $this->workspaces()->first()?->id ?? Workspace::first()?->id ?? 1;
    }
}
