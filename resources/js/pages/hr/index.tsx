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
import { Award, CalendarCheck, Check, Plus, UserCheck, Users, X } from 'lucide-react';
import React, { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'HR Management', href: '/hr' },
];

interface HrProps {
    employees: any[];
    attendances: any[];
    leaveRequests: any[];
    performanceReviews: any[];
}

export default function HrPage({ employees = [], attendances = [], leaveRequests = [], performanceReviews = [] }: HrProps) {
    const [isLeaveOpen, setIsLeaveOpen] = useState(false);
    const [newLeave, setNewLeave] = useState({
        employee_id: employees[0]?.id || '',
        leave_type: 'Annual',
        start_date: '',
        end_date: '',
        total_days: 1,
        reason: '',
    });

    const handleApplyLeave = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/hr/leaves', newLeave, {
            onSuccess: () => {
                setIsLeaveOpen(false);
                setNewLeave({ employee_id: employees[0]?.id || '', leave_type: 'Annual', start_date: '', end_date: '', total_days: 1, reason: '' });
            },
        });
    };

    const handleUpdateLeaveStatus = (leaveId: number, status: 'Approved' | 'Rejected') => {
        router.patch(`/hr/leaves/${leaveId}`, { status }, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="HR Management" />

            <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 p-4 text-[#191927] transition-colors md:p-6 lg:p-8 dark:text-white">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-[#191927] dark:text-white">Human Resources Management</h1>
                            <Badge variant="outline" className="border-[#ECECF0] text-xs text-[#777785] dark:border-[#28283E] dark:text-slate-400">
                                Module 02
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#777785] md:text-sm dark:text-slate-400">
                            Employee records, attendance tracking, leave approval workflows, and performance evaluations.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Dialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 bg-pink-600 text-white shadow-sm hover:bg-pink-700">
                                    <Plus className="h-4 w-4" />
                                    Submit Leave Request
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Apply for Employee Leave</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleApplyLeave} className="space-y-4 pt-2">
                                    <div>
                                        <Label>Employee</Label>
                                        <Select
                                            value={String(newLeave.employee_id)}
                                            onValueChange={(val) => setNewLeave({ ...newLeave, employee_id: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Employee" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.map((emp) => (
                                                    <SelectItem key={emp.id} value={String(emp.id)}>
                                                        {emp.first_name} {emp.last_name} ({emp.department})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Leave Type</Label>
                                            <Select
                                                value={newLeave.leave_type}
                                                onValueChange={(val) => setNewLeave({ ...newLeave, leave_type: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Annual">Annual Leave</SelectItem>
                                                    <SelectItem value="Sick">Sick Leave</SelectItem>
                                                    <SelectItem value="Casual">Casual Leave</SelectItem>
                                                    <SelectItem value="Maternity">Maternity/Paternity</SelectItem>
                                                    <SelectItem value="Unpaid">Unpaid Leave</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Total Days</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={newLeave.total_days}
                                                onChange={(e) => setNewLeave({ ...newLeave, total_days: parseInt(e.target.value) || 1 })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Start Date</Label>
                                            <Input
                                                type="date"
                                                required
                                                value={newLeave.start_date}
                                                onChange={(e) => setNewLeave({ ...newLeave, start_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>End Date</Label>
                                            <Input
                                                type="date"
                                                required
                                                value={newLeave.end_date}
                                                onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Reason / Handover Notes</Label>
                                        <Input
                                            required
                                            value={newLeave.reason}
                                            onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                                            placeholder="Provide reason for absence..."
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setIsLeaveOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="bg-pink-600 text-white hover:bg-pink-700">
                                            Submit Request
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Top Quick Stats */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                            <CardTitle className="text-xs font-bold text-[#777785] uppercase dark:text-slate-400">Total Headcount</CardTitle>
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/10 dark:bg-pink-500/20">
                                <Users className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl font-black text-[#191927] dark:text-white">{employees.length} Employees</div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">100% active payroll</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                            <CardTitle className="text-xs font-bold text-[#777785] uppercase dark:text-slate-400">Leave Requests</CardTitle>
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-500/20">
                                <CalendarCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl font-black text-[#191927] dark:text-white">
                                {leaveRequests.filter((l) => l.status === 'Pending').length} Pending
                            </div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">Requires supervisor review</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                            <CardTitle className="text-xs font-bold text-[#777785] uppercase dark:text-slate-400">Attendance Logged</CardTitle>
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
                                <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl font-black text-[#191927] dark:text-white">{attendances.length} Records</div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">Today's clock-ins logged</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                            <CardTitle className="text-xs font-bold text-[#777785] uppercase dark:text-slate-400">Avg Performance</CardTitle>
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-500/20">
                                <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl font-black text-[#191927] dark:text-white">9.0 / 10</div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">Q3 appraisal cycle</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Employees Directory Table */}
                <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Employee Directory</CardTitle>
                        <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                            Corporate staff roster across all departments
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-xl border border-[#ECECF0] dark:border-[#28283E]">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-[#ECECF0] bg-slate-50/70 text-[11px] font-semibold text-[#777785] uppercase dark:border-[#28283E] dark:bg-[#181826] dark:text-slate-400">
                                    <tr>
                                        <th className="p-3">Emp Code</th>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">Department</th>
                                        <th className="p-3">Designation</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3">Join Date</th>
                                        <th className="p-3">Salary</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#ECECF0] dark:divide-[#28283E]">
                                    {employees.map((emp) => (
                                        <tr key={emp.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-[#181826]/70">
                                            <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{emp.emp_code}</td>
                                            <td className="p-3 font-medium">
                                                <div className="font-bold text-[#191927] dark:text-white">
                                                    {emp.first_name} {emp.last_name}
                                                </div>
                                                <div className="text-[11px] text-[#777785] dark:text-slate-400">{emp.email}</div>
                                            </td>
                                            <td className="p-3 text-[#191927] dark:text-slate-200">{emp.department}</td>
                                            <td className="p-3 text-[#777785] dark:text-slate-400">{emp.designation}</td>
                                            <td className="p-3">
                                                <Badge
                                                    variant="outline"
                                                    className="border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                >
                                                    {emp.status}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-[#777785] dark:text-slate-400">{formatDate(emp.join_date)}</td>
                                            <td className="p-3 font-medium text-[#191927] dark:text-white">
                                                ${Number(emp.basic_salary).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Leave Requests Approval Pipeline */}
                <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Leave Requests & Approvals</CardTitle>
                        <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                            Cross-department time-off applications & management decisions
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-[#ECECF0] overflow-hidden rounded-xl border border-[#ECECF0] dark:divide-[#28283E] dark:border-[#28283E]">
                            {leaveRequests.length === 0 ? (
                                <p className="p-4 text-center text-xs text-[#777785] dark:text-slate-400">No leave requests logged</p>
                            ) : (
                                leaveRequests.map((leave) => (
                                    <div
                                        key={leave.id}
                                        className="flex flex-col justify-between gap-3 p-3.5 text-xs transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center dark:hover:bg-[#181826]/70"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[#191927] dark:text-white">
                                                    {leave.employee?.first_name} {leave.employee?.last_name}
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-[#ECECF0] text-[10px] text-[#191927] dark:bg-[#28283E] dark:text-slate-200"
                                                >
                                                    {leave.leave_type} Leave
                                                </Badge>
                                                <span className="text-[#777785] dark:text-slate-400">({leave.total_days} days)</span>
                                            </div>
                                            <p className="text-[11px] text-[#777785] dark:text-slate-400">{leave.reason}</p>
                                            <div className="text-[10px] text-[#777785] dark:text-slate-400">
                                                Schedule: {formatDate(leave.start_date)} to {formatDate(leave.end_date)}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {leave.status === 'Pending' ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleUpdateLeaveStatus(leave.id, 'Approved')}
                                                        className="h-7 gap-1 rounded-lg bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                                                    >
                                                        <Check className="h-3 w-3" /> Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleUpdateLeaveStatus(leave.id, 'Rejected')}
                                                        className="h-7 gap-1 rounded-lg border-rose-200 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
                                                    >
                                                        <X className="h-3 w-3" /> Reject
                                                    </Button>
                                                </>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        leave.status === 'Approved'
                                                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                                                            : 'border-rose-500 bg-rose-500/10 text-rose-600'
                                                    }
                                                >
                                                    {leave.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
