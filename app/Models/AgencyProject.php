<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgencyProject extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'description',
        'client_id',
        'project_manager_id',
        'project_leader_id',
        'board_id',
        'status',
        'priority',
        'start_date',
        'due_date',
        'budget',
        'client_visible',
        'client_access_settings',
    ];

    protected static function booted(): void
    {
        static::creating(function (AgencyProject $project) {
            if (empty($project->code)) {
                $words = explode(' ', trim($project->name));
                $prefix = '';
                foreach ($words as $word) {
                    $prefix .= strtoupper(substr($word, 0, 1));
                }
                $prefix = substr(preg_replace('/[^A-Z]/', '', $prefix), 0, 4) ?: 'PRJ';
                $project->code = $prefix . '-' . rand(100, 999);
            }
        });
    }

    public function getCodeAttribute(?string $value): string
    {
        return $value ?: ('PRJ-' . str_pad((string) ($this->id ?? 1), 3, '0', STR_PAD_LEFT));
    }

    protected $casts = [
        'budget' => 'decimal:2',
        'client_visible' => 'boolean',
        'client_access_settings' => 'array',
        'start_date' => 'date',
        'due_date' => 'date',
    ];

    public function client()
    {
        return $this->belongsTo(SalesCustomer::class, 'client_id');
    }

    public function projectManager()
    {
        return $this->belongsTo(User::class, 'project_manager_id');
    }

    public function projectLeader()
    {
        return $this->belongsTo(User::class, 'project_leader_id');
    }

    public function board()
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }

    public function members()
    {
        return $this->hasMany(ProjectMember::class, 'project_id');
    }

    public function teamUsers()
    {
        return $this->belongsToMany(User::class, 'project_members', 'project_id', 'user_id')
            ->withPivot('agency_role')
            ->withTimestamps();
    }

    public function deliverables()
    {
        return $this->hasMany(ProjectDeliverable::class, 'project_id');
    }

    public function clientGrants()
    {
        return $this->hasMany(ClientProjectGrant::class, 'project_id');
    }
}

