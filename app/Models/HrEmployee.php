<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HrEmployee extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'emp_code',
        'first_name',
        'last_name',
        'email',
        'phone',
        'department',
        'designation',
        'employment_type',
        'join_date',
        'basic_salary',
        'status',
    ];

    protected $casts = [
        'join_date' => 'date:Y-m-d',
        'basic_salary' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function attendances()
    {
        return $this->hasMany(HrAttendance::class, 'employee_id');
    }

    public function leaveRequests()
    {
        return $this->hasMany(HrLeaveRequest::class, 'employee_id');
    }

    public function performanceReviews()
    {
        return $this->hasMany(HrPerformanceReview::class, 'employee_id');
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
