import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { ProfileAvatarSection } from '@/components/ProfileAvatarSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Check, Loader2, ShieldCheck, User } from 'lucide-react';
import { FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Settings',
        href: '/settings',
    },
    {
        title: 'Profile',
        href: '/settings/profile',
    },
];

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: auth.user.name,
        email: auth.user.email,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile Settings" />

            <SettingsLayout
                title="Profile Settings"
                description="Manage your personal identity, avatar photograph, and contact email"
            >
                <div className="space-y-8">
                    {/* User Identity Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/[0.08] dark:bg-[#19192A]/60">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0073ea]/15 text-[#0073ea] dark:bg-[#0073ea]/20 dark:text-[#579bfc]">
                                <User className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{auth.user.name}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{auth.user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 capitalize dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                                <ShieldCheck className="h-3.5 w-3.5 text-[#00c875]" />
                                {(auth.user as any).role || 'Member'}
                            </span>
                        </div>
                    </div>

                    {/* Section 1: Avatar Upload & Cropper */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/[0.08] dark:bg-[#19192A]/40">
                        <div className="mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Profile Photo</h3>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Upload a high-resolution portrait. Square or circular crops are supported up to 5 MB.
                            </p>
                        </div>
                        <ProfileAvatarSection user={auth.user} />
                    </div>

                    {/* Section 2: Personal Information */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 dark:border-white/[0.08] dark:bg-[#19192A]/40">
                        <div className="mb-5 border-b border-slate-200 pb-3 dark:border-white/[0.06]">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Personal Information</h3>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Update your account name and email address used for team mentions and system alerts.
                            </p>
                        </div>

                        <form onSubmit={submit} className="space-y-5">
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Full Name
                                    </Label>
                                    <Input
                                        id="name"
                                        className="h-10 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder-slate-400 focus:border-[#0073ea] focus:ring-[#0073ea] dark:border-white/10 dark:bg-[#19192A] dark:text-white dark:placeholder-slate-500"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        required
                                        autoComplete="name"
                                        placeholder="Your full name"
                                    />
                                    <InputError className="text-xs text-red-500 dark:text-red-400" message={errors.name} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Email Address
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        className="h-10 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder-slate-400 focus:border-[#0073ea] focus:ring-[#0073ea] dark:border-white/10 dark:bg-[#19192A] dark:text-white dark:placeholder-slate-500"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        required
                                        autoComplete="username"
                                        placeholder="email@example.com"
                                    />
                                    <InputError className="text-xs text-red-500 dark:text-red-400" message={errors.email} />
                                </div>
                            </div>

                            {mustVerifyEmail && auth.user.email_verified_at === null && (
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                                    <p className="text-xs text-amber-800 dark:text-amber-200">
                                        Your email address is unverified.{' '}
                                        <Link
                                            href={route('verification.send')}
                                            method="post"
                                            as="button"
                                            className="font-semibold underline hover:text-slate-900 dark:hover:text-white"
                                        >
                                            Click here to re-send the verification email.
                                        </Link>
                                    </p>

                                    {status === 'verification-link-sent' && (
                                        <div className="mt-2 text-xs font-medium text-[#00c875]">
                                            A new verification link has been sent to your email address.
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-3 pt-2">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="h-9 gap-1.5 rounded-xl bg-[#0073ea] px-5 text-xs font-semibold text-white shadow-sm hover:bg-[#0060c0]"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            <span>Saving Changes...</span>
                                        </>
                                    ) : (
                                        <span>Save Changes</span>
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
                                        <span>Profile saved successfully</span>
                                    </div>
                                </Transition>
                            </div>
                        </form>
                    </div>

                    {/* Section 3: Danger Zone */}
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.03] p-5">
                        <DeleteUser />
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
