<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormField extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_id',
        'field_key',
        'label',
        'type',
        'help_text',
        'placeholder',
        'default_value',
        'is_required',
        'options',
        'conditional_logic',
        'maps_to_column',
        'position',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'options' => 'array',
        'conditional_logic' => 'array',
        'position' => 'integer',
    ];

    public function form(): BelongsTo
    {
        return $this->belongsTo(Form::class);
    }
}
