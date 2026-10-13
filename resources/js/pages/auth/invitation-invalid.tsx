import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, ShieldAlert, Zap } from 'lucide-react';

interface InvitationInvalidProps {
    message?: string;
    reason?: 'expired' | 'revoked' | 'accepted' | 'not_found';
}

export default function InvitationInvalid({ message, reason = 'not_found' }: InvitationInvalidProps) {
    const defaultMessages: Record<string, string> = {
        expired: 'This invitation has expired. Invitations are valid for 7 days. Please request a new invitation from your administrator.',
        revoked: 'This invitation has been revoked or invalidated by an administrator.',
        accepted: 'This invitation has already been accepted. You can log in using your credentials.',
        not_found: 'The invitation token could not be verified or is no longer valid.',
    };

    const displayMessage = message || defaultMessages[reason] || defaultMessages.not_found;

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9F7] p-4 text-[#191927] transition-colors dark:bg-[#12121E] dark:text-slate-100">
            <Head title="Invalid Invitation — Angora Work OS" />

            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#ECECF0] bg-white p-8 text-center shadow-xl dark:border-[#28283E] dark:bg-[#1A1A2C]">
                {/* Brand icon */}
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                    <ShieldAlert className="h-7 w-7" />
                </div>

                <h1 className="text-2xl font-black tracking-tight text-[#161624] dark:text-white">
                    Invitation Invalid
                </h1>

                <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {displayMessage}
                </p>

                <div className="mt-6 flex flex-col gap-2.5">
                    <Button asChild className="h-10 w-full rounded-xl bg-[#161624] text-xs font-bold text-white hover:bg-black dark:bg-[#D8F779] dark:text-[#161624] dark:hover:bg-[#c8e967]">
                        <Link href="/login">
                            Go to Sign In
                        </Link>
                    </Button>

                    <Button asChild variant="outline" className="h-10 w-full rounded-xl border-[#ECECF0] text-xs font-semibold hover:bg-slate-50 dark:border-[#28283E] dark:hover:bg-[#202035]">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Return Home
                        </Link>
                    </Button>
                </div>

                <div className="mt-6 border-t border-[#ECECF0] pt-4 text-[11px] text-slate-400 dark:border-[#28283E]">
                    Need assistance? Contact your organization administrator or workspace owner.
                </div>
            </div>
        </div>
    );
}
