<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CrossDepartmentLink extends Model
{
    use HasFactory;

    protected $fillable = [
        'source_entity_type',
        'source_entity_id',
        'target_entity_type',
        'target_entity_id',
        'relationship_name',
        'created_by',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
