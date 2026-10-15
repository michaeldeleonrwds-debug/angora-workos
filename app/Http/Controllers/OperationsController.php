<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\OperationsTicket;
use App\Models\OperationsWorkflow;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OperationsController extends Controller
{
    public function index(Request $request)
    {
        $workflows = OperationsWorkflow::with(['requester', 'assignee'])->latest()->get();
        $tickets = OperationsTicket::with('requester')->latest()->get();
        $users = User::select('id', 'name', 'department')->get();

        return Inertia::render('operations/index', [
            'workflows' => $workflows,
            'tickets' => $tickets,
            'users' => $users,
        ]);
    }

    public function storeWorkflow(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'department' => 'required|string',
            'priority' => 'required|in:Low,Medium,High,Critical',
            'assigned_to' => 'nullable|exists:users,id',
            'description' => 'required|string',
            'due_date' => 'nullable|date',
        ]);

        $workflow = OperationsWorkflow::create([
            ...$validated,
            'requested_by' => auth()->id(),
            'status' => 'Pending',
        ]);

        AuditLog::log(
            action: 'OPERATIONS_WORKFLOW_INITIATED',
            department: $workflow->department,
            entityType: 'OperationsWorkflow',
            entityId: $workflow->id,
            description: "Initiated operation workflow: {$workflow->title} [Priority: {$workflow->priority}]"
        );

        return back()->with('success', 'Workflow dispatched');
    }

    public function updateWorkflowStatus(Request $request, OperationsWorkflow $workflow)
    {
        $validated = $request->validate([
            'status' => 'required|in:Pending,In Progress,Department Review,Completed,Cancelled',
            'resolution_details' => 'nullable|string',
        ]);

        $workflow->update($validated);

        AuditLog::log(
            action: 'OPERATIONS_WORKFLOW_STATUS',
            department: $workflow->department,
            entityType: 'OperationsWorkflow',
            entityId: $workflow->id,
            description: "Workflow #{$workflow->id} marked as {$validated['status']}"
        );

        return back()->with('success', 'Workflow updated');
    }

    public function storeTicket(Request $request)
    {
        $validated = $request->validate([
            'service_type' => 'required|string',
            'department' => 'required|string',
            'priority' => 'required|in:Low,Medium,High,Critical',
            'details' => 'required|string',
        ]);

        $ticket = OperationsTicket::create([
            ...$validated,
            'ticket_number' => 'OPS-' . strtoupper(substr(uniqid(), 7)),
            'requested_by' => auth()->id(),
            'status' => 'Open',
            'sla_due_at' => now()->addHours(24),
        ]);

        AuditLog::log(
            action: 'OPERATIONS_TICKET_RAISED',
            department: $ticket->department,
            entityType: 'OperationsTicket',
            entityId: $ticket->id,
            description: "Raised Service Ticket {$ticket->ticket_number} for {$ticket->service_type}"
        );

        return back()->with('success', 'Ticket registered');
    }
}
