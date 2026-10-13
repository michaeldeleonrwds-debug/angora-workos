<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\ProductionIncident;
use App\Models\ProductionQualityCheck;
use App\Models\ProductionWorkOrder;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductionController extends Controller
{
    public function index(Request $request)
    {
        $workOrders = ProductionWorkOrder::with(['supervisor', 'qualityChecks', 'incidents'])
            ->latest()
            ->get();

        $qualityChecks = ProductionQualityCheck::with(['workOrder', 'inspector'])
            ->latest()
            ->get();

        $incidents = ProductionIncident::with(['workOrder', 'reporter'])
            ->latest()
            ->get();

        $supervisors = User::whereIn('role', ['super_admin', 'admin_manager', 'production_staff'])->get();

        return Inertia::render('production/index', [
            'workOrders' => $workOrders,
            'qualityChecks' => $qualityChecks,
            'incidents' => $incidents,
            'supervisors' => $supervisors,
        ]);
    }

    public function storeWorkOrder(Request $request)
    {
        $validated = $request->validate([
            'order_no' => 'required|string|unique:production_work_orders,order_no',
            'product_title' => 'required|string',
            'batch_number' => 'required|string',
            'quantity' => 'required|integer|min:1',
            'priority' => 'required|in:Normal,High,Urgent',
            'start_date' => 'required|date',
            'target_date' => 'required|date|after_or_equal:start_date',
            'assigned_unit' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $order = ProductionWorkOrder::create([
            ...$validated,
            'status' => 'Pending',
            'completed_quantity' => 0,
            'supervisor_id' => auth()->id(),
        ]);

        AuditLog::log(
            action: 'PRODUCTION_WORK_ORDER_CREATED',
            department: 'Production & QC',
            entityType: 'ProductionWorkOrder',
            entityId: $order->id,
            description: "Created Work Order {$order->order_no} for {$order->quantity} units of {$order->product_title}"
        );

        return back()->with('success', 'Work order scheduled');
    }

    public function updateWorkOrderStatus(Request $request, ProductionWorkOrder $order)
    {
        $validated = $request->validate([
            'status' => 'required|in:Pending,In Production,QA Review,Completed,On Hold',
            'completed_quantity' => 'nullable|integer|min:0',
        ]);

        $order->update($validated);

        AuditLog::log(
            action: 'PRODUCTION_STATUS_UPDATED',
            department: 'Production & QC',
            entityType: 'ProductionWorkOrder',
            entityId: $order->id,
            description: "Work Order {$order->order_no} updated to {$order->status} ({$order->completed_quantity}/{$order->quantity} units)"
        );

        return back()->with('success', 'Work order updated');
    }

    public function storeQualityCheck(Request $request)
    {
        $validated = $request->validate([
            'work_order_id' => 'required|exists:production_work_orders,id',
            'sample_size' => 'required|integer|min:1',
            'defect_count' => 'required|integer|min:0',
            'status' => 'required|in:Passed,Failed,Re-work',
            'notes' => 'nullable|string',
        ]);

        $qc = ProductionQualityCheck::create([
            ...$validated,
            'inspector_id' => auth()->id(),
            'inspected_at' => now(),
        ]);

        AuditLog::log(
            action: 'PRODUCTION_QC_RECORDED',
            department: 'Production & QC',
            entityType: 'ProductionQualityCheck',
            entityId: $qc->id,
            description: "Quality Inspection recorded for WO #{$qc->work_order_id}: {$qc->status} (Defects: {$qc->defect_count})"
        );

        return back()->with('success', 'QC Inspection recorded');
    }

    public function storeIncident(Request $request)
    {
        $validated = $request->validate([
            'work_order_id' => 'nullable|exists:production_work_orders,id',
            'title' => 'required|string',
            'machine_line' => 'nullable|string',
            'severity' => 'required|in:Low,Medium,Critical',
            'description' => 'required|string',
            'corrective_action' => 'nullable|string',
        ]);

        $incident = ProductionIncident::create([
            ...$validated,
            'reported_by' => auth()->id(),
            'status' => 'Open',
        ]);

        AuditLog::log(
            action: 'PRODUCTION_INCIDENT_REPORTED',
            department: 'Production & QC',
            entityType: 'ProductionIncident',
            entityId: $incident->id,
            description: "Incident reported: {$incident->title} [Severity: {$incident->severity}]"
        );

        return back()->with('success', 'Incident logged');
    }
}
