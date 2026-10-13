<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'user_id',
        'title',
        'original_filename',
        'file_path',
        'file_size_kb',
        'mime_type',
        'department_access',
        'version',
        'is_trashed',
        'trashed_at',
    ];

    protected $casts = [
        'is_trashed' => 'boolean',
        'trashed_at' => 'datetime',
    ];

    public function category()
    {
        return $this->belongsTo(DocumentCategory::class, 'category_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function versions()
    {
        return $this->hasMany(DocumentVersion::class, 'document_id');
    }
}
