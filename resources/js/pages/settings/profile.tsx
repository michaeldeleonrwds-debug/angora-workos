import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { ProfileAvatarSection } from '@/components/ProfileAvatarSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/UserAvatar';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { formatDate } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Bell,
    Calendar,
    Check,
    CheckCircle2,
    ChevronRight,
    KeyRound,
    Loader2,
    Lock,
    Mail,
    Palette,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    User as UserIcon,
} from 'lucide-react';
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
    const user = auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: user.name,
        email: user.email,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    const isSuperAdmin = (user as any).is_super_admin === true;
    const isClient = (user as any).is_client === true || (user as any).role === 'client';
    const rawRole = (user as any).role || (isSuperAdmin ? 'Super Admin' : isClient ? 'Client' : 'Member');
    const displayRole = rawRole.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const isVerified = Boolean(user.email_verified_at);

    // Role badge color scheme
    const getRoleBadgeClasses = () => {
        if (isSuperAdmin) {
            return 'bg-purple-500/10 text-purple-700 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30';
        }
        if (displayRole.toLowerCase().includes('admin')) {
            return 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30';
        }
        if (isClient) {
            return 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30';
        }
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30';
    };

    // Role capabilities list
    const getRoleCapabilities = () => {
        if (isSuperAdmin) {
            return [
                'Full platform administrative authority',
                'Manage all workspaces, boards, & workflows',
                'Role-based access governance & permissions',
                'System diagnostics, Redis queues, & storage',
                'Security policies, integrations, & audit logs',
            ];
        }
        if (displayRole.toLowerCase().includes('admin')) {
            return [
                'Workspace & team administration',
                'Manage members, roles, & invitations',
                'Kanban boards & workflow configuration',
                'Access workspace branding & security policies',
            ];
        }
        if (isClient) {
            return [
                'Dedicated client portal interface',
                'Real-time task review & revision feedback',
                'Project asset downloads & deliverable approvals',
                'Direct communication with assigned creative team',
            ];
        }
        return [
            'Interactive Kanban board collaboration',
            'Task assignments, tracking, & checklists',
            'Rich media asset uploads & attachments',
            'Real-time desktop notifications & mentions',
        ];
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile Settings" />

            <SettingsLayout
                title="Profile Settings"
                description="Manage your executive identity, avatar portrait, and personal account credentials"
            >
                <div className="space-y-8">
                    {/* Executive Profile Hero Card */}
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-linear-to-r from-slate-50 via-white to-slate-50/80 p-6 shadow-xs sm:p-7 dark:border-white/[0.08] dark:from-[#19192A]/90 dark:via-[#1E1E2F]/80 dark:to-[#19192A]/90">
                        {/* Subtle decorative glow */}
                        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-linear-to-br from-[#0073ea]/10 to-transparent blur-3xl dark:from-[#D8F779]/10" />

                        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                            {/* Left: Avatar + Name + Badges */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                                <div className="relative group">
                                    <UserAvatar
                                        user={user}
                                        size="xl"
                                        className="h-20 w-20 sm:h-22 sm:w-22 ring-4 ring-white shadow-md dark:ring-[#28283E]"
                                    />
                                    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-white dark:bg-[#1E1E2F] dark:ring-[#28283E]">
                                        <ShieldCheck className="h-4 w-4 text-[#00c875]" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                            {user.name}
                                        </h2>
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${getRoleBadgeClasses()}`}
                                        >
                                            <Shield className="h-3 w-3 shrink-0" />
                                            {displayRole}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1.5">
                                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                                            {user.email}
                                        </span>

                                        <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>

                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            Member since {formatDate(user.created_at, 'Recently')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Verification Status Indicator */}
                            <div className="flex items-center gap-2 self-start sm:self-center">
                                {isVerified ? (
                                    <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                                        <CheckCircle2 className="h-4 w-4 text-[#00c875]" />
                                        <span>Verified Account</span>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
                                        <AlertCircle className="h-4 w-4 text-amber-500" />
                                        <span>Unverified Email</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content: Two-Column Responsive Layout */}
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
                        {/* Left Column (Primary Personal Information Form) */}
                        <div className="space-y-8 lg:col-span-7">
                            {/* Personal Information Form Card */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7 dark:border-white/[0.08] dark:bg-[#19192A]/50">
                                <div className="mb-6 flex items-start gap-3.5 border-b border-slate-200 pb-4 dark:border-white/[0.06]">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0073ea]/10 text-[#0073ea] dark:bg-[#0073ea]/20 dark:text-[#579bfc]">
                                        <UserIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Personal Information
                                        </h3>
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                            Update your personal display name and contact email used across notifications and team mentions.
                                        </p>
                                    </div>
                                </div>

                                <form onSubmit={submit} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Full Name
                                        </Label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                                <UserIcon className="h-4 w-4" />
                                            </div>
                                            <Input
                                                id="name"
                                                className="h-10 rounded-xl border border-slate-300 bg-white pl-9 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0073ea] focus:ring-[#0073ea] dark:border-white/10 dark:bg-[#19192A] dark:text-white dark:placeholder-slate-500"
                                                value={data.name}
                                                onChange={(e) => setData('name', e.target.value)}
                                                required
                                                autoComplete="name"
                                                placeholder="Enter your full name"
                                            />
                                        </div>
                                        <InputError className="text-xs text-red-500 dark:text-red-400" message={errors.name} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Email Address
                                        </Label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                                <Mail className="h-4 w-4" />
                                            </div>
                                            <Input
                                                id="email"
                                                type="email"
                                                className="h-10 rounded-xl border border-slate-300 bg-white pl-9 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0073ea] focus:ring-[#0073ea] dark:border-white/10 dark:bg-[#19192A] dark:text-white dark:placeholder-slate-500"
                                                value={data.email}
                                                onChange={(e) => setData('email', e.target.value)}
                                                required
                                                autoComplete="username"
                                                placeholder="email@example.com"
                                            />
                                        </div>
                                        <InputError className="text-xs text-red-500 dark:text-red-400" message={errors.email} />
                                    </div>

                                    {/* Email Verification Banner */}
                                    {mustVerifyEmail && user.email_verified_at === null && (
                                        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 dark:text-amber-400" />
                                                <div className="space-y-1">
                                                    <p className="text-xs text-amber-900 dark:text-amber-200">
                                                        Your email address is unverified.{' '}
                                                        <Link
                                                            href={route('verification.send')}
                                                            method="post"
                                                            as="button"
                                                            className="font-semibold underline hover:text-amber-950 dark:hover:text-white"
                                                        >
                                                            Click here to re-send the verification email.
                                                        </Link>
                                                    </p>
                                                    {status === 'verification-link-sent' && (
                                                        <div className="text-xs font-semibold text-[#00c875]">
                                                            A new verification link has been dispatched to your email address.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Button & Confirmation */}
                                    <div className="flex items-center gap-3 pt-3">
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            className="h-9 gap-1.5 rounded-xl bg-[#0073ea] px-5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#0060c0]"
                                        >
                                            {processing ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    <span>Saving Profile...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="h-3.5 w-3.5" />
                                                    <span>Save Changes</span>
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
                                            <div className="flex items-center gap-1.5 rounded-lg border border-[#00c875]/20 bg-[#00c875]/10 px-3 py-1.5 text-xs font-medium text-[#00c875]">
                                                <Check className="h-3.5 w-3.5" />
                                                <span>Profile saved successfully</span>
                                            </div>
                                        </Transition>
                                    </div>
                                </form>
                            </div>

                            {/* Quick Security & Account Preferences Shortcuts Card */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7 dark:border-white/[0.08] dark:bg-[#19192A]/50">
                                <div className="mb-4 flex items-start gap-3.5 border-b border-slate-200 pb-4 dark:border-white/[0.06]">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                                        <KeyRound className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Security & Account Preferences
                                        </h3>
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                            Fast shortcuts to configure security credentials, notifications, and theme settings.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                    <Link
                                        href="/settings/password"
                                        className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-[#0073ea]/40 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1E1E2F]/50 dark:hover:border-white/20 dark:hover:bg-[#1E1E2F]"
                                    >
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Lock className="h-4 w-4 text-[#0073ea] dark:text-[#579bfc]" />
                                                <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                                            </div>
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Password & Security</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                Update passphrase and session safety
                                            </p>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/settings/appearance"
                                        className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-[#0073ea]/40 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1E1E2F]/50 dark:hover:border-white/20 dark:hover:bg-[#1E1E2F]"
                                    >
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Palette className="h-4 w-4 text-emerald-600 dark:text-[#D8F779]" />
                                                <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                                            </div>
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Appearance</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                Light, dark, or system mode
                                            </p>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/settings/notifications"
                                        className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-[#0073ea]/40 hover:bg-slate-50 dark:border-white/10 dark:bg-[#1E1E2F]/50 dark:hover:border-white/20 dark:hover:bg-[#1E1E2F]"
                                    >
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Bell className="h-4 w-4 text-amber-500" />
                                                <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                                            </div>
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Notifications</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                Desktop & push alert preferences
                                            </p>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Right Column (Avatar Studio & Role Summary) */}
                        <div className="space-y-8 lg:col-span-5">
                            {/* Profile Photo Studio */}
                            <ProfileAvatarSection user={user} />

                            {/* Role & Permissions Scope Card */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7 dark:border-white/[0.08] dark:bg-[#19192A]/50">
                                <div className="mb-4 flex items-start gap-3.5 border-b border-slate-200 pb-4 dark:border-white/[0.06]">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                        <Sparkles className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Role & Access Scope
                                        </h3>
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                            Current privilege tier and operational capabilities.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-[#1E1E2F]/60">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Active Role</span>
                                        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold capitalize ${getRoleBadgeClasses()}`}>
                                            {displayRole}
                                        </span>
                                    </div>

                                    <div className="space-y-2 pt-1">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            Key Capabilities
                                        </p>
                                        <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                                            {getRoleCapabilities().map((cap, idx) => (
                                                <li key={idx} className="flex items-start gap-2">
                                                    <Check className="h-3.5 w-3.5 text-[#00c875] shrink-0 mt-0.5" />
                                                    <span>{cap}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom: Danger Zone (Account Deletion) */}
                    <div className="overflow-hidden rounded-2xl border border-rose-500/20 bg-rose-500/[0.02] p-6 shadow-xs sm:p-7 dark:bg-rose-500/[0.04]">
                        <div className="mb-4 flex items-start gap-3.5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                                <ShieldAlert className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Danger Zone
                                </h3>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    Irreversible account deletion actions and resource destruction.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-rose-500/20 bg-white p-5 dark:border-rose-500/20 dark:bg-[#19192A]/60">
                            <DeleteUser />
                        </div>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
