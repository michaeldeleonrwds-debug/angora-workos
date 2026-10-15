<?php

namespace App\Models;

use Spatie\Permission\Models\Role;

class RbacRole extends Role
{
    protected $fillable = ['name', 'guard_name', 'is_system', 'is_protected'];

    public function getRouteKeyName(): string
    {
        return 'name';
    }

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'is_protected' => 'boolean',
        ];
    }
}
