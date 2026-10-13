<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\SalesCustomer;
use App\Models\SalesInvoice;
use App\Models\SalesLead;
use App\Models\SalesTarget;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SalesController extends Controller
{
    public function index(Request $request)
    {
        $customers = SalesCustomer::with(['leads', 'invoices'])->latest()->get();
        $leads = SalesLead::with(['customer', 'assignee'])->latest()->get();
        $invoices = SalesInvoice::with('customer')->latest()->get();
        $targets = SalesTarget::with('user')->get();
        $salesReps = User::whereIn('role', ['super_admin', 'sales_staff', 'admin_manager'])->get();

        return Inertia::render('sales/index', [
            'customers' => $customers,
            'leads' => $leads,
            'invoices' => $invoices,
            'targets' => $targets,
            'salesReps' => $salesReps,
        ]);
    }

    public function storeCustomer(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'company' => 'nullable|string',
            'email' => 'required|email',
            'phone' => 'nullable|string',
            'city' => 'nullable|string',
            'status' => 'required|in:Lead,Prospect,Customer',
        ]);

        $customer = SalesCustomer::create($validated);

        AuditLog::log(
            action: 'SALES_CUSTOMER_CREATED',
            department: 'Sales',
            entityType: 'SalesCustomer',
            entityId: $customer->id,
            description: "Created client/account: {$customer->name} ({$customer->company})"
        );

        return back()->with('success', 'Customer added');
    }

    public function storeLead(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:sales_customers,id',
            'title' => 'required|string',
            'deal_value' => 'required|numeric|min:0',
            'stage' => 'required|in:New,Contacted,Proposal,Negotiation,Closed Won,Closed Lost',
            'probability' => 'required|integer|min:0|max:100',
            'expected_close_date' => 'nullable|date',
            'assigned_to' => 'nullable|exists:users,id',
            'notes' => 'nullable|string',
        ]);

        $lead = SalesLead::create($validated);

        AuditLog::log(
            action: 'SALES_LEAD_CREATED',
            department: 'Sales',
            entityType: 'SalesLead',
            entityId: $lead->id,
            description: "New Opportunity created: {$lead->title} (Value: \${$lead->deal_value})"
        );

        return back()->with('success', 'Opportunity registered');
    }

    public function updateLeadStage(Request $request, SalesLead $lead)
    {
        $validated = $request->validate([
            'stage' => 'required|in:New,Contacted,Proposal,Negotiation,Closed Won,Closed Lost',
        ]);

        $prevStage = $lead->stage;
        $lead->stage = $validated['stage'];
        if ($validated['stage'] === 'Closed Won') {
            $lead->probability = 100;
        } elseif ($validated['stage'] === 'Closed Lost') {
            $lead->probability = 0;
        }
        $lead->save();

        AuditLog::log(
            action: 'SALES_STAGE_ADVANCED',
            department: 'Sales',
            entityType: 'SalesLead',
            entityId: $lead->id,
            description: "Opportunity '{$lead->title}' moved from {$prevStage} to {$lead->stage}"
        );

        return back()->with('success', 'Lead stage updated');
    }

    public function storeInvoice(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:sales_customers,id',
            'type' => 'required|in:Quotation,Invoice',
            'subtotal' => 'required|numeric|min:0',
            'tax_amount' => 'required|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'issue_date' => 'required|date',
            'due_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $invoiceCode = ($validated['type'] === 'Quotation' ? 'QUO-' : 'INV-') . date('Y') . '-' . rand(1000, 9999);

        $invoice = SalesInvoice::create([
            ...$validated,
            'invoice_code' => $invoiceCode,
            'status' => 'Sent',
        ]);

        AuditLog::log(
            action: 'SALES_INVOICE_GENERATED',
            department: 'Sales',
            entityType: 'SalesInvoice',
            entityId: $invoice->id,
            description: "Generated {$validated['type']} {$invoiceCode} for \${$validated['total_amount']}"
        );

        return back()->with('success', "{$validated['type']} generated");
    }
}
