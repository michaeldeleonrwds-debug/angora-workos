<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MarketingContent extends Model
{
    use HasFactory;

    protected $fillable = [
        'campaign_id',
        'title',
        'format',
        'platform',
        'status',
        'scheduled_date',
        'author_id',
        'copy_notes',
    ];

    protected $casts = [
        'scheduled_date' => 'date:Y-m-d',
    ];

    public function campaign()
    {
        return $this->belongsTo(MarketingCampaign::class, 'campaign_id');
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
