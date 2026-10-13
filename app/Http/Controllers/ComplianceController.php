<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\ComplianceIncident;
use App\Models\CompliancePolicy;
use App\Models\ComplianceRisk;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ComplianceController extends Controller
{
    public function index(Request $request)
    {
        $policies = CompliancePolicy::latest()->get();
        $risks = ComplianceRisk::with('owner')->latest()->get();
        $incidents = ComplianceIncident::with('reporter')->latest()->get();
        $users = User::select('id', 'name')->get();

        return Inertia::render('compliance/index', [
            'policies' => $policies,
            'risks' => $risks,
            'incidents' => $incidents,
            'users' => $users,
        ]);
    }

    public function storeRisk(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'category' => 'required|string',
            'likelihood' => 'required|integer|min:1|max:5',
            'impact' => 'required|integer|min:1|max:5',
            'mitigation_strategy' => 'required|string',
            'owner_id' => 'nullable|exists:users,id',
        ]);

        $score = $validated['likelihood'] * $validated['impact'];

        $risk = ComplianceRisk::create([
            ...$validated,
            'risk_score' => $score,
            'status' => 'Mitigating',
        ]);

        AuditLog::log(
            action: 'COMPLIANCE_RISK_REGISTERED',
            department: 'Compliance & Risk',
            entityType: 'ComplianceRisk',
            entityId: $risk->id,
            description: "Risk assessment added: {$risk->title} (Score: {$score})"
        );

        return back()->with('success', 'Risk assessment logged');
    }

    public function storeIncident(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|string',
            'severity' => 'required|in:Low,Moderate,High,Critical',
            'incident_date' => 'required|date',
            'summary' => 'required|string',
            'resolution_action' => 'nullable|string',
        ]);

        $incident = ComplianceIncident::create([
            ...$validated,
            'incident_code' => 'INC-' . date('Y') . '-' . rand(10, 99),
            'reported_by' => auth()->id(),
            'status' => 'Open',
        ]);

        AuditLog::log(
            action: 'COMPLIANCE_INCIDENT_FILED',
            department: 'Compliance & Risk',
            entityType: 'ComplianceIncident',
            entityId: $incident->id,
            description: "Compliance incident reported: {$incident->incident_code} ({$incident->type})"
        );

        return back()->with('success', 'Incident filed');
    }
}
