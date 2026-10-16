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
    use HasFactory, Notifiable;
    use HasRoles {
        assignRole as traitAssignRole;
        syncRoles as traitSyncRoles;
        hasRole as traitHasRole;
    }

    /**
     * Map of legacy or obsolete roles to their supported Work OS canonical role.
     *
     * @var array<string, string>
     */
    protected static array $legacyRoleMap = [
        'admin_manager' => 'admin',
        'dept_user' => 'employee',
        'team_member' => 'employee',
        'production_staff' => 'employee',
        'sales_staff' => 'employee',
        'marketing_staff' => 'employee',
        'finance_staff' => 'employee',
        'hr_staff' => 'employee',
        'external_user' => 'employee',
        'client' => 'employee',
    ];

    /**
     * Normalize role name from legacy aliases if needed.
     */
    public static function normalizeLegacyRole(string $role): string
    {
        return static::$legacyRoleMap[$role] ?? $role;
    }

    /**
     * Override Spatie assignRole to map legacy roles cleanly.
     */
    public function assignRole(...$roles)
    {
        $roleList = is_array($roles[0] ?? null) ? $roles[0] : $roles;
        $normalized = array_map(function ($role) {
            if (is_string($role)) {
                return static::normalizeLegacyRole($role);
            }
            return $role;
        }, $roleList);

        return $this->traitAssignRole(...$normalized);
    }

    /**
     * Override Spatie syncRoles to map legacy roles cleanly.
     */
    public function syncRoles(...$roles)
    {
        $roleList = is_array($roles[0] ?? null) ? $roles[0] : $roles;
        $normalized = array_map(function ($role) {
            if (is_string($role)) {
                return static::normalizeLegacyRole($role);
            }
            return $role;
        }, $roleList);

        return $this->traitSyncRoles(...$normalized);
    }

    /**
     * Override Spatie hasRole to match legacy role aliases.
     */
    public function hasRole($roles, ?string $guard = null): bool
    {
        $hasDirect = $this->traitHasRole($roles, $guard);
        if ($hasDirect) {
            return true;
        }

        if (is_string($roles)) {
            $mapped = static::normalizeLegacyRole($roles);
            if ($mapped !== $roles) {
                return $this->traitHasRole($mapped, $guard);
            }
        }

        return false;
    }

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
        $role = $this->getRoleNames()->first();
        if ($role) {
            return $role;
        }

        if ($this->isClientUser()) {
            return 'client';
        }

        return null;
    }

    public function toArray(): array
    {
        $attributes = parent::toArray();
        // Presentation compatibility only; there is no Eloquent role attribute.
        $attributes['role'] = $this->primaryRoleName();
        $attributes['is_client'] = $this->isClientUser();

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

    public function clientContacts()
    {
        return $this->hasMany(ClientContact::class, 'user_id');
    }

    public function isClientUser(): bool
    {
        if ($this->hasAnyRole(['super_admin', 'admin', 'account_manager', 'project_manager', 'employee', 'designer', 'developer'])) {
            return false;
        }

        if ($this->customerProfile()->exists()) {
            return true;
        }

        return $this->clientContacts()->where('is_active', true)->exists();
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
