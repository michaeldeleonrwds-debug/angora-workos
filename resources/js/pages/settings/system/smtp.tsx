import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { Check, CheckCircle2, Loader2, Mail, PlayCircle, Send, XCircle } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface SmtpData {
    mail_mailer: string;
    mail_host: string;
    mail_port: number;
    mail_username: string;
    has_password: boolean;
    mail_encryption: string;
    mail_from_address: string;
    mail_from_name: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
    { title: 'System', href: '/settings' },
    { title: 'Email / SMTP', href: '/settings/system/smtp' },
];

export default function SmtpSettings({ smtp }: { smtp: SmtpData }) {
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        mail_mailer: smtp?.mail_mailer || 'smtp',
        mail_host: smtp?.mail_host || '127.0.0.1',
        mail_port: smtp?.mail_port || 2525,
        mail_username: smtp?.mail_username || '',
        mail_password: smtp?.has_password ? '••••••••' : '',
        mail_encryption: smtp?.mail_encryption || 'tls',
        mail_from_address: smtp?.mail_from_address || 'noreply@angora.test',
        mail_from_name: smtp?.mail_from_name || 'Angora Work OS',
    });

    const [testingConnection, setTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('settings.system.smtp.update'), {
            preserveScroll: true,
        });
    };

    const handleTestConnection = async () => {
        setTestingConnection(true);
        setTestResult(null);
        try {
            const res = await fetch(route('settings.system.smtp.test'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });
            const result = await res.json();
            setTestResult(result);
        } catch (e: any) {
            setTestResult({
                success: false,
                message: 'Error executing SMTP connection probe: ' + (e.message || 'Network error'),
            });
        } finally {
            setTestingConnection(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="SMTP / Email Settings" />

            <SettingsLayout
                title="Email & SMTP Infrastructure"
                description="Configure outgoing mail server parameters, authentication credentials, and sender addresses"
            >
                <div className="space-y-6">
                    <form onSubmit={submit} className="space-y-6">
                        <div className="rounded-xl border border-white/[0.08] bg-[#19192A]/40 p-5">
                            <div className="mb-5 flex items-center justify-between border-b border-white/[0.06] pb-3">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-[#fdab3d]" />
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">SMTP Transport Parameters</h3>
                                </div>
                                <span className="text-[11px] text-slate-400">Encrypted in Vault</span>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl">
                                <div className="space-y-1.5">
                                    <Label htmlFor="mail_mailer" className="text-xs font-semibold text-slate-300">
                                        Mail Driver
                                    </Label>
                                    <select
                                        id="mail_mailer"
                                        value={data.mail_mailer}
                                        onChange={(e) => setData('mail_mailer', e.target.value)}
                                        className="h-10 w-full rounded-xl border border-white/10 bg-[#19192A] px-3 text-xs text-white focus:border-[#0073ea] focus:ring-[#0073ea]"
                                    >
                                        <option value="smtp">SMTP (Recommended for Production / Dev)</option>
                                        <option value="log">Log (Local development testing)</option>
                                        <option value="sendmail">Sendmail</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="mail_host" className="text-xs font-semibold text-slate-300">
                                        SMTP Host
                                    </Label>
                                    <Input
                                        id="mail_host"
                                        value={data.mail_host}
                                        onChange={(e) => setData('mail_host', e.target.value)}
                                        required
                                        className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                        placeholder="e.g. smtp.mailgun.org or 127.0.0.1"
                                    />
                                    <InputError className="text-xs text-red-400" message={errors.mail_host} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="mail_port" className="text-xs font-semibold text-slate-300">
                                        Port
                                    </Label>
                                    <Input
                                        id="mail_port"
                                        type="number"
                                        value={data.mail_port}
                                        onChange={(e) => setData('mail_port', parseInt(e.target.value) || 25)}
                                        required
                                        className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                        placeholder="587, 465, or 2525"
                                    />
                                    <InputError className="text-xs text-red-400" message={errors.mail_port} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="mail_encryption" className="text-xs font-semibold text-slate-300">
                                        Encryption
                                    </Label>
                                    <select
                                        id="mail_encryption"
                                        value={data.mail_encryption}
                                        onChange={(e) => setData('mail_encryption', e.target.value)}
                                        className="h-10 w-full rounded-xl border border-white/10 bg-[#19192A] px-3 text-xs text-white focus:border-[#0073ea] focus:ring-[#0073ea]"
                                    >
                                        <option value="tls">TLS (STARTTLS)</option>
                                        <option value="ssl">SSL</option>
                                        <option value="none">None / Plain</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="mail_username" className="text-xs font-semibold text-slate-300">
                                        SMTP Username
                                    </Label>
                                    <Input
                                        id="mail_username"
                                        value={data.mail_username}
                                        onChange={(e) => setData('mail_username', e.target.value)}
                                        className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                        placeholder="username or API key"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="mail_password" className="text-xs font-semibold text-slate-300">
                                        SMTP Password
                                    </Label>
                                    <Input
                                        id="mail_password"
                                        type="password"
                                        value={data.mail_password}
                                        onChange={(e) => setData('mail_password', e.target.value)}
                                        className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                        placeholder={smtp?.has_password ? 'Leave unchanged or type new' : 'Enter password'}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sender Addresses */}
                        <div className="rounded-xl border border-white/[0.08] bg-[#19192A]/40 p-5">
                            <div className="mb-5 border-b border-white/[0.06] pb-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Default Sender Identity</h3>
                                <p className="mt-0.5 text-xs text-slate-400">Configure the default From name and address on outgoing emails</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl">
                                <div className="space-y-1.5">
                                    <Label htmlFor="mail_from_address" className="text-xs font-semibold text-slate-300">
                                        From Email Address
                                    </Label>
                                    <Input
                                        id="mail_from_address"
                                        type="email"
                                        value={data.mail_from_address}
                                        onChange={(e) => setData('mail_from_address', e.target.value)}
                                        required
                                        className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                        placeholder="noreply@angora.test"
                                    />
                                    <InputError className="text-xs text-red-400" message={errors.mail_from_address} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="mail_from_name" className="text-xs font-semibold text-slate-300">
                                        From Display Name
                                    </Label>
                                    <Input
                                        id="mail_from_name"
                                        value={data.mail_from_name}
                                        onChange={(e) => setData('mail_from_name', e.target.value)}
                                        required
                                        className="h-10 rounded-xl border-white/10 bg-[#19192A] text-xs text-white placeholder-slate-500 focus:border-[#0073ea] focus:ring-[#0073ea]"
                                        placeholder="Angora Work OS"
                                    />
                                    <InputError className="text-xs text-red-400" message={errors.mail_from_name} />
                                </div>
                            </div>
                        </div>

                        {/* Test Probe Output */}
                        {testResult && (
                            <div
                                className={`flex items-start gap-3 rounded-xl border p-4 text-xs ${
                                    testResult.success
                                        ? 'border-[#00c875]/30 bg-[#00c875]/10 text-white'
                                        : 'border-red-500/30 bg-red-500/10 text-red-200'
                                }`}
                            >
                                {testResult.success ? (
                                    <CheckCircle2 className="h-4 w-4 text-[#00c875] shrink-0 mt-0.5" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <div className="font-bold">{testResult.success ? 'Connection Succeeded' : 'Connection Failed'}</div>
                                    <div className="mt-0.5">{testResult.message}</div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                type="submit"
                                disabled={processing}
                                className="h-9 gap-1.5 rounded-xl bg-[#0073ea] px-5 text-xs font-semibold text-white hover:bg-[#0060c0]"
                            >
                                {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>Save SMTP Settings</span>}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleTestConnection}
                                disabled={testingConnection}
                                className="h-9 gap-1.5 rounded-xl border-white/10 bg-white/[0.04] px-4 text-xs font-medium text-slate-200 hover:bg-white/[0.08] hover:text-white"
                            >
                                {testingConnection ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#fdab3d]" />
                                        <span>Probing Socket...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-3.5 w-3.5 text-[#fdab3d]" />
                                        <span>Test Connection</span>
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
                                    <span>SMTP settings saved</span>
                                </div>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
