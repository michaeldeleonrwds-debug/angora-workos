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
import { Clock, LifeBuoy, Plus } from 'lucide-react';
import React, { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Operations & Workflow', href: '/operations' },
];

interface OperationsProps {
    workflows: any[];
    tickets: any[];
    users: any[];
}

export default function OperationsPage({ workflows = [], tickets = [], users = [] }: OperationsProps) {
    const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
    const [isTicketOpen, setIsTicketOpen] = useState(false);

    const [newWorkflow, setNewWorkflow] = useState({
        title: '',
        department: 'Operations',
        priority: 'High',
        assigned_to: users[0]?.id || '',
        description: '',
        due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    });

    const [newTicket, setNewTicket] = useState({
        service_type: 'Facility Request',
        department: 'Operations',
        priority: 'Medium',
        details: '',
    });

    const handleCreateWorkflow = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/operations/workflows', newWorkflow, {
            onSuccess: () => setIsWorkflowOpen(false),
        });
    };

    const handleCreateTicket = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/operations/tickets', newTicket, {
            onSuccess: () => setIsTicketOpen(false),
        });
    };

    const handleUpdateWorkflowStatus = (workflowId: number, status: string) => {
        router.patch(`/operations/workflows/${workflowId}`, { status }, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Operations & Workflow Management" />

            <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 p-4 text-[#191927] transition-colors md:p-6 lg:p-8 dark:text-white">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-[#191927] dark:text-white">Operations & Workflow Coordination</h1>
                            <Badge variant="outline" className="border-[#ECECF0] text-xs text-[#777785] dark:border-[#28283E] dark:text-slate-400">
                                Module 07
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#777785] md:text-sm dark:text-slate-400">
                            Cross-departmental procedures, technical service tickets, SLA compliance, and dispatch management.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Dialog open={isTicketOpen} onOpenChange={setIsTicketOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="gap-2 rounded-xl border-[#ECECF0] bg-white text-[#191927] dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white"
                                >
                                    <LifeBuoy className="h-4 w-4" />
                                    Raise Service Ticket
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Raise Service Request Ticket</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateTicket} className="space-y-4 pt-2">
                                    <div>
                                        <Label>Service Category</Label>
                                        <Select
                                            value={newTicket.service_type}
                                            onValueChange={(val) => setNewTicket({ ...newTicket, service_type: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Facility Request">Facility & Cleanroom Maintenance</SelectItem>
                                                <SelectItem value="Hardware/IT">Hardware / IT Infrastructure</SelectItem>
                                                <SelectItem value="Logistics">Supply Chain & Logistics</SelectItem>
                                                <SelectItem value="Equipment Maintenance">Machinery Calibration</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Department</Label>
                                            <Input
                                                value={newTicket.department}
                                                onChange={(e) => setNewTicket({ ...newTicket, department: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Urgency</Label>
                                            <Select value={newTicket.priority} onValueChange={(val) => setNewTicket({ ...newTicket, priority: val })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Low">Low</SelectItem>
                                                    <SelectItem value="Medium">Medium</SelectItem>
                                                    <SelectItem value="High">High</SelectItem>
                                                    <SelectItem value="Critical">Critical</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Issue Details</Label>
                                        <Input
                                            required
                                            value={newTicket.details}
                                            onChange={(e) => setNewTicket({ ...newTicket, details: e.target.value })}
                                            placeholder="Describe operational impediment..."
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setIsTicketOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
                                            Submit Ticket
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isWorkflowOpen} onOpenChange={setIsWorkflowOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700">
                                    <Plus className="h-4 w-4" />
                                    Initiate Workflow
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Initiate Operational Workflow</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateWorkflow} className="space-y-4 pt-2">
                                    <div>
                                        <Label>Workflow Title</Label>
                                        <Input
                                            required
                                            value={newWorkflow.title}
                                            onChange={(e) => setNewWorkflow({ ...newWorkflow, title: e.target.value })}
                                            placeholder="e.g. SMT Line 2 Calibration & Safety Pass"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Target Department</Label>
                                            <Input
                                                value={newWorkflow.department}
                                                onChange={(e) => setNewWorkflow({ ...newWorkflow, department: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Priority</Label>
                                            <Select
                                                value={newWorkflow.priority}
                                                onValueChange={(val) => setNewWorkflow({ ...newWorkflow, priority: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Low">Low</SelectItem>
                                                    <SelectItem value="Medium">Medium</SelectItem>
                                                    <SelectItem value="High">High</SelectItem>
                                                    <SelectItem value="Critical">Critical</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Assigned Lead</Label>
                                            <Select
                                                value={String(newWorkflow.assigned_to)}
                                                onValueChange={(val) => setNewWorkflow({ ...newWorkflow, assigned_to: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {users.map((u) => (
                                                        <SelectItem key={u.id} value={String(u.id)}>
                                                            {u.name} ({u.role})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Due Date</Label>
                                            <Input
                                                type="date"
                                                value={newWorkflow.due_date}
                                                onChange={(e) => setNewWorkflow({ ...newWorkflow, due_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Action Description</Label>
                                        <Input
                                            required
                                            value={newWorkflow.description}
                                            onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                                            placeholder="Protocol specifications..."
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setIsWorkflowOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
                                            Start Workflow
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Operations Workflows List */}
                <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Active Operations Workflows</CardTitle>
                        <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                            Multi-department execution pipelines and protocol sign-offs
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {workflows.map((wf) => (
                            <div
                                key={wf.id}
                                className="space-y-2.5 rounded-2xl border border-[#ECECF0] bg-white p-4 dark:border-[#28283E] dark:bg-[#181826]"
                            >
                                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-[#191927] dark:text-white">{wf.title}</span>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    wf.priority === 'Critical'
                                                        ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                                                        : 'border-blue-500 bg-blue-500/10 text-blue-600'
                                                }
                                            >
                                                {wf.priority}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-[#777785] dark:text-slate-400">
                                            Dept: {wf.department} • Requested by: {wf.requester?.name || 'Staff'} • Lead:{' '}
                                            {wf.assignee?.name || 'Unassigned'}
                                            {wf.due_date && <span> • Due: {formatDate(wf.due_date)}</span>}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="secondary"
                                            className="bg-[#ECECF0] text-xs text-[#191927] dark:bg-[#28283E] dark:text-slate-300"
                                        >
                                            {wf.status}
                                        </Badge>
                                        <Select value={wf.status} onValueChange={(val) => handleUpdateWorkflowStatus(wf.id, val)}>
                                            <SelectTrigger className="h-7 w-36 rounded-lg border-[#ECECF0] bg-slate-50 text-xs dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-[#ECECF0] bg-white dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white">
                                                <SelectItem value="Pending">Pending</SelectItem>
                                                <SelectItem value="In Progress">In Progress</SelectItem>
                                                <SelectItem value="Department Review">Review</SelectItem>
                                                <SelectItem value="Completed">Completed</SelectItem>
                                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <p className="rounded-xl border border-[#ECECF0] bg-slate-50 p-2.5 text-xs leading-relaxed text-[#777785] dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-slate-400">
                                    {wf.description}
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Service Tickets Board */}
                <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Operational Service Tickets</CardTitle>
                        <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                            Facility & equipment ticket queue with SLA resolution tracking
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-[#ECECF0] overflow-hidden rounded-xl border border-[#ECECF0] dark:divide-[#28283E] dark:border-[#28283E]">
                            {tickets.map((tck) => (
                                <div
                                    key={tck.id}
                                    className="flex flex-col justify-between gap-2 p-3.5 text-xs transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center dark:hover:bg-[#181826]/70"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{tck.ticket_number}</span>
                                            <Badge
                                                variant="secondary"
                                                className="bg-[#ECECF0] text-[10px] text-[#191927] dark:bg-[#28283E] dark:text-slate-300"
                                            >
                                                {tck.service_type}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    tck.priority === 'High'
                                                        ? 'border-amber-500 bg-amber-500/10 text-amber-600'
                                                        : 'border-slate-400 text-[#777785] dark:text-slate-400'
                                                }
                                            >
                                                {tck.priority}
                                            </Badge>
                                        </div>
                                        <p className="text-[#191927] dark:text-white">{tck.details}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-3">
                                        <span className="flex items-center gap-1 text-[11px] text-[#777785] dark:text-slate-400">
                                            <Clock className="h-3 w-3" /> SLA: 24h
                                        </span>
                                        <Badge variant="outline" className="border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                            {tck.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
