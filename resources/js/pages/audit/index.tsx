import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Filter, Search } from 'lucide-react';
import React, { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Audit Logs & Activity', href: '/audit-logs' },
];

interface AuditProps {
    logs: {
        data: any[];
        links: any[];
        current_page: number;
        last_page: number;
    };
    departments: string[];
    filters: {
        department?: string;
        search?: string;
    };
}

export default function AuditLogPage({ logs, departments = [], filters = {} }: AuditProps) {
    const [dept, setDept] = useState<string>(filters.department || 'All');
    const [search, setSearch] = useState<string>(filters.search || '');

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/audit-logs',
            {
                department: dept,
                search: search || undefined,
            },
            { preserveState: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Audit Trails & Activity Logs" />

            <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 p-4 text-[#191927] transition-colors md:p-6 lg:p-8 dark:text-white">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-[#191927] dark:text-white">Audit Trails & Activity Logs</h1>
                            <Badge variant="outline" className="border-[#ECECF0] text-xs text-[#777785] dark:border-[#28283E] dark:text-slate-400">
                                Cross-Cutting Feature
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#777785] md:text-sm dark:text-slate-400">
                            Immutable enterprise event ledger recording state transitions across all 10 department systems.
                        </p>
                    </div>
                </div>

                {/* Filters Bar */}
                <Card className="rounded-2xl border-[#ECECF0] bg-white p-4 shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <form onSubmit={handleFilter} className="flex flex-col items-center gap-3 sm:flex-row">
                        <div className="relative w-full flex-1">
                            <Search className="absolute top-2.5 left-3 h-4 w-4 text-[#777785] dark:text-slate-400" />
                            <Input
                                placeholder="Search by action keyword or event description..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-9 rounded-xl border-[#ECECF0] bg-slate-50 pl-9 text-xs dark:border-[#28283E] dark:bg-[#181826] dark:text-white"
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <Select value={dept} onValueChange={setDept}>
                                <SelectTrigger className="h-9 rounded-xl border-[#ECECF0] bg-slate-50 text-xs dark:border-[#28283E] dark:bg-[#181826] dark:text-white">
                                    <SelectValue placeholder="Department" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-[#ECECF0] bg-white dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white">
                                    <SelectItem value="All">All Departments</SelectItem>
                                    {departments.map((d) => (
                                        <SelectItem key={d} value={d}>
                                            {d}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            type="submit"
                            size="sm"
                            className="h-9 w-full gap-1.5 rounded-xl bg-[#0073ea] text-xs text-white hover:bg-[#0060b9] sm:w-auto"
                        >
                            <Filter className="h-3.5 w-3.5" /> Filter
                        </Button>
                    </form>
                </Card>

                {/* Audit Logs Table */}
                <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-[#191927] dark:text-white">
                            System Event Logs ({logs.data?.length || 0} entries)
                        </CardTitle>
                        <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                            Cryptographically timestamped action history
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-xl border border-[#ECECF0] dark:border-[#28283E]">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-[#ECECF0] bg-slate-50/70 text-[11px] font-semibold text-[#777785] uppercase dark:border-[#28283E] dark:bg-[#181826] dark:text-slate-400">
                                    <tr>
                                        <th className="p-3">Timestamp</th>
                                        <th className="p-3">User & Persona</th>
                                        <th className="p-3">Department</th>
                                        <th className="p-3">Action Event</th>
                                        <th className="p-3">Description</th>
                                        <th className="p-3">IP Address</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#ECECF0] dark:divide-[#28283E]">
                                    {logs.data?.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-6 text-center text-[#777785] dark:text-slate-400">
                                                No audit entries matching the current filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.data?.map((log) => (
                                            <tr key={log.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-[#181826]/70">
                                                <td className="p-3 font-mono text-[11px] whitespace-nowrap text-[#777785] dark:text-slate-400">
                                                    {formatDateTime(log.created_at)}
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-semibold text-[#191927] dark:text-white">
                                                        {log.user?.name || 'System Auto'}
                                                    </div>
                                                    <div className="text-[10px] text-[#777785] dark:text-slate-400">{log.user?.role || 'Daemon'}</div>
                                                </td>
                                                <td className="p-3">
                                                    <Badge
                                                        variant="secondary"
                                                        className="bg-[#ECECF0] text-[10px] text-[#191927] dark:bg-[#28283E] dark:text-slate-300"
                                                    >
                                                        {log.department}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{log.action}</td>
                                                <td className="max-w-md p-3 text-[#777785] dark:text-slate-300">{log.description}</td>
                                                <td className="p-3 font-mono text-[10px] text-[#777785] dark:text-slate-400">
                                                    {log.ip_address || '127.0.0.1'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
