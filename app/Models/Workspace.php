<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Workspace extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'icon',
        'color',
        'owner_id',
        'is_favorite',
        'is_archived',
    ];

    protected $casts = [
        'is_favorite' => 'boolean',
        'is_archived' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members()
    {
        return $this->hasMany(WorkspaceMember::class, 'workspace_id');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'workspace_members')->withPivot('role')->withTimestamps();
    }

    public function boards()
    {
        return $this->hasMany(KanbanBoard::class, 'workspace_id');
    }
}
