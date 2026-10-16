import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { Bell, Check, Loader2, Mail, Volume2 } from 'lucide-react';
import { FormEventHandler } from 'react';

interface NotificationPreferences {
    email_task_assigned: boolean;
    email_task_comment: boolean;
    email_review_status: boolean;
    in_app_mentions: boolean;
    in_app_task_moves: boolean;
    sound_enabled: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
    { title: 'Notifications', href: '/settings/notifications' },
];

export default function NotificationsSettings({ preferences }: { preferences: NotificationPreferences }) {
    const { data, setData, put, processing, recentlySuccessful } = useForm({
        email_task_assigned: preferences.email_task_assigned ?? true,
        email_task_comment: preferences.email_task_comment ?? true,
        email_review_status: preferences.email_review_status ?? true,
        in_app_mentions: preferences.in_app_mentions ?? true,
        in_app_task_moves: preferences.in_app_task_moves ?? true,
        sound_enabled: preferences.sound_enabled ?? true,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('settings.notifications.update'), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Notification Preferences" />

            <SettingsLayout
                title="Notification Preferences"
                description="Choose how and when Angora notifies you about assignments, mentions, and project updates"
            >
                <form onSubmit={submit} className="space-y-6">
                    {/* Email Notifications */}
                    <div className="rounded-xl border border-white/[0.08] bg-[#19192A]/40 p-5">
                        <div className="mb-4 flex items-center gap-2 border-b border-white/[0.06] pb-3">
                            <Mail className="h-4 w-4 text-[#fdab3d]" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Email Notifications</h3>
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.email_task_assigned}
                                    onChange={(e) => setData('email_task_assigned', e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-[#1E1E30] text-[#0073ea] focus:ring-[#0073ea]"
                                />
                                <div>
                                    <div className="text-xs font-semibold text-white">Task Assignments</div>
                                    <p className="text-[11px] text-slate-400">Receive an email when a card or subitem is assigned to you</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.email_task_comment}
                                    onChange={(e) => setData('email_task_comment', e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-[#1E1E30] text-[#0073ea] focus:ring-[#0073ea]"
                                />
                                <div>
                                    <div className="text-xs font-semibold text-white">Comment Replies & Mentions</div>
                                    <p className="text-[11px] text-slate-400">Notify me by email when someone @mentions me or replies on my tasks</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.email_review_status}
                                    onChange={(e) => setData('email_review_status', e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-[#1E1E30] text-[#0073ea] focus:ring-[#0073ea]"
                                />
                                <div>
                                    <div className="text-xs font-semibold text-white">Deliverable & Review Status</div>
                                    <p className="text-[11px] text-slate-400">Get notified when review cycles are approved or requested</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* In-App Notifications */}
                    <div className="rounded-xl border border-white/[0.08] bg-[#19192A]/40 p-5">
                        <div className="mb-4 flex items-center gap-2 border-b border-white/[0.06] pb-3">
                            <Bell className="h-4 w-4 text-[#00c875]" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white">In-App Notification Center</h3>
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.in_app_mentions}
                                    onChange={(e) => setData('in_app_mentions', e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-[#1E1E30] text-[#0073ea] focus:ring-[#0073ea]"
                                />
                                <div>
                                    <div className="text-xs font-semibold text-white">Direct Mentions & Approvals</div>
                                    <p className="text-[11px] text-slate-400">Show notification popovers and unread indicators in top bar</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.in_app_task_moves}
                                    onChange={(e) => setData('in_app_task_moves', e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-[#1E1E30] text-[#0073ea] focus:ring-[#0073ea]"
                                />
                                <div>
                                    <div className="text-xs font-semibold text-white">Collaborator Card Movements</div>
                                    <p className="text-[11px] text-slate-400">Receive live push notifications when cards are moved on active boards</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.sound_enabled}
                                    onChange={(e) => setData('sound_enabled', e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-[#1E1E30] text-[#0073ea] focus:ring-[#0073ea]"
                                />
                                <div>
                                    <div className="text-xs font-semibold text-white">Sound Alerts</div>
                                    <p className="text-[11px] text-slate-400">Play subtle chime when receiving new notifications</p>
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
                            {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>Save Preferences</span>}
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
                                <span>Notification preferences saved</span>
                            </div>
                        </Transition>
                    </div>
                </form>
            </SettingsLayout>
        </AppLayout>
    );
}
