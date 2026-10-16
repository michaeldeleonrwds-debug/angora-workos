import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { FormEventHandler } from 'react';

interface BrandingData {
    app_name: string;
    tagline?: string;
    primary_color: string;
    logo_url?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
    { title: 'Branding', href: '/settings/branding' },
];

export default function BrandingSettings({ branding }: { branding: BrandingData }) {
    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        app_name: branding?.app_name || 'Angora Work OS',
        tagline: branding?.tagline || 'Next-Generation Agency Operating System',
        primary_color: branding?.primary_color || '#0073ea',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('settings.branding.update'), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Branding Settings" />

            <SettingsLayout
                title="Branding & Identity"
                description="Manage system title, brand accent colors, and custom organization typography"
            >
                <form onSubmit={submit} className="space-y-6">
                    <div className="rounded-xl border border-white/[0.08] bg-[#19192A]/40 p-5">
                        <div className="mb-5 flex items-center gap-2 border-b border-white/[0.06] pb-3">
                            <Sparkles className="h-4 w-4 text-[#D8F779]" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Brand Metadata</h3>
                        </div>

                        <div className="space-y-4 max-w-xl">
                            <div className="space-y-1.5">
                                <Label htmlFor="app_name" className="text-xs font-semibold text-slate-300">
                                    Application Name
                                </Label>
                                <Input
                                    id="app_name"
                                    value={data.app_name}
                                    onChange={(e) => setData('app_name', e.target.value)}
                                    required
                                    className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                    placeholder="e.g. Angora Work OS"
                                />
                                <InputError className="text-xs text-red-400" message={errors.app_name} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="tagline" className="text-xs font-semibold text-slate-300">
                                    Tagline
                                </Label>
                                <Input
                                    id="tagline"
                                    value={data.tagline}
                                    onChange={(e) => setData('tagline', e.target.value)}
                                    className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                    placeholder="e.g. Next-Generation Agency Operating System"
                                />
                                <InputError className="text-xs text-red-400" message={errors.tagline} />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-300">Primary Brand Accent</Label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={data.primary_color}
                                        onChange={(e) => setData('primary_color', e.target.value)}
                                        className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
                                    />
                                    <Input
                                        value={data.primary_color}
                                        onChange={(e) => setData('primary_color', e.target.value)}
                                        className="h-9 w-32 rounded-xl border-white/10 bg-[#19192A] text-xs font-mono text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            type="submit"
                            disabled={processing}
                            className="h-9 gap-1.5 rounded-xl bg-[#0073ea] px-5 text-xs font-semibold text-white hover:bg-[#0060c0]"
                        >
                            {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>Save Branding</span>}
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
                                <span>Branding parameters saved</span>
                            </div>
                        </Transition>
                    </div>
                </form>
            </SettingsLayout>
        </AppLayout>
    );
}
