import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, router, useForm } from '@inertiajs/react';
import { ChevronDown, Eye, EyeOff, KeyRound, LoaderCircle, Lock, LogIn, Mail, Moon, ShieldCheck, Sun, Zap } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface LoginForm {
    email: string;
    password: string;
    remember: boolean;
}

interface TestAccount {
    id: number;
    name: string;
    email: string;
    role: string;
    department: string;
}

interface LoginProps {
    status?: string;
    canResetPassword?: boolean;
    canRegister?: boolean;
    isLocalEnv?: boolean;
    testAccounts?: TestAccount[];
}

const roleColors: Record<string, string> = {
    super_admin: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    admin: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    admin_manager: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    dept_user: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    hr_staff: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
    production_staff: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    sales_staff: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    marketing_staff: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    finance_staff: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    team_member: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    external_user: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
};

export default function Login({ status, canResetPassword = false, canRegister = false, isLocalEnv = false, testAccounts = [] }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [isQuickAccessOpen, setIsQuickAccessOpen] = useState(false);
    const [quickLoginLoadingId, setQuickLoginLoadingId] = useState<number | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const handleQuickLogin = (userId: number) => {
        setQuickLoginLoadingId(userId);
        router.post(
            route('login.quick'),
            { user_id: userId },
            {
                onFinish: () => setQuickLoginLoadingId(null),
            },
        );
    };

    const toggleTheme = () => {
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('appearance', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('appearance', 'dark');
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-[#F8F9F7] text-[#191927] transition-colors dark:bg-[#12121E] dark:text-slate-100">
            <Head title="Log in — Angora Work OS" />

            {/* Left Panel — Visual Section (50–55%) */}
            <div className="relative m-3.5 hidden flex-col justify-between overflow-hidden rounded-[30px] bg-[#161624] p-10 shadow-2xl select-none lg:flex lg:w-[52%] xl:w-[55%] xl:p-14">
                {/* Cinematic Image Background */}
                <div
                    className="absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-1000 hover:scale-100"
                    style={{
                        backgroundImage: `url('/images/auth-backdrop.jpg')`,
                    }}
                />

                {/* Ambient Dark Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#12121E]/95 via-[#12121E]/60 to-[#12121E]/40 backdrop-blur-[1px]" />
                <div
                    className="pointer-events-none absolute inset-0 opacity-40"
                    style={{
                        background: 'radial-gradient(circle at 80% 20%, rgba(216, 247, 121, 0.25), transparent 50%)',
                    }}
                />

                {/* Upper Left: Welcome Back Pill */}
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3.5 py-1.5 text-xs font-semibold text-white/95 shadow-sm backdrop-blur-md">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#D8F779] shadow-[0_0_8px_#D8F779]" />
                        <span>Welcome Back</span>
                    </div>
                </div>

                {/* Center Cinematic Quote/Highlight */}
                <div className="relative z-10 my-auto py-8">
                    <div className="max-w-lg space-y-4">
                        <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-[#D8F779] uppercase">
                            <Zap className="h-4 w-4" />
                            Next-Gen Operational Intelligence
                        </div>
                        <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-white xl:text-4xl">
                            One unified workspace for the entire enterprise.
                        </h2>
                        <p className="text-sm leading-relaxed font-normal text-slate-300/90 xl:text-base">
                            Collaborate effortlessly across 10 functional departments — from shop-floor production lines to real-time financial
                            ledgers and Kanban automation.
                        </p>
                    </div>
                </div>

                {/* Lower Left: Application Branding */}
                <div className="relative z-10 space-y-4 border-t border-white/15 pt-6">
                    <div className="flex items-center gap-3.5">
                        <img
                            src="/icon.png"
                            alt="Angora Work OS"
                            className="h-12 w-12 rounded-2xl border border-white/20 bg-black/30 object-contain shadow-xl"
                        />
                        <div>
                            <div className="flex items-center gap-1.5 text-2xl font-black tracking-tight text-white">
                                <span>angora</span>
                                <span className="text-[#D8F779]">.work</span>
                            </div>
                            <p className="text-xs font-medium text-white/70">Enterprise Work Operating System</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/80">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 font-medium backdrop-blur-xs">
                            <ShieldCheck className="h-3.5 w-3.5 text-[#D8F779]" /> Enterprise RBAC Matrix
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 font-medium backdrop-blur-xs">
                            <Zap className="h-3.5 w-3.5 text-[#C8AEF5]" /> 10 Connected Workspaces
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 font-medium backdrop-blur-xs">
                            <Lock className="h-3.5 w-3.5 text-emerald-400" /> End-to-End Audit Logs
                        </span>
                    </div>
                </div>
            </div>

            {/* Right Panel — Login Form (45–50%) */}
            <div className="flex min-h-screen w-full flex-col justify-between overflow-y-auto p-6 sm:p-10 lg:w-[48%] lg:p-12 xl:w-[45%]">
                {/* Top Bar: Theme Switcher */}
                <div className="mx-auto flex w-full max-w-md items-center justify-between">
                    <div className="flex items-center gap-2 lg:hidden">
                        <img src="/icon.png" alt="Angora" className="h-8 w-8 rounded-xl object-contain shadow-sm" />
                        <span className="text-base font-extrabold tracking-tight">angora.work</span>
                    </div>
                    <div className="ml-auto">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            className="h-9 w-9 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            title="Toggle Light / Dark mode"
                        >
                            <Sun className="hidden h-4 w-4 dark:block" />
                            <Moon className="block h-4 w-4 dark:hidden" />
                            <span className="sr-only">Toggle theme</span>
                        </Button>
                    </div>
                </div>

                {/* Form Container */}
                <div className="mx-auto my-auto w-full max-w-md space-y-6 py-6">
                    {/* Top Branding & Header */}
                    <div className="space-y-2 text-center">
                        <div className="relative inline-block">
                            <img
                                src="/icon.png"
                                alt="Angora Work OS"
                                className="mx-auto h-16 w-16 rounded-2xl border border-black/5 object-contain shadow-xl transition-transform hover:scale-105 dark:border-white/10"
                            />
                        </div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-[#191927] sm:text-3xl dark:text-white">Welcome Back</h1>
                        <p className="text-sm text-[#777785] dark:text-slate-400">Sign in to continue to your dashboard.</p>
                    </div>

                    {/* Status notification */}
                    {status && (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {status}
                        </div>
                    )}

                    {/* Authentication Form */}
                    <form className="space-y-4" onSubmit={submit}>
                        {/* Email or Username */}
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-xs font-bold text-[#191927] dark:text-slate-300">
                                Email Address
                            </Label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                                    <Mail className="h-4 w-4" />
                                </div>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="name@angora.internal"
                                    className="h-11 rounded-xl border-[#ECECF0] bg-white pl-10 text-sm focus-visible:ring-2 focus-visible:ring-[#191927] dark:border-[#28283E] dark:bg-[#1E1E2F] dark:focus-visible:ring-[#D8F779]"
                                />
                            </div>
                            <InputError message={errors.email} />
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-xs font-bold text-[#191927] dark:text-slate-300">
                                    Password
                                </Label>
                                {canResetPassword && (
                                    <TextLink
                                        href={route('password.request')}
                                        className="text-xs font-semibold text-[#5B309A] hover:underline dark:text-[#D8B4FE]"
                                        tabIndex={5}
                                    >
                                        Forgot password?
                                    </TextLink>
                                )}
                            </div>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                                    <Lock className="h-4 w-4" />
                                </div>
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Enter your password"
                                    className="h-11 rounded-xl border-[#ECECF0] bg-white pr-10 pl-10 text-sm focus-visible:ring-2 focus-visible:ring-[#191927] dark:border-[#28283E] dark:bg-[#1E1E2F] dark:focus-visible:ring-[#D8F779]"
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <InputError message={errors.password} />
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center space-x-2.5">
                                <Checkbox
                                    id="remember"
                                    checked={data.remember}
                                    onCheckedChange={(checked) => setData('remember', !!checked)}
                                    tabIndex={3}
                                    className="rounded-md border-slate-300 data-[state=checked]:bg-[#191927] dark:border-slate-700 dark:data-[state=checked]:bg-[#D8F779] dark:data-[state=checked]:text-[#191927]"
                                />
                                <Label
                                    htmlFor="remember"
                                    className="cursor-pointer text-xs font-medium text-[#777785] select-none dark:text-slate-400"
                                >
                                    Remember me for 30 days
                                </Label>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            tabIndex={4}
                            disabled={processing}
                            className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#191927] text-sm font-bold text-white shadow-md transition-all hover:bg-[#28283E] dark:bg-[#D8F779] dark:text-[#191927] dark:hover:bg-[#c9ea68]"
                        >
                            {processing ? (
                                <>
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn className="h-4 w-4" />
                                    <span>Sign In</span>
                                </>
                            )}
                        </Button>

                        {/* Registration Link (if active) */}
                        {canRegister && (
                            <div className="pt-2 text-center text-xs text-[#777785] dark:text-slate-400">
                                Don't have an account?{' '}
                                <TextLink href={route('register')} className="font-semibold text-[#191927] underline dark:text-white">
                                    Sign up
                                </TextLink>
                            </div>
                        )}
                    </form>

                    {/* Development Quick Login Access (Strictly local development environment) */}
                    {isLocalEnv && testAccounts && testAccounts.length > 0 && (
                        <div className="border-t border-[#ECECF0] pt-4 dark:border-[#28283E]">
                            <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-950/20">
                                <button
                                    type="button"
                                    onClick={() => setIsQuickAccessOpen(!isQuickAccessOpen)}
                                    className="flex w-full cursor-pointer items-center justify-between px-3.5 py-3 text-left transition-colors hover:bg-amber-500/10"
                                >
                                    <div className="flex items-center gap-2">
                                        <KeyRound className="h-4 w-4 shrink-0 text-amber-500" />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-[#191927] dark:text-slate-200">Development Quick Access</span>
                                                <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider text-amber-700 uppercase dark:text-amber-300">
                                                    Local Only
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[#777785] dark:text-slate-400">Instant 1-click test persona sign in</p>
                                        </div>
                                    </div>
                                    <ChevronDown
                                        className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                                            isQuickAccessOpen ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>

                                {isQuickAccessOpen && (
                                    <div className="space-y-2 border-t border-amber-500/20 bg-white/50 p-3 dark:bg-[#161624]/60">
                                        <div className="px-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                            Select Test Account ({testAccounts.length} personas):
                                        </div>
                                        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                                            {testAccounts.map((account) => {
                                                const badgeStyle = roleColors[account.role] || 'bg-slate-100 text-slate-700 border-slate-200';
                                                const isLoading = quickLoginLoadingId === account.id;

                                                return (
                                                    <div
                                                        key={account.id}
                                                        className="flex items-center justify-between rounded-xl border border-[#ECECF0] bg-white p-2 shadow-xs transition-all hover:border-[#191927]/30 dark:border-[#28283E] dark:bg-[#1E1E2F]"
                                                    >
                                                        <div className="flex min-w-0 flex-col pr-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="truncate text-xs font-bold text-[#191927] dark:text-white">
                                                                    {account.name}
                                                                </span>
                                                                <span
                                                                    className={`py-0.2 shrink-0 rounded-md border px-1.5 text-[9px] font-bold ${badgeStyle}`}
                                                                >
                                                                    {account.role.replace('_', ' ')}
                                                                </span>
                                                            </div>
                                                            <span className="truncate text-[10px] text-slate-400">
                                                                {account.email} • {account.department}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            disabled={quickLoginLoadingId !== null}
                                                            onClick={() => handleQuickLogin(account.id)}
                                                            className="h-7 shrink-0 cursor-pointer rounded-lg bg-[#191927] px-2.5 text-xs font-semibold text-white hover:bg-[#28283E] dark:bg-[#D8F779] dark:text-[#191927] dark:hover:bg-[#c9ea68]"
                                                        >
                                                            {isLoading ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <span>Quick Login</span>}
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Footer */}
                <div className="mx-auto w-full max-w-md py-2 text-center text-[11px] text-[#777785] dark:text-slate-500">
                    &copy; {new Date().getFullYear()} Angora Work OS. All rights reserved.
                </div>
            </div>
        </div>
    );
}
