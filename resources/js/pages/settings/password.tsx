import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { Check, KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import { FormEventHandler, useRef } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Settings',
        href: '/settings',
    },
    {
        title: 'Password & Security',
        href: '/settings/password',
    },
];

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Password & Security" />

            <SettingsLayout
                title="Password & Security"
                description="Manage your account password, security credentials, and authentication sessions"
            >
                <div className="space-y-6">
                    <div className="rounded-xl border border-white/[0.08] bg-[#19192A]/40 p-5">
                        <div className="mb-5 border-b border-white/[0.06] pb-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Change Password</h3>
                            <p className="mt-0.5 text-xs text-slate-400">
                                Ensure your account uses a secure passphrase at least 8 characters in length.
                            </p>
                        </div>

                        <form onSubmit={updatePassword} className="space-y-4 max-w-xl">
                            <div className="space-y-1.5">
                                <Label htmlFor="current_password" className="text-xs font-semibold text-slate-300">
                                    Current Password
                                </Label>
                                <Input
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    value={data.current_password}
                                    onChange={(e) => setData('current_password', e.target.value)}
                                    type="password"
                                    className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                    autoComplete="current-password"
                                    placeholder="Enter current password"
                                />
                                <InputError className="text-xs text-red-400" message={errors.current_password} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
                                    New Password
                                </Label>
                                <Input
                                    id="password"
                                    ref={passwordInput}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    type="password"
                                    className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                    autoComplete="new-password"
                                    placeholder="Enter new password"
                                />
                                <InputError className="text-xs text-red-400" message={errors.password} />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="password_confirmation" className="text-xs font-semibold text-slate-300">
                                    Confirm New Password
                                </Label>
                                <Input
                                    id="password_confirmation"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    type="password"
                                    className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                    autoComplete="new-password"
                                    placeholder="Confirm new password"
                                />
                                <InputError className="text-xs text-red-400" message={errors.password_confirmation} />
                            </div>

                            <div className="flex items-center gap-3 pt-3">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="h-9 gap-1.5 rounded-xl bg-[#0073ea] px-5 text-xs font-semibold text-white shadow-sm hover:bg-[#0060c0]"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            <span>Updating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <KeyRound className="h-3.5 w-3.5" />
                                            <span>Update Password</span>
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
                                        <span>Password updated successfully</span>
                                    </div>
                                </Transition>
                            </div>
                        </form>
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-[#19192A]/40 p-5">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="h-5 w-5 text-[#579bfc] shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-bold text-white">Active Session Security</h4>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    Updating your password automatically invalidates other active device sessions for your security.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
