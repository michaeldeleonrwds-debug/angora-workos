import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { Check, CheckCircle2, Database, HardDrive, Loader2, PlayCircle, XCircle } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface StorageData {
    filesystem_disk: string;
    aws_access_key_id: string;
    has_secret: boolean;
    aws_default_region: string;
    aws_bucket: string;
    aws_endpoint: string;
    aws_url: string;
    aws_use_path_style: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
    { title: 'System', href: '/settings' },
    { title: 'Storage / S3', href: '/settings/system/storage' },
];

export default function StorageSettings({ storage }: { storage: StorageData }) {
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        filesystem_disk: storage?.filesystem_disk || 'local',
        aws_access_key_id: storage?.aws_access_key_id || '',
        aws_secret_access_key: storage?.has_secret ? '••••••••' : '',
        aws_default_region: storage?.aws_default_region || 'auto',
        aws_bucket: storage?.aws_bucket || '',
        aws_endpoint: storage?.aws_endpoint || '',
        aws_url: storage?.aws_url || '',
        aws_use_path_style: storage?.aws_use_path_style ?? false,
    });

    const [testingStorage, setTestingStorage] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('settings.system.storage.update'), {
            preserveScroll: true,
        });
    };

    const handleTestStorage = async () => {
        setTestingStorage(true);
        setTestResult(null);
        try {
            const res = await fetch(route('settings.system.storage.test'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });
            const result = await res.json();
            setTestResult(result);
        } catch (e: any) {
            setTestResult({
                success: false,
                message: 'Error executing storage diagnostic check: ' + (e.message || 'Network error'),
            });
        } finally {
            setTestingStorage(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Storage / S3 Settings" />

            <SettingsLayout
                title="Cloudflare R2 & S3 Storage"
                description="Configure S3-compatible object storage for production deliverables, task attachments, and media library assets"
            >
                <div className="space-y-6">
                    <form onSubmit={submit} className="space-y-6">
                        <div className="rounded-xl border border-white/[0.08] bg-[#19192A]/40 p-5">
                            <div className="mb-5 flex items-center justify-between border-b border-white/[0.06] pb-3">
                                <div className="flex items-center gap-2">
                                    <Database className="h-4 w-4 text-[#D8F779]" />
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">Default Storage Driver</h3>
                                </div>
                                <span className="text-[11px] font-mono text-slate-400">FILESYSTEM_DISK</span>
                            </div>

                            <div className="max-w-xl space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="filesystem_disk" className="text-xs font-semibold text-slate-300">
                                        Active Storage Disk
                                    </Label>
                                    <select
                                        id="filesystem_disk"
                                        value={data.filesystem_disk}
                                        onChange={(e) => setData('filesystem_disk', e.target.value)}
                                        className="h-10 w-full rounded-xl border border-white/10 bg-[#19192A] px-3 text-xs text-white focus:border-[#0073ea] focus:ring-[#0073ea]"
                                    >
                                        <option value="local">local (Storage private disk)</option>
                                        <option value="public">public (Public symlink storage)</option>
                                        <option value="s3">s3 (Cloudflare R2 / AWS S3 Compatible)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* S3 / R2 Parameters */}
                        <div className="rounded-xl border border-white/[0.08] bg-[#19192A]/40 p-5">
                            <div className="mb-5 border-b border-white/[0.06] pb-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-white">S3 / Cloudflare R2 Credentials</h3>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    Compatible with AWS S3, Cloudflare R2, MinIO, Wasabi, or DigitalOcean Spaces
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl">
                                <div className="space-y-1.5">
                                    <Label htmlFor="aws_bucket" className="text-xs font-semibold text-slate-300">
                                        Bucket Name
                                    </Label>
                                    <Input
                                        id="aws_bucket"
                                        value={data.aws_bucket}
                                        onChange={(e) => setData('aws_bucket', e.target.value)}
                                        className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                        placeholder="e.g. angora-production-assets"
                                    />
                                    <InputError className="text-xs text-red-400" message={errors.aws_bucket} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="aws_default_region" className="text-xs font-semibold text-slate-300">
                                        Region
                                    </Label>
                                    <Input
                                        id="aws_default_region"
                                        value={data.aws_default_region}
                                        onChange={(e) => setData('aws_default_region', e.target.value)}
                                        className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                        placeholder="auto (for R2) or us-east-1"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="aws_access_key_id" className="text-xs font-semibold text-slate-300">
                                        Access Key ID
                                    </Label>
                                    <Input
                                        id="aws_access_key_id"
                                        value={data.aws_access_key_id}
                                        onChange={(e) => setData('aws_access_key_id', e.target.value)}
                                        className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                        placeholder="Access Key"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="aws_secret_access_key" className="text-xs font-semibold text-slate-300">
                                        Secret Access Key
                                    </Label>
                                    <Input
                                        id="aws_secret_access_key"
                                        type="password"
                                        value={data.aws_secret_access_key}
                                        onChange={(e) => setData('aws_secret_access_key', e.target.value)}
                                        className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                        placeholder={storage?.has_secret ? 'Leave unchanged or type new' : 'Secret Key'}
                                    />
                                </div>

                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="aws_endpoint" className="text-xs font-semibold text-slate-300">
                                        Custom Endpoint (Cloudflare R2 / MinIO)
                                    </Label>
                                    <Input
                                        id="aws_endpoint"
                                        value={data.aws_endpoint}
                                        onChange={(e) => setData('aws_endpoint', e.target.value)}
                                        className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                        placeholder="https://<accountid>.r2.cloudflarestorage.com"
                                    />
                                </div>

                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="aws_url" className="text-xs font-semibold text-slate-300">
                                        Public CDN / Delivery URL (Optional)
                                    </Label>
                                    <Input
                                        id="aws_url"
                                        value={data.aws_url}
                                        onChange={(e) => setData('aws_url', e.target.value)}
                                        className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                        placeholder="https://cdn.angora.example.com"
                                    />
                                </div>

                                <div className="sm:col-span-2 pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.aws_use_path_style}
                                            onChange={(e) => setData('aws_use_path_style', e.target.checked)}
                                            className="h-4 w-4 rounded border-white/20 bg-[#1E1E30] text-[#0073ea] focus:ring-[#0073ea]"
                                        />
                                        <span className="text-xs text-slate-300">
                                            Use Path-Style Endpoint (Required for MinIO / self-hosted S3)
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Test Probe Output */}
                        {testResult && (
                            <div
                                className={`flex items-start gap-3 rounded-xl border p-4 text-xs ${
                                    testResult.success
                                        ? 'border-[#00c875]/30 bg-[#00c875]/10 text-white'
                                        : 'border-red-500/30 bg-red-500/10 text-red-200'
                                }`}
                            >
                                {testResult.success ? (
                                    <CheckCircle2 className="h-4 w-4 text-[#00c875] shrink-0 mt-0.5" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <div className="font-bold">{testResult.success ? 'Storage Probe Verified' : 'Storage Probe Failed'}</div>
                                    <div className="mt-0.5">{testResult.message}</div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                type="submit"
                                disabled={processing}
                                className="h-9 gap-1.5 rounded-xl bg-[#0073ea] px-5 text-xs font-semibold text-white hover:bg-[#0060c0]"
                            >
                                {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>Save Storage Settings</span>}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleTestStorage}
                                disabled={testingStorage}
                                className="h-9 gap-1.5 rounded-xl border-white/10 bg-white/[0.04] px-4 text-xs font-medium text-slate-200 hover:bg-white/[0.08] hover:text-white"
                            >
                                {testingStorage ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D8F779]" />
                                        <span>Probing Disk...</span>
                                    </>
                                ) : (
                                    <>
                                        <HardDrive className="h-3.5 w-3.5 text-[#D8F779]" />
                                        <span>Test Storage Probe</span>
                                    </>
                                )}
                            </Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out duration-300"
                                enterFrom="opacity-0 translate-y-1"
                                enterTo="opacity-100 translate-y-0"
                                leave="transition ease-in-out duration-300"
                                leaveFrom="opacity-100 translate-y-0"
                                leaveTo="opacity-0 translate-y-1"
                            >
                                <div className="flex items-center gap-1.5 rounded-lg border border-[#00c875]/20 bg-[#00c875]/10 px-3 py-1 text-xs font-medium text-[#00c875]">
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Storage parameters saved</span>
                                </div>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
