<?php

namespace App\Models;

use Spatie\Permission\Models\Permission;

class RbacPermission extends Permission
{
    protected $fillable = [
        'name', 'guard_name', 'label', 'department', 'description',
        'is_delegable', 'is_protected',
    ];

    protected function casts(): array
    {
        return [
            'is_delegable' => 'boolean',
            'is_protected' => 'boolean',
        ];
    }
}
