import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Activity, CheckCircle2, Loader2, Radio, RefreshCw, XCircle } from 'lucide-react';
import { useState } from 'react';

interface ReverbData {
    is_running: boolean;
    app_id: string;
    app_key: string;
    server_host: string;
    server_port: number;
    host: string;
    port: number;
    scheme: string;
    vite_host: string;
    vite_port: number;
    vite_scheme: string;
    broadcast_driver: string;
    broadcast_queue: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
    { title: 'System', href: '/settings' },
    { title: 'WebSockets / Reverb', href: '/settings/system/reverb' },
];

export default function ReverbSettings({ reverb }: { reverb: ReverbData }) {
    const [isProbing, setIsProbing] = useState(false);
    const [probeResult, setProbeResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleProbeSocket = async () => {
        setIsProbing(true);
        setProbeResult(null);
        try {
            const res = await fetch(route('settings.system.reverb.test'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });
            const result = await res.json();
            setProbeResult(result);
        } catch (e: any) {
            setProbeResult({
                success: false,
                message: 'Failed to execute Reverb socket check: ' + (e.message || 'Network error'),
            });
        } finally {
            setIsProbing(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reverb WebSockets" />

            <SettingsLayout
                title="Laravel Reverb WebSockets"
                description="Live real-time collaboration status, dedicated priority queue routing, and TLS endpoint parameters"
            >
                <div className="space-y-6">
                    {/* Live Server Status Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#19192A]/60 p-5">
                        <div className="flex items-center gap-3.5">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#579bfc]/20 text-[#579bfc]">
                                <Radio className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-white">Reverb Server Process</h3>
                                    {reverb.is_running ? (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-[#00c875]/15 px-2 py-0.5 text-[10px] font-bold text-[#00c875]">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#00c875]" />
                                            ACTIVE
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                            STOPPED
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    Bound to {reverb.server_host}:{reverb.server_port} · Internal dispatch via {reverb.scheme}://{reverb.host}:{reverb.port}
                                </p>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleProbeSocket}
                            disabled={isProbing}
                            className="h-9 gap-1.5 rounded-xl border-white/10 bg-white/[0.04] px-4 text-xs font-medium text-slate-200 hover:bg-white/[0.08] hover:text-white"
                        >
                            {isProbing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 text-[#579bfc]" />}
                            <span>Ping Socket</span>
                        </Button>
                    </div>

                    {probeResult && (
                        <div
                            className={`flex items-start gap-3 rounded-xl border p-4 text-xs ${
                                probeResult.success
                                    ? 'border-[#00c875]/30 bg-[#00c875]/10 text-white'
                                    : 'border-red-500/30 bg-red-500/10 text-red-200'
                            }`}
                        >
                            {probeResult.success ? (
                                <CheckCircle2 className="h-4 w-4 text-[#00c875] shrink-0 mt-0.5" />
                            ) : (
                                <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                                <div className="font-bold">{probeResult.success ? 'Socket Probe Passed' : 'Socket Probe Failed'}</div>
                                <div className="mt-0.5">{probeResult.message}</div>
                            </div>
                        </div>
                    )}

                    {/* Architecture Specs */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/[0.08] bg-[#19192A]/40 p-5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Internal Transport (PHP to Reverb)</h4>
                            <dl className="space-y-2 text-xs">
                                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                                    <dt className="text-slate-400">Broadcast Connection</dt>
                                    <dd className="font-mono text-white font-semibold uppercase">{reverb.broadcast_driver}</dd>
                                </div>
                                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                                    <dt className="text-slate-400">Dedicated Priority Queue</dt>
                                    <dd className="font-mono text-[#00c875] font-semibold">{reverb.broadcast_queue}</dd>
                                </div>
                                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                                    <dt className="text-slate-400">Reverb App ID</dt>
                                    <dd className="font-mono text-white">{reverb.app_id}</dd>
                                </div>
                                <div className="flex justify-between py-1">
                                    <dt className="text-slate-400">Local Binding</dt>
                                    <dd className="font-mono text-white">{reverb.server_host}:{reverb.server_port}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className="rounded-xl border border-white/[0.08] bg-[#19192A]/40 p-5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Browser Client Endpoint (WSS / Vite)</h4>
                            <dl className="space-y-2 text-xs">
                                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                                    <dt className="text-slate-400">Reverse Proxy Endpoint</dt>
                                    <dd className="font-mono text-[#579bfc] font-semibold">{reverb.vite_scheme === 'https' ? 'wss' : 'ws'}://{reverb.vite_host}:{reverb.vite_port}</dd>
                                </div>
                                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                                    <dt className="text-slate-400">TLS Termination</dt>
                                    <dd className="text-white">EnvKit Trusted Local Certificate</dd>
                                </div>
                                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                                    <dt className="text-slate-400">Frontend Client Library</dt>
                                    <dd className="text-white">Laravel Echo / Pusher JS 8.x</dd>
                                </div>
                                <div className="flex justify-between py-1">
                                    <dt className="text-slate-400">App Key (Public)</dt>
                                    <dd className="font-mono text-slate-300 text-[11px] truncate max-w-[150px]">{reverb.app_key || 'Configured'}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
