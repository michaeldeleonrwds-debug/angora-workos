<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiRequestLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'api_token_id',
        'user_id',
        'method',
        'path',
        'ip',
        'status_code',
        'response_time_ms',
    ];

    public function apiToken()
    {
        return $this->belongsTo(ApiToken::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
