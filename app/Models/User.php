<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'department',
        'phone',
        'avatar_url',
        'status',
        'timezone',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
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
        ];
    }

    public function hasRole(string|array $roles): bool
    {
        if ($this->role === 'super_admin') {
            return true;
        }

        if (is_array($roles)) {
            return in_array($this->role, $roles, true);
        }

        return $this->role === $roles;
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
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

    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'user_permissions');
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->role === 'super_admin') {
            return true;
        }

        // Check if role has this permission
        $hasRolePermission = RolePermission::where('role', $this->role)
            ->whereHas('permission', function ($q) use ($permission) {
                $q->where('name', $permission);
            })
            ->exists();

        if ($hasRolePermission) {
            return true;
        }

        // Check if user has direct permission
        return $this->permissions()->where('name', $permission)->exists();
    }

    public function hasAnyPermission(array $permissions): bool
    {
        if ($this->role === 'super_admin') {
            return true;
        }

        foreach ($permissions as $perm) {
            if ($this->hasPermission($perm)) {
                return true;
            }
        }

        return false;
    }

    public function getAllPermissions(): array
    {
        if ($this->role === 'super_admin') {
            return Permission::pluck('name')->toArray();
        }

        $rolePerms = RolePermission::where('role', $this->role)
            ->with('permission')
            ->get()
            ->pluck('permission.name')
            ->filter()
            ->toArray();

        $userPerms = $this->permissions()->pluck('name')->toArray();

        return array_values(array_unique(array_merge($rolePerms, $userPerms)));
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
