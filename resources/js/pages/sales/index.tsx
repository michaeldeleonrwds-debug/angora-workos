import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Building2, ChevronDown, Plus } from 'lucide-react';
import React, { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Workspaces', href: '/dashboard' },
    { title: 'Sales CRM & Deals Board', href: '/sales' },
];

interface SalesProps {
    customers: any[];
    leads: any[];
    invoices: any[];
    targets: any[];
    salesReps: any[];
}

export default function SalesPage({ customers = [], leads = [], invoices = [], targets = [], salesReps = [] }: SalesProps) {
    const [isLeadOpen, setIsLeadOpen] = useState(false);
    const [isCustomerOpen, setIsCustomerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [newCustomer, setNewCustomer] = useState({
        name: '',
        company: '',
        email: '',
        phone: '',
        city: '',
        status: 'Lead',
    });

    const [newLead, setNewLead] = useState({
        customer_id: customers[0]?.id || '',
        title: '',
        deal_value: 50000,
        stage: 'Proposal',
        probability: 60,
        expected_close_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        assigned_to: salesReps[0]?.id || '',
    });

    const handleCreateCustomer = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/sales/customers', newCustomer, {
            onSuccess: () => {
                setIsCustomerOpen(false);
                setNewCustomer({ name: '', company: '', email: '', phone: '', city: '', status: 'Lead' });
            },
        });
    };

    const handleCreateLead = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/sales/leads', newLead, {
            onSuccess: () => setIsLeadOpen(false),
        });
    };

    const handleAdvanceStage = (leadId: number, stage: string) => {
        router.patch(`/sales/leads/${leadId}/stage`, { stage }, { preserveScroll: true });
    };

    const getStageStyle = (stage: string) => {
        switch (stage) {
            case 'Closed Won':
                return 'bg-[#00c875] text-white';
            case 'Negotiation':
                return 'bg-[#fdab3d] text-white';
            case 'Proposal':
                return 'bg-[#579bfc] text-white';
            case 'Contacted':
                return 'bg-[#a25ddc] text-white';
            case 'Closed Lost':
                return 'bg-[#e2445c] text-white';
            default:
                return 'bg-[#0073ea] text-white';
        }
    };

    const activeDeals = leads.filter((l) => l.stage !== 'Closed Won' && l.stage !== 'Closed Lost');
    const wonDeals = leads.filter((l) => l.stage === 'Closed Won');

    const totalActiveVal = activeDeals.reduce((acc, l) => acc + Number(l.deal_value), 0);
    const totalWonVal = wonDeals.reduce((acc, l) => acc + Number(l.deal_value), 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Monday CRM — Deals Board" />

            <div className="flex min-h-screen flex-col bg-[#F8F9F7] text-[#191927] transition-colors dark:bg-[#161624] dark:text-white">
                {/* Monday Board Top Header */}
                <div className="border-b border-[#ECECF0] bg-white px-6 py-4 dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-[#00c875]" />
                                <h1 className="text-2xl font-black tracking-tight text-[#191927] dark:text-white">Sales CRM & Pipeline</h1>
                                <Badge
                                    variant="secondary"
                                    className="bg-[#ECECF0] text-[11px] font-semibold text-[#191927] dark:bg-[#28283E] dark:text-slate-200"
                                >
                                    Deals Board
                                </Badge>
                            </div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">
                                Client accounts, active pipeline proposals, contract closing, and invoice ledger.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Dialog open={isCustomerOpen} onOpenChange={setIsCustomerOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-8 gap-1.5 rounded-xl border-[#ECECF0] bg-white text-xs font-semibold text-[#191927] hover:bg-slate-50 dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white dark:hover:bg-[#28283E]"
                                    >
                                        <Building2 className="h-3.5 w-3.5 text-[#0073ea]" />
                                        <span>New Account</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-2xl border-[#ECECF0] bg-white dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white">
                                    <DialogHeader>
                                        <DialogTitle>New Client Account</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleCreateCustomer} className="space-y-4 pt-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label>Contact Name</Label>
                                                <Input
                                                    required
                                                    value={newCustomer.name}
                                                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <Label>Company</Label>
                                                <Input
                                                    value={newCustomer.company}
                                                    onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label>Email</Label>
                                                <Input
                                                    type="email"
                                                    required
                                                    value={newCustomer.email}
                                                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <Label>Phone</Label>
                                                <Input
                                                    value={newCustomer.phone}
                                                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button type="button" variant="outline" onClick={() => setIsCustomerOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" className="bg-[#0073ea] text-white">
                                                Save Account
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={isLeadOpen} onOpenChange={setIsLeadOpen}>
                                <DialogTrigger asChild>
                                    <Button className="h-8 gap-1.5 rounded-xl bg-[#0073ea] text-xs font-bold text-white hover:bg-[#0060b9]">
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Add Deal</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-2xl border-[#ECECF0] bg-white dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white">
                                    <DialogHeader>
                                        <DialogTitle>Add Opportunity</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleCreateLead} className="space-y-4 pt-2">
                                        <div>
                                            <Label>Account</Label>
                                            <Select
                                                value={String(newLead.customer_id)}
                                                onValueChange={(val) => setNewLead({ ...newLead, customer_id: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-[#ECECF0] bg-white dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white">
                                                    {customers.map((c) => (
                                                        <SelectItem key={c.id} value={String(c.id)}>
                                                            {c.company || c.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Opportunity Title</Label>
                                            <Input
                                                required
                                                value={newLead.title}
                                                onChange={(e) => setNewLead({ ...newLead, title: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label>Deal Value ($)</Label>
                                                <Input
                                                    type="number"
                                                    value={newLead.deal_value}
                                                    onChange={(e) => setNewLead({ ...newLead, deal_value: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                            <div>
                                                <Label>Stage</Label>
                                                <Select value={newLead.stage} onValueChange={(val) => setNewLead({ ...newLead, stage: val })}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-[#ECECF0] bg-white dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white">
                                                        <SelectItem value="New">New</SelectItem>
                                                        <SelectItem value="Contacted">Contacted</SelectItem>
                                                        <SelectItem value="Proposal">Proposal</SelectItem>
                                                        <SelectItem value="Negotiation">Negotiation</SelectItem>
                                                        <SelectItem value="Closed Won">Closed Won</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button type="button" variant="outline" onClick={() => setIsLeadOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" className="bg-[#0073ea] text-white">
                                                Save Deal
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>

                {/* Monday Groups Section */}
                <div className="space-y-6 p-6">
                    {/* GROUP 1: ACTIVE PIPELINE DEALS */}
                    <div className="overflow-hidden rounded-2xl border border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <div className="flex items-center justify-between border-b border-[#ECECF0] bg-white px-4 py-2.5 dark:border-[#28283E] dark:bg-[#1E1E2F]">
                            <div className="flex items-center gap-2">
                                <span className="h-4 w-1 rounded-full bg-[#0073ea]" />
                                <ChevronDown className="h-4 w-4 text-[#777785] dark:text-slate-400" />
                                <h2 className="text-sm font-extrabold text-[#0073ea] dark:text-blue-400">Active Deals In Pipeline</h2>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-[#777785] dark:bg-[#181826] dark:text-slate-300">
                                    {activeDeals.length} deals • Total: ${totalActiveVal.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                    <tr className="border-b border-[#ECECF0] bg-slate-50/70 text-[11px] font-semibold text-[#777785] dark:border-[#28283E] dark:bg-[#181826] dark:text-slate-400">
                                        <th className="w-10 p-2.5 text-center">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-[#1E1E2F]"
                                            />
                                        </th>
                                        <th className="min-w-[240px] p-2.5">Opportunity Title</th>
                                        <th className="w-44 p-2.5">Client Account</th>
                                        <th className="w-36 p-2.5 text-center">Stage</th>
                                        <th className="w-32 p-2.5 text-center">Deal Value</th>
                                        <th className="w-32 p-2.5 text-center">Probability</th>
                                        <th className="w-36 p-2.5 text-center">Advance Stage</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#ECECF0] dark:divide-[#28283E]">
                                    {activeDeals.map((lead) => (
                                        <tr key={lead.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-[#181826]/70">
                                            <td className="border-l-4 border-l-[#0073ea] p-2.5 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-[#1E1E2F]"
                                                />
                                            </td>
                                            <td className="p-2.5 font-bold text-[#191927] dark:text-white">{lead.title}</td>
                                            <td className="p-2.5 text-[#777785] dark:text-slate-300">
                                                {lead.customer?.company || lead.customer?.name}
                                            </td>
                                            <td className="p-1 text-center">
                                                <div className={`rounded-lg px-2 py-1 text-[11px] font-bold shadow-xs ${getStageStyle(lead.stage)}`}>
                                                    {lead.stage}
                                                </div>
                                            </td>
                                            <td className="p-2.5 text-center font-bold text-[#00c875]">
                                                ${Number(lead.deal_value).toLocaleString()}
                                            </td>
                                            <td className="p-2.5 text-center text-[#777785] dark:text-slate-400">{lead.probability}%</td>
                                            <td className="p-2 text-center">
                                                <Select value={lead.stage} onValueChange={(val) => handleAdvanceStage(lead.id, val)}>
                                                    <SelectTrigger className="mx-auto h-6 w-28 rounded-lg border-[#ECECF0] bg-slate-50 text-[10px] dark:border-[#28283E] dark:bg-[#181826] dark:text-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-[#ECECF0] bg-white dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white">
                                                        {['New', 'Contacted', 'Proposal', 'Negotiation', 'Closed Won'].map((s) => (
                                                            <SelectItem key={s} value={s} className="dark:focus:bg-[#28283E] dark:focus:text-white">
                                                                {s}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* GROUP 2: WON DEALS */}
                    <div className="overflow-hidden rounded-2xl border border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <div className="flex items-center justify-between border-b border-[#ECECF0] bg-white px-4 py-2.5 dark:border-[#28283E] dark:bg-[#1E1E2F]">
                            <div className="flex items-center gap-2">
                                <span className="h-4 w-1 rounded-full bg-[#00c875]" />
                                <ChevronDown className="h-4 w-4 text-[#777785] dark:text-slate-400" />
                                <h2 className="text-sm font-extrabold text-[#00c875]">Closed Won Accounts</h2>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-[#777785] dark:bg-[#181826] dark:text-slate-300">
                                    {wonDeals.length} accounts • Realized: ${totalWonVal.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                    <tr className="border-b border-[#ECECF0] bg-slate-50/70 text-[11px] font-semibold text-[#777785] dark:border-[#28283E] dark:bg-[#181826] dark:text-slate-400">
                                        <th className="w-10 p-2.5 text-center">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-[#1E1E2F]"
                                            />
                                        </th>
                                        <th className="min-w-[240px] p-2.5">Opportunity Title</th>
                                        <th className="w-44 p-2.5">Client Account</th>
                                        <th className="w-36 p-2.5 text-center">Stage</th>
                                        <th className="w-32 p-2.5 text-center">Settled Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#ECECF0] dark:divide-[#28283E]">
                                    {wonDeals.map((lead) => (
                                        <tr key={lead.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-[#181826]/70">
                                            <td className="border-l-4 border-l-[#00c875] p-2.5 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-[#1E1E2F]"
                                                />
                                            </td>
                                            <td className="p-2.5 font-bold text-[#191927] dark:text-white">{lead.title}</td>
                                            <td className="p-2.5 text-[#777785] dark:text-slate-300">
                                                {lead.customer?.company || lead.customer?.name}
                                            </td>
                                            <td className="p-1 text-center">
                                                <div className="rounded-lg bg-[#00c875] px-2 py-1 text-[11px] font-bold text-white">Closed Won</div>
                                            </td>
                                            <td className="p-2.5 text-center font-bold text-[#00c875]">
                                                ${Number(lead.deal_value).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
