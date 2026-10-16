import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { Check, Loader2, Lock, Shield, ShieldCheck } from 'lucide-react';
import { FormEventHandler } from 'react';

interface SecurityPolicy {
    session_lifetime: number;
    require_2fa: boolean;
    min_password_length: number;
    rate_limit_login: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
    { title: 'Data & Security', href: '/settings' },
    { title: 'Security Policies', href: '/settings/data/security' },
];

export default function SecuritySettings({ policy, canManage }: { policy: SecurityPolicy; canManage: boolean }) {
    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        session_lifetime: policy?.session_lifetime || 120,
        require_2fa: policy?.require_2fa ?? false,
        min_password_length: policy?.min_password_length || 8,
        rate_limit_login: policy?.rate_limit_login || 5,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('settings.data.security.update'), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Security Policies" />

            <SettingsLayout
                title="System Security & Access Policies"
                description="Configure authentication session lifetimes, password complexity thresholds, and brute-force defenses"
            >
                <div className="space-y-6">
                    <form onSubmit={submit} className="space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/[0.08] dark:bg-[#19192A]/40">
                            <div className="mb-5 flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-white/[0.06]">
                                <Shield className="h-4 w-4 text-emerald-600 dark:text-[#00c875]" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Authentication & Session Rules</h3>
                            </div>

                            <div className="space-y-5 max-w-xl">
                                <div className="space-y-1.5">
                                    <Label htmlFor="session_lifetime" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Session Expiration (Minutes)
                                    </Label>
                                    <Input
                                        id="session_lifetime"
                                        type="number"
                                        disabled={!canManage}
                                        value={data.session_lifetime}
                                        onChange={(e) => setData('session_lifetime', parseInt(e.target.value) || 120)}
                                        className="h-10 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder-slate-400 focus:border-[#0073ea] focus:ring-[#0073ea] dark:border-white/10 dark:bg-[#19192A] dark:text-white dark:placeholder-slate-500"
                                    />
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Idle duration before a user is prompted to sign in again</p>
                                    <InputError className="text-xs text-red-500 dark:text-red-400" message={errors.session_lifetime} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="min_password_length" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Minimum Password Length
                                    </Label>
                                    <Input
                                        id="min_password_length"
                                        type="number"
                                        disabled={!canManage}
                                        value={data.min_password_length}
                                        onChange={(e) => setData('min_password_length', parseInt(e.target.value) || 8)}
                                        className="h-10 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder-slate-400 focus:border-[#0073ea] focus:ring-[#0073ea] dark:border-white/10 dark:bg-[#19192A] dark:text-white dark:placeholder-slate-500"
                                    />
                                    <InputError className="text-xs text-red-500 dark:text-red-400" message={errors.min_password_length} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="rate_limit_login" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Failed Login Attempt Ceiling
                                    </Label>
                                    <Input
                                        id="rate_limit_login"
                                        type="number"
                                        disabled={!canManage}
                                        value={data.rate_limit_login}
                                        onChange={(e) => setData('rate_limit_login', parseInt(e.target.value) || 5)}
                                        className="h-10 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder-slate-400 focus:border-[#0073ea] focus:ring-[#0073ea] dark:border-white/10 dark:bg-[#19192A] dark:text-white dark:placeholder-slate-500"
                                    />
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Consecutive failed login threshold triggering temporary lockout</p>
                                    <InputError className="text-xs text-red-500 dark:text-red-400" message={errors.rate_limit_login} />
                                </div>

                                <div className="pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            disabled={!canManage}
                                            checked={data.require_2fa}
                                            onChange={(e) => setData('require_2fa', e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 bg-white text-[#0073ea] focus:ring-[#0073ea] dark:border-white/20 dark:bg-[#1E1E30]"
                                        />
                                        <div>
                                            <span className="text-xs font-semibold text-slate-900 dark:text-white">Require Two-Factor Authentication (2FA)</span>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Enforce TOTP authenticator app verification for staff</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {canManage && (
                            <div className="flex items-center gap-3">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="h-9 gap-1.5 rounded-xl bg-[#0073ea] px-5 text-xs font-semibold text-white hover:bg-[#0060c0]"
                                >
                                    {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>Save Security Policies</span>}
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
                                        <span>Security policy updated</span>
                                    </div>
                                </Transition>
                            </div>
                        )}
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
