import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowDownLeft, ArrowUpRight, Check, CreditCard, Plus, X } from 'lucide-react';
import React, { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Finance & Accounts', href: '/finance' },
];

interface FinanceProps {
    budgets: any[];
    expenses: any[];
    transactions: any[];
}

export default function FinancePage({ budgets = [], expenses = [], transactions = [] }: FinanceProps) {
    const [isExpenseOpen, setIsExpenseOpen] = useState(false);
    const [isTxnOpen, setIsTxnOpen] = useState(false);

    const [newExpense, setNewExpense] = useState({
        department: 'Engineering',
        category: 'Software',
        title: '',
        amount: 500,
    });

    const [newTxn, setNewTxn] = useState({
        type: 'Payable',
        party_name: '',
        invoice_ref: `BILL-${Math.floor(10000 + Math.random() * 90000)}`,
        amount: 2500,
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    });

    const handleCreateExpense = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/finance/expenses', newExpense, {
            onSuccess: () => {
                setIsExpenseOpen(false);
                setNewExpense({ department: 'Engineering', category: 'Software', title: '', amount: 500 });
            },
        });
    };

    const handleCreateTxn = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/finance/transactions', newTxn, {
            onSuccess: () => {
                setIsTxnOpen(false);
            },
        });
    };

    const handleUpdateExpenseStatus = (expenseId: number, status: string) => {
        router.patch(`/finance/expenses/${expenseId}`, { status }, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Finance & Accounts Management" />

            <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 p-4 text-[#191927] transition-colors md:p-6 lg:p-8 dark:text-white">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-[#191927] dark:text-white">Finance & Accounts Management</h1>
                            <Badge variant="outline" className="border-[#ECECF0] text-xs text-[#777785] dark:border-[#28283E] dark:text-slate-400">
                                Module 06
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#777785] md:text-sm dark:text-slate-400">
                            Departmental budgets, employee expense claims & approvals, AP/AR ledgers, and cash flow.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Dialog open={isTxnOpen} onOpenChange={setIsTxnOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="gap-2 rounded-xl border-[#ECECF0] bg-white text-[#191927] dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white"
                                >
                                    <CreditCard className="h-4 w-4" />
                                    Record AP/AR
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Record Ledger Transaction</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateTxn} className="space-y-4 pt-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Type</Label>
                                            <Select value={newTxn.type} onValueChange={(val) => setNewTxn({ ...newTxn, type: val })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Payable">Accounts Payable (AP - Bill)</SelectItem>
                                                    <SelectItem value="Receivable">Accounts Receivable (AR - Invoice)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Reference No</Label>
                                            <Input
                                                value={newTxn.invoice_ref}
                                                onChange={(e) => setNewTxn({ ...newTxn, invoice_ref: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Counterparty / Vendor</Label>
                                        <Input
                                            required
                                            value={newTxn.party_name}
                                            onChange={(e) => setNewTxn({ ...newTxn, party_name: e.target.value })}
                                            placeholder="e.g. AWS Cloud Services"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Amount ($)</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={newTxn.amount}
                                                onChange={(e) => setNewTxn({ ...newTxn, amount: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Due Date</Label>
                                            <Input
                                                type="date"
                                                value={newTxn.due_date}
                                                onChange={(e) => setNewTxn({ ...newTxn, due_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setIsTxnOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="bg-cyan-600 text-white hover:bg-cyan-700">
                                            Save Transaction
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 bg-cyan-600 text-white shadow-sm hover:bg-cyan-700">
                                    <Plus className="h-4 w-4" />
                                    Submit Expense Claim
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Submit Expense Claim</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateExpense} className="space-y-4 pt-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Department</Label>
                                            <Select
                                                value={newExpense.department}
                                                onValueChange={(val) => setNewExpense({ ...newExpense, department: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Engineering">Engineering</SelectItem>
                                                    <SelectItem value="Production & QC">Production & QC</SelectItem>
                                                    <SelectItem value="Marketing">Marketing</SelectItem>
                                                    <SelectItem value="Operations">Operations</SelectItem>
                                                    <SelectItem value="Sales">Sales</SelectItem>
                                                    <SelectItem value="Human Resources">Human Resources</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Category</Label>
                                            <Select
                                                value={newExpense.category}
                                                onValueChange={(val) => setNewExpense({ ...newExpense, category: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Software">Software & Cloud</SelectItem>
                                                    <SelectItem value="Equipment">Hardware & Equipment</SelectItem>
                                                    <SelectItem value="Travel">Travel & Lodging</SelectItem>
                                                    <SelectItem value="Supplies">Office Supplies</SelectItem>
                                                    <SelectItem value="Consulting">Consulting Services</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Expense Title / Purpose</Label>
                                        <Input
                                            required
                                            value={newExpense.title}
                                            onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                                            placeholder="e.g. SMT Line Calibration Sensors"
                                        />
                                    </div>
                                    <div>
                                        <Label>Amount ($)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={newExpense.amount}
                                            onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setIsExpenseOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="bg-cyan-600 text-white hover:bg-cyan-700">
                                            Submit Claim
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Department Budgets Overview */}
                {/* Fiscal Year Budgets Grid */}
                <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Fiscal Year Departmental Budgets</CardTitle>
                        <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                            Real-time expenditure tracking vs allocated caps
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {budgets.map((b) => {
                                const usage = b.allocated_amount > 0 ? Math.round((b.spent_amount / b.allocated_amount) * 100) : 0;
                                return (
                                    <div
                                        key={b.id}
                                        className="space-y-2 rounded-2xl border border-[#ECECF0] bg-white p-4 dark:border-[#28283E] dark:bg-[#181826]"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-[#191927] dark:text-white">{b.department}</span>
                                            <Badge
                                                variant="secondary"
                                                className="bg-[#ECECF0] text-[10px] text-[#191927] dark:bg-[#28283E] dark:text-slate-300"
                                            >
                                                {b.fiscal_year}
                                            </Badge>
                                        </div>
                                        <div className="text-xl font-black text-[#191927] dark:text-white">
                                            ${Number(b.spent_amount).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-[#777785] dark:text-slate-400">
                                            Cap: ${Number(b.allocated_amount).toLocaleString()}
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div
                                                className={`h-2 rounded-full ${usage > 85 ? 'bg-amber-500' : 'bg-cyan-600'}`}
                                                style={{ width: `${usage}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between pt-1 text-[11px] text-[#777785] dark:text-slate-400">
                                            <span>{usage}% Used</span>
                                            <span>Remaining: ${(Number(b.allocated_amount) - Number(b.spent_amount)).toLocaleString()}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Split: Expense Claims Approvals & AP/AR Ledgers */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Expense Claims */}
                    <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Expense Claims & Approvals</CardTitle>
                            <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                                Employee reimbursements and purchase order clearances
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y divide-[#ECECF0] overflow-hidden rounded-xl border border-[#ECECF0] dark:divide-[#28283E] dark:border-[#28283E]">
                                {expenses.map((exp) => (
                                    <div
                                        key={exp.id}
                                        className="flex flex-col justify-between gap-2 p-3 text-xs transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center dark:hover:bg-[#181826]/70"
                                    >
                                        <div>
                                            <div className="font-semibold text-[#191927] dark:text-white">{exp.title}</div>
                                            <div className="text-[11px] text-[#777785] dark:text-slate-400">
                                                {exp.department} • {exp.category} • Claimed by: {exp.user?.name || 'Staff'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-[#191927] dark:text-white">
                                                ${Number(exp.amount).toLocaleString()}
                                            </span>
                                            {exp.status === 'Pending' ? (
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleUpdateExpenseStatus(exp.id, 'Approved')}
                                                        className="h-6 gap-1 rounded-lg bg-emerald-600 text-[10px] text-white hover:bg-emerald-700"
                                                    >
                                                        <Check className="h-3 w-3" /> Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleUpdateExpenseStatus(exp.id, 'Rejected')}
                                                        className="h-6 rounded-lg border-rose-200 text-[10px] text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        exp.status === 'Approved'
                                                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                                                            : 'border-rose-500 bg-rose-500/10 text-rose-600'
                                                    }
                                                >
                                                    {exp.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* AP & AR Ledger */}
                    <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Accounts Payable & Receivable</CardTitle>
                            <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                                Upcoming liquidity cash flows and vendor obligations
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y divide-[#ECECF0] overflow-hidden rounded-xl border border-[#ECECF0] dark:divide-[#28283E] dark:border-[#28283E]">
                                {transactions.map((txn) => (
                                    <div
                                        key={txn.id}
                                        className="flex items-center justify-between p-3 text-xs transition-colors hover:bg-slate-50/80 dark:hover:bg-[#181826]/70"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            {txn.type === 'Payable' ? (
                                                <ArrowUpRight className="h-4 w-4 shrink-0 text-rose-500" />
                                            ) : (
                                                <ArrowDownLeft className="h-4 w-4 shrink-0 text-emerald-500" />
                                            )}
                                            <div>
                                                <div className="font-semibold text-[#191927] dark:text-white">{txn.party_name}</div>
                                                <div className="font-mono text-[11px] text-[#777785] dark:text-slate-400">
                                                    {txn.invoice_ref} • Due: {formatDate(txn.due_date)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-[#191927] dark:text-white">${Number(txn.amount).toLocaleString()}</div>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    txn.status === 'Settled'
                                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                                                        : 'border-amber-500 bg-amber-500/10 text-amber-600'
                                                }
                                            >
                                                {txn.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
