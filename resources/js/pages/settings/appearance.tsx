import AppearanceTabs from '@/components/appearance-tabs';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Palette } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Settings',
        href: '/settings',
    },
    {
        title: 'Appearance',
        href: '/settings/appearance',
    },
];

export default function Appearance() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appearance Settings" />

            <SettingsLayout
                title="Appearance Settings"
                description="Customize your visual theme, color contrast, and interface display modes"
            >
                <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/[0.08] dark:bg-[#19192A]/40">
                        <div className="mb-5 border-b border-slate-200 pb-3 dark:border-white/[0.06]">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Interface Theme</h3>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Select between light, dark, or system preference matching.
                            </p>
                        </div>

                        <div className="pt-2">
                            <AppearanceTabs />
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/[0.08] dark:bg-[#19192A]/40">
                        <div className="flex items-start gap-3">
                            <Palette className="h-5 w-5 text-emerald-600 dark:text-[#D8F779] shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Angora Work OS Design System</h4>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    The workspace provides seamless high-contrast light and dark surfaces with tailored brand highlights for maximum operational focus and low visual fatigue.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
