import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Clock, Cpu, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface QueuesData {
    driver: string;
    realtime_queue: string;
    default_queue: string;
    jobs_pending: number;
    jobs_failed: number;
    recent_failed: Array<{
        id: number;
        queue: string;
        displayName: string;
        failed_at: string;
        error_snippet: string;
    }>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
    { title: 'System', href: '/settings' },
    { title: 'Background Jobs & Queues', href: '/settings/system/queues' },
];

export default function QueuesSettings({ queues }: { queues: QueuesData }) {
    const [retrying, setRetrying] = useState(false);
    const [clearing, setClearing] = useState(false);

    const handleRetryAll = () => {
        setRetrying(true);
        router.post(route('settings.system.queues.retry'), {}, {
            preserveScroll: true,
            onFinish: () => setRetrying(false),
        });
    };

    const handleClearAll = () => {
        if (!confirm('Are you sure you want to discard all failed background jobs?')) {
            return;
        }
        setClearing(true);
        router.post(route('settings.system.queues.clear'), {}, {
            preserveScroll: true,
            onFinish: () => setClearing(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Background Jobs & Queues" />

            <SettingsLayout
                title="Background Jobs & Queue Health"
                description="Monitor queue workers, real-time broadcast prioritization, pending payloads, and failed job exceptions"
            >
                <div className="space-y-6">
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/[0.08] bg-[#19192A]/60 p-4">
                            <div className="flex items-center gap-2 text-slate-400 text-xs">
                                <Cpu className="h-4 w-4 text-[#579bfc]" />
                                <span>Queue Worker Architecture</span>
                            </div>
                            <div className="mt-2 text-lg font-bold text-white capitalize">{queues.driver} Driver</div>
                            <div className="mt-1 text-[11px] text-slate-400">
                                Priority worker: <span className="font-mono text-[#00c875] font-semibold">{queues.realtime_queue}</span>, {queues.default_queue}
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/[0.08] bg-[#19192A]/60 p-4">
                            <div className="flex items-center gap-2 text-slate-400 text-xs">
                                <Clock className="h-4 w-4 text-[#D8F779]" />
                                <span>Pending Jobs</span>
                            </div>
                            <div className="mt-2 text-lg font-bold text-white">{queues.jobs_pending} Pending</div>
                            <div className="mt-1 text-[11px] text-slate-400">Jobs waiting in queue worker pipeline</div>
                        </div>

                        <div className="rounded-xl border border-white/[0.08] bg-[#19192A]/60 p-4">
                            <div className="flex items-center gap-2 text-slate-400 text-xs">
                                <AlertTriangle className="h-4 w-4 text-rose-400" />
                                <span>Failed Jobs</span>
                            </div>
                            <div className="mt-2 text-lg font-bold text-white">{queues.jobs_failed} Failed</div>
                            <div className="mt-1 text-[11px] text-slate-400">Recorded in failed_jobs table</div>
                        </div>
                    </div>

                    {/* Failed Jobs Action Toolbar */}
                    <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#19192A]/40 p-4">
                        <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Failed Jobs Management</h4>
                            <p className="mt-0.5 text-xs text-slate-400">Retry all failed jobs or flush them from the database</p>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleRetryAll}
                                disabled={retrying || queues.jobs_failed === 0}
                                className="h-8 gap-1.5 rounded-lg border-white/10 bg-white/[0.04] px-3 text-xs text-slate-200 hover:bg-white/[0.08] hover:text-white"
                            >
                                {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 text-[#579bfc]" />}
                                <span>Retry All Failed</span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClearAll}
                                disabled={clearing || queues.jobs_failed === 0}
                                className="h-8 gap-1.5 rounded-lg border-rose-500/20 bg-rose-500/10 px-3 text-xs text-rose-300 hover:bg-rose-500/20"
                            >
                                {clearing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                <span>Clear Failed</span>
                            </Button>
                        </div>
                    </div>

                    {/* Recent Failed Jobs Table */}
                    <div className="rounded-xl border border-white/[0.08] bg-[#19192A]/40 p-5">
                        <div className="mb-4 border-b border-white/[0.06] pb-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Recent Failed Jobs</h3>
                            <p className="mt-0.5 text-xs text-slate-400">Detailed exception stack traces for troubleshooting</p>
                        </div>

                        {queues.recent_failed.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-slate-400">
                                <CheckCircle2 className="h-8 w-8 text-[#00c875] mb-2" />
                                <span className="font-semibold text-white">Zero Failed Jobs</span>
                                <span className="mt-0.5 text-slate-400">All background jobs processed cleanly</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-300">
                                    <thead>
                                        <tr className="border-b border-white/[0.08] text-[10px] font-bold uppercase text-slate-400">
                                            <th className="py-2.5 px-3">Job Name</th>
                                            <th className="py-2.5 px-3">Queue</th>
                                            <th className="py-2.5 px-3">Failed At</th>
                                            <th className="py-2.5 px-3">Exception Excerpt</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {queues.recent_failed.map((job) => (
                                            <tr key={job.id} className="hover:bg-white/[0.02]">
                                                <td className="py-2.5 px-3 font-semibold text-white">{job.displayName}</td>
                                                <td className="py-2.5 px-3">
                                                    <span className="rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-slate-300">
                                                        {job.queue}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">{job.failed_at}</td>
                                                <td className="py-2.5 px-3 font-mono text-[10px] text-rose-300">{job.error_snippet}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
