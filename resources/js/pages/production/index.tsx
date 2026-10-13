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
import { AlertTriangle, Plus, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Production Management', href: '/production' },
];

interface ProductionProps {
    workOrders: any[];
    qualityChecks: any[];
    incidents: any[];
    supervisors: any[];
}

export default function ProductionPage({ workOrders = [], qualityChecks = [], incidents = [], supervisors = [] }: ProductionProps) {
    const [isOrderOpen, setIsOrderOpen] = useState(false);
    const [isQcOpen, setIsQcOpen] = useState(false);

    const [newOrder, setNewOrder] = useState({
        order_no: `WO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        product_title: '',
        batch_number: `BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
        quantity: 1000,
        priority: 'Normal',
        start_date: new Date().toISOString().split('T')[0],
        target_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        assigned_unit: 'Assembly Line 1',
        notes: '',
    });

    const [newQc, setNewQc] = useState({
        work_order_id: workOrders[0]?.id || '',
        sample_size: 100,
        defect_count: 0,
        status: 'Passed',
        notes: '',
    });

    const handleCreateOrder = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/production/work-orders', newOrder, {
            onSuccess: () => {
                setIsOrderOpen(false);
            },
        });
    };

    const handleCreateQc = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/production/qc', newQc, {
            onSuccess: () => {
                setIsQcOpen(false);
            },
        });
    };

    const handleUpdateStatus = (orderId: number, status: string, completedQty: number) => {
        router.patch(
            `/production/work-orders/${orderId}`,
            {
                status,
                completed_quantity: completedQty,
            },
            { preserveScroll: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Production Management" />

            <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 p-4 text-[#191927] transition-colors md:p-6 lg:p-8 dark:text-white">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-[#191927] dark:text-white">Production Management</h1>
                            <Badge variant="outline" className="border-[#ECECF0] text-xs text-[#777785] dark:border-[#28283E] dark:text-slate-400">
                                Module 03
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#777785] md:text-sm dark:text-slate-400">
                            Shop floor work orders, quality assurance inspections, assembly units, and incident management.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Dialog open={isQcOpen} onOpenChange={setIsQcOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50">
                                    <ShieldCheck className="h-4 w-4" />
                                    Log QA Inspection
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Record Quality Inspection</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateQc} className="space-y-4 pt-2">
                                    <div>
                                        <Label>Work Order</Label>
                                        <Select
                                            value={String(newQc.work_order_id)}
                                            onValueChange={(val) => setNewQc({ ...newQc, work_order_id: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {workOrders.map((wo) => (
                                                    <SelectItem key={wo.id} value={String(wo.id)}>
                                                        {wo.order_no} • {wo.product_title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Sample Size Tested</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={newQc.sample_size}
                                                onChange={(e) => setNewQc({ ...newQc, sample_size: parseInt(e.target.value) || 1 })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Defects Count</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={newQc.defect_count}
                                                onChange={(e) => setNewQc({ ...newQc, defect_count: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>QC Verdict</Label>
                                        <Select value={newQc.status} onValueChange={(val) => setNewQc({ ...newQc, status: val })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Passed">Passed (Meets Standard)</SelectItem>
                                                <SelectItem value="Failed">Failed (Unacceptable Defect Rate)</SelectItem>
                                                <SelectItem value="Re-work">Re-work Required</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Inspector Notes</Label>
                                        <Input
                                            value={newQc.notes}
                                            onChange={(e) => setNewQc({ ...newQc, notes: e.target.value })}
                                            placeholder="Measurements, tolerances, or failure reason..."
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setIsQcOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700">
                                            Save Inspection
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isOrderOpen} onOpenChange={setIsOrderOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 bg-amber-600 text-white shadow-sm hover:bg-amber-700">
                                    <Plus className="h-4 w-4" />
                                    New Work Order
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Issue New Work Order</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateOrder} className="space-y-4 pt-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Order Number</Label>
                                            <Input value={newOrder.order_no} readOnly className="bg-muted font-mono" />
                                        </div>
                                        <div>
                                            <Label>Batch Number</Label>
                                            <Input
                                                value={newOrder.batch_number}
                                                onChange={(e) => setNewOrder({ ...newOrder, batch_number: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Product Name / Specification</Label>
                                        <Input
                                            required
                                            value={newOrder.product_title}
                                            onChange={(e) => setNewOrder({ ...newOrder, product_title: e.target.value })}
                                            placeholder="e.g., Wireless Mesh Gateway v3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Target Quantity</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={newOrder.quantity}
                                                onChange={(e) => setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) || 1 })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Priority</Label>
                                            <Select value={newOrder.priority} onValueChange={(val) => setNewOrder({ ...newOrder, priority: val })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Normal">Normal</SelectItem>
                                                    <SelectItem value="High">High</SelectItem>
                                                    <SelectItem value="Urgent">Urgent</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Start Date</Label>
                                            <Input
                                                type="date"
                                                value={newOrder.start_date}
                                                onChange={(e) => setNewOrder({ ...newOrder, start_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Target Completion</Label>
                                            <Input
                                                type="date"
                                                value={newOrder.target_date}
                                                onChange={(e) => setNewOrder({ ...newOrder, target_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Assigned Plant / Unit</Label>
                                        <Input
                                            value={newOrder.assigned_unit}
                                            onChange={(e) => setNewOrder({ ...newOrder, assigned_unit: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setIsOrderOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="bg-amber-600 text-white hover:bg-amber-700">
                                            Create Order
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Work Orders List */}
                <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Active Work Orders & Assembly Tracking</CardTitle>
                        <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                            Manage batch progress and transition shop floor stages
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {workOrders.map((order) => {
                            const percent = order.quantity > 0 ? Math.round((order.completed_quantity / order.quantity) * 100) : 0;
                            return (
                                <div
                                    key={order.id}
                                    className="space-y-3 rounded-2xl border border-[#ECECF0] bg-white p-4 transition-colors hover:border-[#191927]/20 dark:border-[#28283E] dark:bg-[#181826] dark:hover:border-slate-500/40"
                                >
                                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{order.order_no}</span>
                                                <Badge
                                                    variant="outline"
                                                    className="border-[#ECECF0] text-xs text-[#777785] dark:border-[#28283E] dark:text-slate-400"
                                                >
                                                    {order.batch_number}
                                                </Badge>
                                                <Badge
                                                    variant="secondary"
                                                    className={
                                                        order.priority === 'Urgent'
                                                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                                            : 'bg-slate-100 text-slate-700 dark:bg-[#28283E] dark:text-slate-300'
                                                    }
                                                >
                                                    {order.priority}
                                                </Badge>
                                            </div>
                                            <h3 className="text-sm font-bold text-[#191927] dark:text-white">{order.product_title}</h3>
                                            <p className="text-xs text-[#777785] dark:text-slate-400">
                                                Unit: {order.assigned_unit} • Due: {formatDate(order.target_date)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className={`text-xs ${
                                                    order.status === 'Completed'
                                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                                                        : order.status === 'QA Review'
                                                          ? 'border-amber-500 bg-amber-500/10 text-amber-600'
                                                          : 'border-blue-500 bg-blue-500/10 text-blue-600'
                                                }`}
                                            >
                                                {order.status}
                                            </Badge>
                                            <Select
                                                value={order.status}
                                                onValueChange={(val) => {
                                                    const newCompleted = val === 'Completed' ? order.quantity : order.completed_quantity;
                                                    handleUpdateStatus(order.id, val, newCompleted);
                                                }}
                                            >
                                                <SelectTrigger className="h-7 w-36 rounded-lg border-[#ECECF0] bg-slate-50 text-xs dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-[#ECECF0] bg-white dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white">
                                                    <SelectItem value="Pending">Pending</SelectItem>
                                                    <SelectItem value="In Production">In Production</SelectItem>
                                                    <SelectItem value="QA Review">QA Review</SelectItem>
                                                    <SelectItem value="Completed">Completed</SelectItem>
                                                    <SelectItem value="On Hold">On Hold</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Progress Bar & Units */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-[#777785] dark:text-slate-400">
                                            <span>
                                                Progress: {order.completed_quantity} / {order.quantity} units
                                            </span>
                                            <span className="font-semibold text-[#191927] dark:text-white">{percent}% Completed</span>
                                        </div>
                                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div
                                                className={`h-2.5 rounded-full transition-all duration-500 ${percent === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Split: Quality Assurance Inspections & Incident Reporting */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Quality Inspections */}
                    <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Quality Inspection Log</CardTitle>
                            <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                                Defect tolerance thresholds and verification audit
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y divide-[#ECECF0] overflow-hidden rounded-xl border border-[#ECECF0] dark:divide-[#28283E] dark:border-[#28283E]">
                                {qualityChecks.map((qc) => (
                                    <div
                                        key={qc.id}
                                        className="space-y-1 p-3 text-xs transition-colors hover:bg-slate-50/80 dark:hover:bg-[#181826]/70"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-[#191927] dark:text-white">
                                                {qc.work_order?.order_no || `WO #${qc.work_order_id}`}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    qc.status === 'Passed'
                                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                                                        : 'border-rose-500 bg-rose-500/10 text-rose-600'
                                                }
                                            >
                                                {qc.status}
                                            </Badge>
                                        </div>
                                        <div className="text-[#777785] dark:text-slate-400">
                                            Sample: {qc.sample_size} units • Defects: {qc.defect_count}
                                        </div>
                                        {qc.notes && <p className="text-[11px] text-[#777785] italic dark:text-slate-400">{qc.notes}</p>}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Incident Reports */}
                    <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Line Incidents & Deviations</CardTitle>
                            <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                                Machine stoppages, calibration drift, and safety tickets
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y divide-[#ECECF0] overflow-hidden rounded-xl border border-[#ECECF0] dark:divide-[#28283E] dark:border-[#28283E]">
                                {incidents.map((inc) => (
                                    <div
                                        key={inc.id}
                                        className="space-y-1 p-3 text-xs transition-colors hover:bg-slate-50/80 dark:hover:bg-[#181826]/70"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                {inc.title}
                                            </span>
                                            <Badge variant="outline" className="border-rose-500 bg-rose-500/10 text-rose-600">
                                                {inc.severity}
                                            </Badge>
                                        </div>
                                        <p className="text-[11px] text-[#777785] dark:text-slate-400">{inc.description}</p>
                                        {inc.corrective_action && (
                                            <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                                Action: {inc.corrective_action}
                                            </div>
                                        )}
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
