import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { AlertCircle, Check, CheckCircle2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { FormEventHandler } from 'react';

interface OptimizationData {
    enabled: boolean;
    max_width: number;
    max_height: number;
    quality: number;
    generate_webp: boolean;
    gd_available: boolean;
    imagick_available: boolean;
    queue_name: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
    { title: 'System', href: '/settings' },
    { title: 'Image Optimization', href: '/settings/system/optimization' },
];

export default function OptimizationSettings({ optimization }: { optimization: OptimizationData }) {
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        enabled: optimization?.enabled ?? true,
        max_width: optimization?.max_width || 1920,
        max_height: optimization?.max_height || 1080,
        quality: optimization?.quality || 80,
        generate_webp: optimization?.generate_webp ?? true,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('settings.system.optimization.update'), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Image Optimization Settings" />

            <SettingsLayout
                title="Image Optimization & Compression"
                description="Background image processing pipeline, dimension bounds, WebP generation, and graphic driver availability"
            >
                <div className="space-y-6">
                    {/* Driver Status Banner */}
                    {/* Driver Status Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/[0.08] dark:bg-[#19192A]/60">
                        <div className="flex items-center gap-3.5">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:bg-[#00c875]/20 dark:text-[#00c875]">
                                <ImageIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Graphic Driver Pipeline</h3>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    Intervention Image v3 · Worker queue: <span className="font-mono text-slate-900 font-semibold dark:text-white">{optimization.queue_name}</span> (Isolated from real-time broadcasts)
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                                {optimization.gd_available || optimization.imagick_available ? (
                                    <>
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-[#00c875]" />
                                        <span>{optimization.imagick_available ? 'Imagick Active' : 'GD Active'}</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                        <span>GD/Imagick Extension Optional</span>
                                    </>
                                )}
                            </span>
                        </div>
                    </div>

                    <form onSubmit={submit} className="space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/[0.08] dark:bg-[#19192A]/40">
                            <div className="mb-5 border-b border-slate-200 pb-3 dark:border-white/[0.06]">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Compression Parameters</h3>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    Resize and compress uploaded image attachments asynchronously to preserve storage and bandwidth
                                </p>
                            </div>

                            <div className="space-y-5 max-w-xl">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.enabled}
                                        onChange={(e) => setData('enabled', e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 bg-white text-[#0073ea] focus:ring-[#0073ea] dark:border-white/20 dark:bg-[#1E1E30]"
                                    />
                                    <div>
                                        <span className="text-xs font-semibold text-slate-900 dark:text-white">Enable Automatic Background Optimization</span>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Dispatches OptimizeImageJob to the default background queue</p>
                                    </div>
                                </label>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="max_width" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Max Width (px)
                                        </Label>
                                        <Input
                                            id="max_width"
                                            type="number"
                                            value={data.max_width}
                                            onChange={(e) => setData('max_width', parseInt(e.target.value) || 1920)}
                                            className="h-10 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder-slate-400 focus:border-[#0073ea] focus:ring-[#0073ea] dark:border-white/10 dark:bg-[#19192A] dark:text-white dark:placeholder-slate-500"
                                        />
                                        <InputError className="text-xs text-red-500 dark:text-red-400" message={errors.max_width} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="max_height" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Max Height (px)
                                        </Label>
                                        <Input
                                            id="max_height"
                                            type="number"
                                            value={data.max_height}
                                            onChange={(e) => setData('max_height', parseInt(e.target.value) || 1080)}
                                            className="h-10 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder-slate-400 focus:border-[#0073ea] focus:ring-[#0073ea] dark:border-white/10 dark:bg-[#19192A] dark:text-white dark:placeholder-slate-500"
                                        />
                                        <InputError className="text-xs text-red-500 dark:text-red-400" message={errors.max_height} />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between">
                                        <Label htmlFor="quality" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            JPEG / WebP Quality (%)
                                        </Label>
                                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{data.quality}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="40"
                                        max="100"
                                        step="5"
                                        value={data.quality}
                                        onChange={(e) => setData('quality', parseInt(e.target.value) || 80)}
                                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-emerald-600 dark:bg-white/20 dark:accent-[#00c875]"
                                    />
                                </div>

                                <label className="flex items-center gap-3 cursor-pointer pt-2">
                                    <input
                                        type="checkbox"
                                        checked={data.generate_webp}
                                        onChange={(e) => setData('generate_webp', e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 bg-white text-[#0073ea] focus:ring-[#0073ea] dark:border-white/20 dark:bg-[#1E1E30]"
                                    />
                                    <div>
                                        <span className="text-xs font-semibold text-slate-900 dark:text-white">Generate WebP Next-Gen Formats</span>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Stores WebP variants alongside original files for faster page loads</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                type="submit"
                                disabled={processing}
                                className="h-9 gap-1.5 rounded-xl bg-[#0073ea] px-5 text-xs font-semibold text-white hover:bg-[#0060c0]"
                            >
                                {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>Save Optimization Settings</span>}
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
                                    <span>Optimization settings saved</span>
                                </div>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
