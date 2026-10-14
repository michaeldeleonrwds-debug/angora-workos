<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MediaUsage extends Model
{
    use HasFactory;

    protected $fillable = [
        'media_asset_id',
        'attachable_type',
        'attachable_id',
        'field_name',
        'user_id',
    ];

    public function mediaAsset()
    {
        return $this->belongsTo(MediaAsset::class, 'media_asset_id');
    }

    public function attachable()
    {
        return $this->morphTo();
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
