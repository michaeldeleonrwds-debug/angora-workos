import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowRight,
    Bell,
    Briefcase,
    CheckCircle2,
    Cpu,
    Database,
    FileText,
    FolderArchive,
    HeartPulse,
    Image as ImageIcon,
    Lock,
    Mail,
    Palette,
    Puzzle,
    Radio,
    Shield,
    Sparkles,
    User,
    XCircle,
} from 'lucide-react';

interface SettingsIndexProps {
    activeWorkspace?: {
        id: number;
        name: string;
        description?: string;
        color?: string;
        icon?: string;
    } | null;
    systemStatus?: {
        reverb_running: boolean;
        reverb_host: string;
        storage_disk: string;
        storage_bucket: string;
        mail_configured: boolean;
        mail_driver: string;
        jobs_pending: number;
        jobs_failed: number;
        realtime_queue: string;
        php_version: string;
        gd_available: boolean;
        imagick_available: boolean;
    } | null;
    canManageSystem: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Settings',
        href: '/settings',
    },
];

export default function SettingsIndex({ activeWorkspace, systemStatus, canManageSystem }: SettingsIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Settings Center" />

            <SettingsLayout
                title="Settings Center"
                description="Manage your account profile, workspace parameters, and system infrastructure"
            >
                <div className="space-y-8">
                    {/* Live System Quick Status (Only for Super Admin) */}
                    {canManageSystem && systemStatus && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-[#19192A]/70">
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-white/[0.06]">
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-[#0073ea] dark:text-[#579BFC]" />
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                        Infrastructure Pulse
                                    </h3>
                                </div>
                                <Link
                                    href="/settings/system/health"
                                    className="flex items-center gap-1 text-xs text-[#0073ea] hover:underline dark:text-[#579BFC]"
                                >
                                    <span>Diagnostics</span>
                                    <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">WebSockets (Reverb)</div>
                                    <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                                        {systemStatus.reverb_running ? (
                                            <>
                                                <span className="h-2 w-2 rounded-full bg-[#00c875]" />
                                                <span>Listening (8080)</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                                <span className="text-red-600 dark:text-red-400">Offline</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Object Storage</div>
                                    <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white truncate">
                                        <Database className="h-3 w-3 text-amber-500 dark:text-[#D8F779]" />
                                        <span className="truncate uppercase">{systemStatus.storage_disk}</span>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Queue & Realtime</div>
                                    <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                                        <Cpu className="h-3 w-3 text-purple-600 dark:text-[#A25DDC]" />
                                        <span>
                                            {systemStatus.jobs_pending} queued / {systemStatus.jobs_failed} failed
                                        </span>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Email Gateway</div>
                                    <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                                        <Mail className="h-3 w-3 text-orange-500 dark:text-[#fdab3d]" />
                                        <span className="capitalize">{systemStatus.mail_driver}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section: Personal Settings */}
                    <div>
                        <div className="mb-3">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">Personal Settings</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Account identity, credentials, appearance, and alerts</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Link
                                href="/settings/profile"
                                className="group flex items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                            >
                                <div className="rounded-lg bg-[#0073ea]/15 p-2 text-[#0073ea] dark:bg-[#0073ea]/20 dark:text-[#579bfc]">
                                    <User className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-semibold text-slate-900 group-hover:text-[#0073ea] dark:text-white dark:group-hover:text-[#579bfc]">Profile Details</h3>
                                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-900 dark:text-slate-500 dark:group-hover:text-white" />
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Update avatar photo, display name, and primary email</p>
                                </div>
                            </Link>

                            <Link
                                href="/settings/password"
                                className="group flex items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                            >
                                <div className="rounded-lg bg-purple-500/15 p-2 text-purple-600 dark:bg-[#a25ddc]/20 dark:text-[#a25ddc]">
                                    <Lock className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-semibold text-slate-900 group-hover:text-purple-600 dark:text-white dark:group-hover:text-[#a25ddc]">Password & Security</h3>
                                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-900 dark:text-slate-500 dark:group-hover:text-white" />
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Change account password and review authentication credentials</p>
                                </div>
                            </Link>

                            <Link
                                href="/settings/appearance"
                                className="group flex items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                            >
                                <div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-600 dark:bg-[#00c875]/20 dark:text-[#00c875]">
                                    <Palette className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-semibold text-slate-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-[#00c875]">Appearance</h3>
                                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-900 dark:text-slate-500 dark:group-hover:text-white" />
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Theme mode, light/dark contrast, and interface styling</p>
                                </div>
                            </Link>

                            <Link
                                href="/settings/notifications"
                                className="group flex items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                            >
                                <div className="rounded-lg bg-amber-500/15 p-2 text-amber-600 dark:bg-[#fdab3d]/20 dark:text-[#fdab3d]">
                                    <Bell className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-semibold text-slate-900 group-hover:text-amber-600 dark:text-white dark:group-hover:text-[#fdab3d]">Notifications</h3>
                                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-900 dark:text-slate-500 dark:group-hover:text-white" />
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Email delivery channels, mention alerts, and in-app sound triggers</p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Section: Workspace Settings */}
                    <div>
                        <div className="mb-3">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">Workspace Settings</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Workspace identity, organizational branding, and defaults</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Link
                                href="/settings/workspace"
                                className="group flex items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                            >
                                <div className="rounded-lg bg-[#0073ea]/15 p-2 text-[#0073ea] dark:bg-[#0073ea]/20 dark:text-[#579bfc]">
                                    <Briefcase className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-semibold text-slate-900 group-hover:text-[#0073ea] dark:text-white dark:group-hover:text-[#579bfc]">General Workspace</h3>
                                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-900 dark:text-slate-500 dark:group-hover:text-white" />
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                        {activeWorkspace ? `Current: ${activeWorkspace.name}` : 'Configure default workspace properties'}
                                    </p>
                                </div>
                            </Link>

                            <Link
                                href="/settings/branding"
                                className="group flex items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                            >
                                <div className="rounded-lg bg-lime-500/15 p-2 text-lime-600 dark:bg-[#D8F779]/20 dark:text-[#D8F779]">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-semibold text-slate-900 group-hover:text-lime-600 dark:text-white dark:group-hover:text-[#D8F779]">Branding</h3>
                                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-900 dark:text-slate-500 dark:group-hover:text-white" />
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Application title, primary brand theme, and logos</p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Section: System Infrastructure (Super Admin only) */}
                    {canManageSystem && (
                        <div>
                            <div className="mb-3">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">System Infrastructure</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Backend transports, queues, object storage, and real-time collaboration</p>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <Link
                                    href="/settings/system/smtp"
                                    className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                                >
                                    <Mail className="h-4 w-4 text-orange-500 dark:text-[#fdab3d] shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-xs font-semibold text-slate-900 group-hover:text-orange-500 dark:text-white dark:group-hover:text-[#fdab3d]">Email / SMTP</h3>
                                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Host, ports, TLS encryption & delivery probe</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/settings/system/storage"
                                    className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                                >
                                    <Database className="h-4 w-4 text-amber-500 dark:text-[#D8F779] shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-xs font-semibold text-slate-900 group-hover:text-amber-500 dark:text-white dark:group-hover:text-[#D8F779]">Storage / S3</h3>
                                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Cloudflare R2 / S3 credentials & bucket probe</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/settings/system/reverb"
                                    className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                                >
                                    <Radio className="h-4 w-4 text-[#0073ea] dark:text-[#579bfc] shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-xs font-semibold text-slate-900 group-hover:text-[#0073ea] dark:text-white dark:group-hover:text-[#579bfc]">WebSockets / Reverb</h3>
                                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Server ports, public WSS endpoint & socket ping</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/settings/system/optimization"
                                    className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                                >
                                    <ImageIcon className="h-4 w-4 text-emerald-600 dark:text-[#00c875] shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-xs font-semibold text-slate-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-[#00c875]">Image Optimization</h3>
                                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">GD/Imagick status, WebP & compression limits</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/settings/system/queues"
                                    className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                                >
                                    <Cpu className="h-4 w-4 text-purple-600 dark:text-[#a25ddc] shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-xs font-semibold text-slate-900 group-hover:text-purple-600 dark:text-white dark:group-hover:text-[#a25ddc]">Background Queues</h3>
                                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Realtime vs default queues & failed job retry</p>
                                    </div>
                                </Link>

                                <Link
                                    href="/settings/system/health"
                                    className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                                >
                                    <HeartPulse className="h-4 w-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-xs font-semibold text-slate-900 group-hover:text-rose-500 dark:text-white dark:group-hover:text-rose-400">System Diagnostics</h3>
                                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Live health metrics, runtime specs & memory</p>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Section: Data & Governance */}
                    <div>
                        <div className="mb-3">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">Data & Security</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Access policies, asset management, audit trails, and third-party tools</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                            <Link
                                href="/settings/data/files"
                                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                            >
                                <FolderArchive className="h-5 w-5 text-[#0073ea] dark:text-[#579bfc]" />
                                <div className="mt-4">
                                    <h3 className="text-xs font-semibold text-slate-900 group-hover:text-[#0073ea] dark:text-white dark:group-hover:text-[#579bfc]">File Manager</h3>
                                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Centralized media library</p>
                                </div>
                            </Link>

                            <Link
                                href="/settings/data/audit-logs"
                                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                            >
                                <FileText className="h-5 w-5 text-purple-600 dark:text-[#a25ddc]" />
                                <div className="mt-4">
                                    <h3 className="text-xs font-semibold text-slate-900 group-hover:text-purple-600 dark:text-white dark:group-hover:text-[#a25ddc]">Audit Logs</h3>
                                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Immutable security events</p>
                                </div>
                            </Link>

                            <Link
                                href="/settings/data/security"
                                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                            >
                                <Shield className="h-5 w-5 text-emerald-600 dark:text-[#00c875]" />
                                <div className="mt-4">
                                    <h3 className="text-xs font-semibold text-slate-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-[#00c875]">Security Policies</h3>
                                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Session limits & login rules</p>
                                </div>
                            </Link>

                            <Link
                                href="/settings/data/integrations"
                                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                            >
                                <Puzzle className="h-5 w-5 text-amber-600 dark:text-[#fdab3d]" />
                                <div className="mt-4">
                                    <h3 className="text-xs font-semibold text-slate-900 group-hover:text-amber-600 dark:text-white dark:group-hover:text-[#fdab3d]">Integrations</h3>
                                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">External API connectors</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
