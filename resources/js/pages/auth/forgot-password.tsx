import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm } from '@inertiajs/react';
import { KeyRound, LoaderCircle, Lock, Mail, Moon, Send, ShieldCheck, Sun, Zap } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
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
            <Head title="Forgot Password — Angora Work OS" />

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

                {/* Upper Left: Account Recovery Pill */}
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3.5 py-1.5 text-xs font-semibold text-white/95 shadow-sm backdrop-blur-md">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#D8F779] shadow-[0_0_8px_#D8F779]" />
                        <span>Account Recovery</span>
                    </div>
                </div>

                {/* Center Cinematic Quote/Highlight */}
                <div className="relative z-10 my-auto py-8">
                    <div className="max-w-lg space-y-4">
                        <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-[#D8F779] uppercase">
                            <KeyRound className="h-4 w-4" />
                            Secure Credential Protection
                        </div>
                        <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-white xl:text-4xl">
                            Recover your account access with verified security.
                        </h2>
                        <p className="text-sm leading-relaxed font-normal text-slate-300/90 xl:text-base">
                            We will send a cryptographically signed password reset link to your verified corporate email address to ensure account
                            integrity.
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
                            <ShieldCheck className="h-3.5 w-3.5 text-[#D8F779]" /> End-to-End Encryption
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 font-medium backdrop-blur-xs">
                            <Zap className="h-3.5 w-3.5 text-[#C8AEF5]" /> Single-Use Signed Tokens
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 font-medium backdrop-blur-xs">
                            <Lock className="h-3.5 w-3.5 text-emerald-400" /> Audit Logged Request
                        </span>
                    </div>
                </div>
            </div>

            {/* Right Panel — Forgot Password Form (45–50%) */}
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
                        <h1 className="text-2xl font-extrabold tracking-tight text-[#191927] sm:text-3xl dark:text-white">Forgot Password</h1>
                        <p className="text-sm text-[#777785] dark:text-slate-400">Enter your email to receive a password reset link.</p>
                    </div>

                    {/* Status notification */}
                    {status && (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {status}
                        </div>
                    )}

                    {/* Forgot Password Form */}
                    <form className="space-y-4" onSubmit={submit}>
                        {/* Email Address */}
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
                                    name="email"
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

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            tabIndex={2}
                            disabled={processing}
                            className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#191927] text-sm font-bold text-white shadow-md transition-all hover:bg-[#28283E] dark:bg-[#D8F779] dark:text-[#191927] dark:hover:bg-[#c9ea68]"
                        >
                            {processing ? (
                                <>
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                    <span>Sending reset link...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    <span>Send Reset Link</span>
                                </>
                            )}
                        </Button>

                        {/* Return to login link */}
                        <div className="pt-2 text-center text-xs text-[#777785] dark:text-slate-400">
                            <span>Remember your password? </span>
                            <TextLink href={route('login')} className="font-semibold text-[#191927] underline dark:text-white">
                                Return to log in
                            </TextLink>
                        </div>
                    </form>
                </div>

                {/* Bottom Footer */}
                <div className="mx-auto w-full max-w-md py-2 text-center text-[11px] text-[#777785] dark:text-slate-500">
                    &copy; {new Date().getFullYear()} Angora Work OS. All rights reserved.
                </div>
            </div>
        </div>
    );
}
