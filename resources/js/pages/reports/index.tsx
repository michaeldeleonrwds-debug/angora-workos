import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { Clock, Download, Eye, FileText, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

interface Schedule {
    id: number;
    title: string;
    frequency: string;
    recipients: string[];
    format: string;
    is_active: boolean;
    last_sent_at?: string;
    next_run_at?: string;
}

interface Report {
    id: number;
    title: string;
    description?: string;
    report_type: string;
    config: any;
    created_at: string;
    creator: { id: number; name: string };
    schedules: Schedule[];
}

interface Props {
    reports: Report[];
    boards: Array<{ id: number; title: string }>;
}

export default function ReportsIndex({ reports, boards }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [previewData, setPreviewData] = useState<{ headers: string[]; rows: any[] } | null>(null);
    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);

    const { data, setData, post, processing, reset } = useForm({
        title: '',
        description: '',
        report_type: 'task_completion',
        config: {
            board_ids: [],
        },
    });

    const scheduleForm = useForm({
        title: '',
        frequency: 'weekly',
        format: 'csv',
        recipients: ['admin@angora.internal'],
    });

    const handleCreateReport = (e: React.FormEvent) => {
        e.preventDefault();
        post('/reports', {
            onSuccess: () => {
                setIsCreateOpen(false);
                reset();
            },
        });
    };

    const handlePreview = async (reportId: number) => {
        try {
            const res = await fetch(`/reports/${reportId}/preview`);
            const data = await res.json();
            setPreviewData(data);
            setSelectedReportId(reportId);
        } catch (e) {
            console.error('Failed to preview report', e);
        }
    };

    const handleScheduleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReportId) return;

        scheduleForm.post(`/reports/${selectedReportId}/schedules`, {
            onSuccess: () => {
                setIsScheduleOpen(false);
                scheduleForm.reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Report Builder', href: '/reports' }]}>
            <Head title="Report Builder & Automated Dispatches" />

            <div className="mx-auto max-w-7xl space-y-6 p-6">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 border-b border-gray-200/80 pb-4 sm:flex-row sm:items-center dark:border-gray-800">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#12121E] dark:text-white">
                            <FileText className="h-6 w-6 text-[#6366f1]" /> Report Builder & Dispatches
                        </h1>
                        <p className="mt-1 text-xs text-gray-500">
                            Generate CSV data extracts, audit task completion rates, and configure scheduled reporting queues.
                        </p>
                    </div>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="rounded-xl bg-[#C8AEF5] text-xs font-semibold text-[#12121E] hover:bg-[#b89cee]">
                                <Plus className="mr-1.5 h-4 w-4" /> Configure New Report
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md rounded-[24px]">
                            <DialogHeader>
                                <DialogTitle>Configure Custom Report</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateReport} className="space-y-4 pt-2">
                                <div className="space-y-1">
                                    <Label>Report Title</Label>
                                    <Input
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        placeholder="e.g. Weekly Task Completion Audit"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Description</Label>
                                    <Input
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Purpose of this report..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Report Dataset Type</Label>
                                    <select
                                        value={data.report_type}
                                        onChange={(e) => setData('report_type', e.target.value)}
                                        className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                    >
                                        <option value="task_completion">Task Completion & Status Summary</option>
                                        <option value="overdue_tasks">Overdue Items Audit</option>
                                        <option value="project_status">Agency Projects Portfolio Overview</option>
                                        <option value="team_workload">Team Capacity & Workload Allocations</option>
                                        <option value="deliverables">Deliverables & Review Approvals</option>
                                    </select>
                                </div>

                                <div className="flex justify-end gap-2 pt-3">
                                    <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processing} className="bg-[#C8AEF5] text-[#12121E]">
                                        Create Report
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Report Grid / List */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-1">
                        <h3 className="text-xs font-bold tracking-wider text-gray-500 uppercase">Configured Reports</h3>
                        {reports.length === 0 ? (
                            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-900">
                                No custom reports configured yet.
                            </div>
                        ) : (
                            reports.map((report) => (
                                <div
                                    key={report.id}
                                    className={`rounded-2xl border p-4 transition-all ${
                                        selectedReportId === report.id
                                            ? 'border-[#C8AEF5] bg-purple-50/50 dark:bg-purple-950/40'
                                            : 'border-gray-100 bg-white hover:border-gray-200 dark:border-gray-800 dark:bg-gray-900'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{report.title}</h4>
                                            <span className="text-[10px] font-medium text-gray-400 capitalize">
                                                Type: {report.report_type.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => router.delete(`/reports/${report.id}`)}
                                            className="p-1 text-gray-400 hover:text-rose-500"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800/80">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handlePreview(report.id)}
                                            className="h-7 rounded-lg text-[11px]"
                                        >
                                            <Eye className="mr-1 h-3 w-3" /> Preview
                                        </Button>
                                        <a href={`/reports/${report.id}/export`} download>
                                            <Button size="sm" variant="outline" className="h-7 rounded-lg text-[11px]">
                                                <Download className="mr-1 h-3 w-3" /> CSV
                                            </Button>
                                        </a>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                setSelectedReportId(report.id);
                                                setIsScheduleOpen(true);
                                            }}
                                            className="ml-auto h-7 rounded-lg text-[11px] text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/60"
                                        >
                                            <Clock className="mr-1 h-3 w-3" /> Schedule
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Preview / Data Table */}
                    <div className="lg:col-span-2">
                        <div className="min-h-[350px] rounded-[24px] border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                                    <Eye className="h-4 w-4 text-purple-600" /> Live Report Data Preview
                                </h3>
                                {selectedReportId && (
                                    <a href={`/reports/${selectedReportId}/export`} download>
                                        <Button size="sm" className="rounded-xl bg-[#D8F779] text-xs font-semibold text-[#12121E] hover:bg-[#cbf165]">
                                            <Download className="mr-1 h-3.5 w-3.5" /> Export CSV
                                        </Button>
                                    </a>
                                )}
                            </div>

                            {!previewData ? (
                                <div className="flex h-64 flex-col items-center justify-center text-xs text-gray-400">
                                    <FileText className="mb-2 h-8 w-8 opacity-50" />
                                    Click "Preview" on any report to render dataset records.
                                </div>
                            ) : (
                                <div className="mt-4 overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/40">
                                                {previewData.headers.map((h, i) => (
                                                    <th key={i} className="p-2.5 font-bold text-gray-600 dark:text-gray-300">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.rows.map((row, idx) => (
                                                <tr
                                                    key={idx}
                                                    className="border-b border-gray-50 hover:bg-gray-50/40 dark:border-gray-800/50 dark:hover:bg-gray-800/30"
                                                >
                                                    {Object.values(row).map((val: any, cidx) => (
                                                        <td key={cidx} className="p-2.5 text-gray-800 dark:text-gray-200">
                                                            {String(val)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Schedule Modal */}
                <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                    <DialogContent className="max-w-md rounded-[24px]">
                        <DialogHeader>
                            <DialogTitle>Configure Automated Schedule</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleScheduleSubmit} className="space-y-4 pt-2">
                            <div className="space-y-1">
                                <Label>Schedule Title</Label>
                                <Input
                                    value={scheduleForm.data.title}
                                    onChange={(e) => scheduleForm.setData('title', e.target.value)}
                                    placeholder="e.g. Monday Morning Dispatch"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Dispatch Frequency</Label>
                                <select
                                    value={scheduleForm.data.frequency}
                                    onChange={(e) => scheduleForm.setData('frequency', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                >
                                    <option value="daily">Daily at 08:00 AM</option>
                                    <option value="weekly">Weekly (Every Monday 08:00 AM)</option>
                                    <option value="monthly">Monthly (1st of each month)</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label>Export Format</Label>
                                <select
                                    value={scheduleForm.data.format}
                                    onChange={(e) => scheduleForm.setData('format', e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                >
                                    <option value="csv">CSV Spreadsheet</option>
                                    <option value="pdf">PDF Summary</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-3">
                                <Button type="button" variant="ghost" onClick={() => setIsScheduleOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-[#C8AEF5] text-[#12121E]">
                                    Save Schedule
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
