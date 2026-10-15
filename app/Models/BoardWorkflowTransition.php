<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BoardWorkflowTransition extends Model
{
    protected $fillable = ['board_id', 'from_column_id', 'to_column_id', 'contributor_allowed'];

    protected $casts = ['contributor_allowed' => 'boolean'];

    public function board()
    {
        return $this->belongsTo(KanbanBoard::class, 'board_id');
    }
}
