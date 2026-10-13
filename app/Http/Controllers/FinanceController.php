<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\FinanceBudget;
use App\Models\FinanceExpense;
use App\Models\FinanceTransaction;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FinanceController extends Controller
{
    public function index(Request $request)
    {
        $budgets = FinanceBudget::all();
        $expenses = FinanceExpense::with(['user', 'approver'])->latest()->get();
        $transactions = FinanceTransaction::latest()->get();

        return Inertia::render('finance/index', [
            'budgets' => $budgets,
            'expenses' => $expenses,
            'transactions' => $transactions,
        ]);
    }

    public function storeExpense(Request $request)
    {
        $validated = $request->validate([
            'department' => 'required|string',
            'category' => 'required|string',
            'title' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
        ]);

        $expense = FinanceExpense::create([
            ...$validated,
            'user_id' => auth()->id(),
            'status' => 'Pending',
        ]);

        AuditLog::log(
            action: 'FINANCE_EXPENSE_CLAIMED',
            department: $expense->department,
            entityType: 'FinanceExpense',
            entityId: $expense->id,
            description: "Expense claim submitted: {$expense->title} (\${$expense->amount})"
        );

        return back()->with('success', 'Expense submitted for approval');
    }

    public function updateExpenseStatus(Request $request, FinanceExpense $expense)
    {
        $validated = $request->validate([
            'status' => 'required|in:Approved,Rejected,Paid',
            'approver_comment' => 'nullable|string',
        ]);

        $expense->update([
            'status' => $validated['status'],
            'approved_by' => auth()->id(),
            'approver_comment' => $validated['approver_comment'] ?? null,
        ]);

        // If approved/paid, update department spent budget
        if ($validated['status'] === 'Approved' || $validated['status'] === 'Paid') {
            FinanceBudget::where('department', $expense->department)->increment('spent_amount', $expense->amount);
        }

        AuditLog::log(
            action: 'FINANCE_EXPENSE_PROCESSED',
            department: 'Finance',
            entityType: 'FinanceExpense',
            entityId: $expense->id,
            description: "Expense #{$expense->id} marked as {$validated['status']}"
        );

        return back()->with('success', "Expense {$validated['status']}");
    }

    public function storeTransaction(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:Payable,Receivable',
            'party_name' => 'required|string',
            'invoice_ref' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
            'due_date' => 'required|date',
        ]);

        $txn = FinanceTransaction::create([
            ...$validated,
            'status' => 'Pending',
        ]);

        AuditLog::log(
            action: 'FINANCE_TRANSACTION_LOGGED',
            department: 'Finance',
            entityType: 'FinanceTransaction',
            entityId: $txn->id,
            description: "{$txn->type} ledger entry created for {$txn->party_name} (\${$txn->amount})"
        );

        return back()->with('success', 'Transaction entry recorded');
    }
}
