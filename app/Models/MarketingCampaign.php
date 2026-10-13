<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MarketingCampaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'channel',
        'budget',
        'spend',
        'impressions',
        'clicks',
        'leads_generated',
        'conversions',
        'status',
        'start_date',
        'end_date',
        'target_audience',
    ];

    protected $casts = [
        'budget' => 'decimal:2',
        'spend' => 'decimal:2',
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
    ];

    public function contents()
    {
        return $this->hasMany(MarketingContent::class, 'campaign_id');
    }

    public function getRoiAttribute(): float
    {
        if ($this->spend <= 0) return 0;
        // estimated value per conversion $150
        $revenue = $this->conversions * 150;
        return round((($revenue - $this->spend) / $this->spend) * 100, 1);
    }
}
