import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm } from '@inertiajs/react';
import { CheckCircle2, Eye, EyeOff, LoaderCircle, Lock, ShieldCheck, User, Zap } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Invitation {
    id: number;
    email: string;
    role: string;
    workspace?: { id: number; name: string };
    board?: { id: number; title: string };
    inviter?: { id: number; name: string };
}

interface AcceptInvitationProps {
    invitation: Invitation;
}

export default function AcceptInvitation({ invitation }: AcceptInvitationProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('invitations.accept', { token: (invitation as any).token || window.location.pathname.split('/').pop() }), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9F7] p-4 text-[#191927] transition-colors dark:bg-[#12121E] dark:text-slate-100">
            <Head title="Accept Invitation — Angora Work OS" />

            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#ECECF0] bg-white p-8 shadow-xl dark:border-[#28283E] dark:bg-[#1A1A2C]">
                {/* Brand header */}
                <div className="mb-6 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D8F779] shadow-md">
                        <Zap className="h-6 w-6 text-[#161624]" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-[#161624] dark:text-white">
                        Welcome to Angora Work OS
                    </h1>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        You have been invited by <span className="font-semibold text-slate-700 dark:text-slate-200">{invitation.inviter?.name || 'an administrator'}</span>
                    </p>
                </div>

                {/* Invitation Details Banner */}
                <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-2 font-bold">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Invited Account: {invitation.email}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400/90">
                        Role: <span className="font-bold uppercase">{invitation.role.replace('_', ' ')}</span>
                        {invitation.workspace && ` • Workspace: ${invitation.workspace.name}`}
                        {invitation.board && ` • Board: ${invitation.board.title}`}
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Your Full Name
                        </Label>
                        <div className="relative mt-1">
                            <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="h-10 rounded-xl pl-9 text-xs"
                                placeholder="Jane Doe"
                                required
                                autoFocus
                            />
                        </div>
                        <InputError message={errors.name} className="mt-1" />
                    </div>

                    <div>
                        <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Create Password
                        </Label>
                        <div className="relative mt-1">
                            <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="h-10 rounded-xl pr-10 pl-9 text-xs"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <InputError message={errors.password} className="mt-1" />
                    </div>

                    <div>
                        <Label htmlFor="password_confirmation" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Confirm Password
                        </Label>
                        <div className="relative mt-1">
                            <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                id="password_confirmation"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                className="h-10 rounded-xl pr-10 pl-9 text-xs"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <InputError message={errors.password_confirmation} className="mt-1" />
                    </div>

                    <Button
                        type="submit"
                        disabled={processing}
                        className="h-10 w-full rounded-xl bg-[#0073ea] text-xs font-bold text-white shadow-md hover:bg-[#0060c0]"
                    >
                        {processing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                        Activate Account & Join Team
                    </Button>
                </form>
            </div>
        </div>
    );
}
