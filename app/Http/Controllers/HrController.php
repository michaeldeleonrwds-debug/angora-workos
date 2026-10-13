<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\HrAttendance;
use App\Models\HrEmployee;
use App\Models\HrLeaveRequest;
use App\Models\HrPerformanceReview;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HrController extends Controller
{
    public function index(Request $request)
    {
        $employees = HrEmployee::with('user')->get();
        $attendances = HrAttendance::with('employee')->latest()->take(20)->get();
        $leaveRequests = HrLeaveRequest::with(['employee', 'approver'])->latest()->get();
        $performanceReviews = HrPerformanceReview::with(['employee', 'reviewer'])->latest()->get();

        return Inertia::render('hr/index', [
            'employees' => $employees,
            'attendances' => $attendances,
            'leaveRequests' => $leaveRequests,
            'performanceReviews' => $performanceReviews,
        ]);
    }

    public function storeLeave(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:hr_employees,id',
            'leave_type' => 'required|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'total_days' => 'required|integer|min:1',
            'reason' => 'required|string',
        ]);

        $leave = HrLeaveRequest::create([
            ...$validated,
            'status' => 'Pending',
        ]);

        AuditLog::log(
            action: 'HR_LEAVE_REQUESTED',
            department: 'Human Resources',
            entityType: 'HrLeaveRequest',
            entityId: $leave->id,
            description: "Leave application submitted for {$validated['total_days']} days ({$validated['leave_type']})"
        );

        return back()->with('success', 'Leave request submitted');
    }

    public function updateLeaveStatus(Request $request, HrLeaveRequest $leave)
    {
        $validated = $request->validate([
            'status' => 'required|in:Approved,Rejected',
            'approver_comment' => 'nullable|string',
        ]);

        $leave->update([
            'status' => $validated['status'],
            'approved_by' => auth()->id(),
            'approver_comment' => $validated['approver_comment'] ?? null,
        ]);

        AuditLog::log(
            action: 'HR_LEAVE_STATUS_UPDATED',
            department: 'Human Resources',
            entityType: 'HrLeaveRequest',
            entityId: $leave->id,
            description: "Leave application for {$leave->employee?->full_name} marked as {$validated['status']}"
        );

        return back()->with('success', "Leave {$validated['status']}");
    }
}
