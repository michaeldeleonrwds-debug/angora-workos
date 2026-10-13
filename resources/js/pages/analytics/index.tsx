import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Download, Layers, TrendingUp, Wallet, Zap } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Analytics & Reporting', href: '/analytics' },
];

interface AnalyticsProps {
    kpis: {
        totalRevenue: number;
        pipelineTotal: number;
        productionVolume: number;
        qaPassRate: number;
        totalHeadcount: number;
        totalCampaignReach: number;
        marketingSpend: number;
        budgetUtilization: number;
        taskCompletionRate: number;
    };
    departmentHeadcounts: any[];
    budgetDistribution: any[];
    monthlySales: any[];
}

export default function AnalyticsPage({ kpis, departmentHeadcounts = [], budgetDistribution = [], monthlySales = [] }: AnalyticsProps) {
    const handleExportCsv = () => {
        const rows = [
            ['Metric', 'Value'],
            ['Total Realized Revenue', `$${kpis.totalRevenue}`],
            ['Active Sales Pipeline', `$${kpis.pipelineTotal}`],
            ['Production Output Volume', `${kpis.productionVolume} units`],
            ['QA Inspection Pass Rate', `${kpis.qaPassRate}%`],
            ['Total Active Headcount', `${kpis.totalHeadcount} staff`],
            ['Marketing Total Reach', `${kpis.totalCampaignReach} views`],
            ['Budget Cap Utilization', `${kpis.budgetUtilization}%`],
        ];
        const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Angora_Enterprise_Telemetry_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Analytics & Executive Reporting" />

            <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 p-4 text-[#191927] transition-colors md:p-6 lg:p-8 dark:text-white">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-[#191927] dark:text-white">Analytics & Business Intelligence</h1>
                            <Badge variant="outline" className="border-[#ECECF0] text-xs text-[#777785] dark:border-[#28283E] dark:text-slate-400">
                                Module 10
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#777785] md:text-sm dark:text-slate-400">
                            Executive telemetry dashboards, cross-department performance metrics, custom insights, and exports.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button onClick={handleExportCsv} className="gap-2 rounded-xl bg-teal-600 text-white shadow-sm hover:bg-teal-700">
                            <Download className="h-4 w-4" />
                            Export Telemetry (CSV)
                        </Button>
                    </div>
                </div>

                {/* High-Level KPI Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="rounded-2xl border-l-4 border-[#ECECF0] border-l-teal-500 bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                            <CardTitle className="text-xs font-bold text-[#777785] uppercase dark:text-slate-400">Realized Revenue</CardTitle>
                            <TrendingUp className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl font-black text-[#191927] dark:text-white">${Number(kpis.totalRevenue).toLocaleString()}</div>
                            <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">+18.4% vs previous quarter</p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-l-4 border-[#ECECF0] border-l-blue-500 bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                            <CardTitle className="text-xs font-bold text-[#777785] uppercase dark:text-slate-400">Production QA Rate</CardTitle>
                            <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl font-black text-[#191927] dark:text-white">{kpis.qaPassRate}% Pass</div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">{kpis.productionVolume} Total units inspected</p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-l-4 border-[#ECECF0] border-l-cyan-500 bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                            <CardTitle className="text-xs font-bold text-[#777785] uppercase dark:text-slate-400">Budget Cap Used</CardTitle>
                            <Wallet className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl font-black text-[#191927] dark:text-white">{kpis.budgetUtilization}%</div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">FY2026 overall utilization</p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-l-4 border-[#ECECF0] border-l-indigo-500 bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                            <CardTitle className="text-xs font-bold text-[#777785] uppercase dark:text-slate-400">Task Velocity</CardTitle>
                            <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl font-black text-[#191927] dark:text-white">{kpis.taskCompletionRate}%</div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">Kanban sprint delivery rate</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Mid Section: Monthly Sales vs Targets */}
                <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Monthly Sales Revenue vs Quota Targets</CardTitle>
                        <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                            Month-on-month performance across product lines
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {monthlySales.map((m) => {
                                const percent = Math.min(100, Math.round((m.sales / m.target) * 100));
                                return (
                                    <div
                                        key={m.month}
                                        className="space-y-1.5 rounded-xl border border-[#ECECF0] bg-white p-3 dark:border-[#28283E] dark:bg-[#181826]"
                                    >
                                        <div className="flex justify-between text-xs font-semibold text-[#191927] dark:text-white">
                                            <span>{m.month}</span>
                                            <span className="text-[#777785] dark:text-slate-300">
                                                ${Number(m.sales).toLocaleString()} / ${Number(m.target).toLocaleString()} ({percent}% of Quota)
                                            </span>
                                        </div>
                                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div
                                                className={`h-2.5 rounded-full transition-all duration-500 ${percent >= 100 ? 'bg-emerald-500' : 'bg-teal-600'}`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Headcount by Department & Budget Distribution */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Staff Headcount by Department</CardTitle>
                            <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                                Human capital resource allocation
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y divide-[#ECECF0] overflow-hidden rounded-xl border border-[#ECECF0] dark:divide-[#28283E] dark:border-[#28283E]">
                                {departmentHeadcounts.map((d) => (
                                    <div
                                        key={d.department}
                                        className="flex items-center justify-between p-3 text-xs transition-colors hover:bg-slate-50/80 dark:hover:bg-[#181826]/70"
                                    >
                                        <span className="font-semibold text-[#191927] dark:text-white">{d.department}</span>
                                        <Badge variant="secondary" className="bg-[#ECECF0] text-[#191927] dark:bg-[#28283E] dark:text-slate-300">
                                            {d.count} Staff members
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Fiscal Budget Allocations</CardTitle>
                            <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                                Cap breakdown across functional business units
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y divide-[#ECECF0] overflow-hidden rounded-xl border border-[#ECECF0] dark:divide-[#28283E] dark:border-[#28283E]">
                                {budgetDistribution.map((b) => (
                                    <div
                                        key={b.department}
                                        className="flex items-center justify-between p-3 text-xs transition-colors hover:bg-slate-50/80 dark:hover:bg-[#181826]/70"
                                    >
                                        <span className="font-semibold text-[#191927] dark:text-white">{b.department}</span>
                                        <span className="font-mono text-[#777785] dark:text-slate-400">
                                            ${Number(b.spent_amount).toLocaleString()} of ${Number(b.allocated_amount).toLocaleString()}
                                        </span>
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
