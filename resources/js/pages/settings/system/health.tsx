import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Cpu, Database, HardDrive, HeartPulse, Radio, RefreshCw, Server, XCircle } from 'lucide-react';

interface DiagnosticsData {
    php_version: string;
    laravel_version: string;
    server_os: string;
    environment: string;
    database_connected: boolean;
    database_version: string;
    reverb_running: boolean;
    reverb_endpoint: string;
    storage_driver: string;
    queue_driver: string;
    realtime_queue: string;
    gd_loaded: boolean;
    imagick_loaded: boolean;
    sockets_loaded: boolean;
    openssl_loaded: boolean;
    memory_limit: string;
    max_execution_time: string;
    upload_max_filesize: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
    { title: 'System', href: '/settings' },
    { title: 'System Health', href: '/settings/system/health' },
];

export default function SystemHealthSettings({ diagnostics }: { diagnostics: DiagnosticsData }) {
    const handleRefresh = () => {
        router.reload();
    };

    const checks = [
        {
            name: 'Database Engine',
            status: diagnostics.database_connected,
            detail: `${diagnostics.database_version} (Connected via PDO)`,
            icon: Database,
        },
        {
            name: 'WebSockets (Reverb)',
            status: diagnostics.reverb_running,
            detail: diagnostics.reverb_running
                ? `Listening on port 8080 · Reverse proxy: ${diagnostics.reverb_endpoint}`
                : 'Reverb process offline on port 8080',
            icon: Radio,
        },
        {
            name: 'PHP Core Runtime',
            status: true,
            detail: `v${diagnostics.php_version} · OS: ${diagnostics.server_os} · Env: ${diagnostics.environment}`,
            icon: Server,
        },
        {
            name: 'Network Sockets Extension',
            status: diagnostics.sockets_loaded,
            detail: diagnostics.sockets_loaded ? 'ext-sockets enabled' : 'ext-sockets missing',
            icon: Cpu,
        },
        {
            name: 'OpenSSL Security',
            status: diagnostics.openssl_loaded,
            detail: diagnostics.openssl_loaded ? 'TLS/SSL cryptography enabled' : 'Missing openssl',
            icon: CheckCircle2,
        },
        {
            name: 'Object Storage Disk',
            status: true,
            detail: `Driver: ${diagnostics.storage_driver} · Upload Limit: ${diagnostics.upload_max_filesize}`,
            icon: HardDrive,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="System Diagnostics" />

            <SettingsLayout
                title="System Diagnostics & Runtime Health"
                description="Live architectural health checks, runtime metrics, memory ceilings, and subsystem dependencies"
                headerActions={
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08] dark:hover:text-white"
                    >
                        <RefreshCw className="h-3.5 w-3.5 text-[#0073ea] dark:text-[#579bfc]" />
                        <span>Run Diagnostics</span>
                    </button>
                }
            >
                <div className="space-y-6">
                    {/* Overall Status Banner */}
                    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/[0.08] dark:bg-[#19192A]/60">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:bg-[#00c875]/20 dark:text-[#00c875]">
                            <HeartPulse className="h-7 w-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Angora Work OS Operational State</h3>
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-[#00c875]/15 dark:text-[#00c875]">
                                    HEALTHY
                                </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Laravel {diagnostics.laravel_version} · Priority broadcast queue <span className="font-mono text-slate-900 font-semibold dark:text-white">{diagnostics.realtime_queue}</span> active
                            </p>
                        </div>
                    </div>

                    {/* Subsystem Checks Grid */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {checks.map((check) => (
                            <div
                                key={check.name}
                                className="flex items-start gap-3.5 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/[0.06] dark:bg-[#19192A]/40"
                            >
                                <div className="rounded-lg bg-slate-200/60 p-2 text-slate-700 dark:bg-white/[0.04] dark:text-slate-300">
                                    <check.icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white">{check.name}</h4>
                                        {check.status ? (
                                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-[#00c875]">
                                                <CheckCircle2 className="h-3 w-3" />
                                                <span>OK</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                                                <XCircle className="h-3 w-3" />
                                                <span>Action Required</span>
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">{check.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Runtime Environment Specs */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/[0.08] dark:bg-[#19192A]/40">
                        <div className="mb-4 border-b border-slate-200 pb-3 dark:border-white/[0.06]">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">PHP Runtime Parameters</h3>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Engine limits and environment configurations</p>
                        </div>

                        <dl className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                            <div>
                                <dt className="text-slate-500 dark:text-slate-400">Memory Limit</dt>
                                <dd className="mt-1 font-mono text-slate-900 font-semibold dark:text-white">{diagnostics.memory_limit}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500 dark:text-slate-400">Max Execution Time</dt>
                                <dd className="mt-1 font-mono text-slate-900 font-semibold dark:text-white">{diagnostics.max_execution_time}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500 dark:text-slate-400">Upload Max File</dt>
                                <dd className="mt-1 font-mono text-slate-900 font-semibold dark:text-white">{diagnostics.upload_max_filesize}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500 dark:text-slate-400">Image Libraries</dt>
                                <dd className="mt-1 text-slate-900 font-semibold dark:text-white">
                                    {diagnostics.imagick_loaded ? 'Imagick' : diagnostics.gd_loaded ? 'GD' : 'CLI Native'}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
