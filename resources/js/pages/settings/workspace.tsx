import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { Briefcase, Check, Loader2 } from 'lucide-react';
import { FormEventHandler } from 'react';

interface WorkspaceData {
    id: number;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    created_at?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
    { title: 'Workspace Settings', href: '/settings/workspace' },
];

export default function WorkspaceSettings({ workspace }: { workspace: WorkspaceData | null }) {
    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        workspace_id: workspace?.id ?? 0,
        name: workspace?.name ?? '',
        description: workspace?.description ?? '',
        color: workspace?.color ?? '#0073ea',
        icon: workspace?.icon ?? 'layout-grid',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('settings.workspace.update'), {
            preserveScroll: true,
        });
    };

    if (!workspace) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <SettingsLayout title="Workspace Settings" description="No active workspace found">
                    <div className="p-8 text-center text-sm text-slate-400">
                        Please select an active workspace from the left sidebar to manage its configuration.
                    </div>
                </SettingsLayout>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Workspace Settings" />

            <SettingsLayout
                title="Workspace Settings"
                description="Configure the primary workspace identity, operational metadata, and color themes"
            >
                <div className="space-y-6">
                    <form onSubmit={submit} className="space-y-5">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/[0.08] dark:bg-[#19192A]/40">
                            <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/[0.06]">
                                <div className="flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-[#0073ea] dark:text-[#579bfc]" />
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">General Parameters</h3>
                                </div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">Created {workspace.created_at}</span>
                            </div>

                            <div className="space-y-4 max-w-xl">
                                <div className="space-y-1.5">
                                    <Label htmlFor="workspace_name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Workspace Name
                                    </Label>
                                    <Input
                                        id="workspace_name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        required
                                        className="h-10 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder-slate-400 focus:border-[#0073ea] focus:ring-[#0073ea] dark:border-white/10 dark:bg-[#19192A] dark:text-white dark:placeholder-slate-500"
                                        placeholder="e.g. Main Agency Workspace"
                                    />
                                    <InputError className="text-xs text-red-500 dark:text-red-400" message={errors.name} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="description" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Description
                                    </Label>
                                    <textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows={3}
                                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0073ea] focus:ring-[#0073ea] dark:border-white/10 dark:bg-[#19192A] dark:text-white dark:placeholder-slate-500"
                                        placeholder="Brief summary of projects and teams in this workspace"
                                    />
                                    <InputError className="text-xs text-red-500 dark:text-red-400" message={errors.description} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Brand Color Accent</Label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={data.color}
                                            onChange={(e) => setData('color', e.target.value)}
                                            className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
                                        />
                                        <Input
                                            value={data.color}
                                            onChange={(e) => setData('color', e.target.value)}
                                            className="h-9 w-32 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-900 dark:border-white/10 dark:bg-[#19192A] dark:text-white"
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
                                {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>Save Workspace</span>}
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
                                    <span>Workspace updated</span>
                                </div>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
