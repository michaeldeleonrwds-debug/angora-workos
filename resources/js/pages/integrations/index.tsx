import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { CheckCircle2, Figma, GitBranch, HardDrive, MessageSquare, Palette, Puzzle, ShieldCheck, XCircle } from 'lucide-react';
import React, { useState } from 'react';

interface IntegrationItem {
    provider: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    status: 'connected' | 'disconnected' | 'error';
    account_identifier?: string | null;
    last_synced_at?: string | null;
    id?: number | null;
}

interface Props {
    integrations: IntegrationItem[];
}

export default function IntegrationsCenter({ integrations }: Props) {
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [connectingItem, setConnectingItem] = useState<IntegrationItem | null>(null);
    const [accountIdentifier, setAccountIdentifier] = useState('');
    const [apiToken, setApiToken] = useState('');
    const [loading, setLoading] = useState(false);

    const categories = ['All', 'Cloud Storage', 'Team Chat', 'Code & DevOps', 'Design & Creative'];

    const filtered = selectedCategory === 'All' ? integrations : integrations.filter((item) => item.category === selectedCategory);

    const getIconComponent = (iconName: string) => {
        switch (iconName) {
            case 'HardDrive':
                return <HardDrive className="h-6 w-6 text-amber-500" />;
            case 'MessageSquare':
                return <MessageSquare className="h-6 w-6 text-emerald-500" />;
            case 'GitBranch':
                return <GitBranch className="h-6 w-6 text-slate-800 dark:text-white" />;
            case 'Figma':
                return <Figma className="h-6 w-6 text-purple-500" />;
            case 'Palette':
                return <Palette className="h-6 w-6 text-cyan-500" />;
            default:
                return <Puzzle className="h-6 w-6 text-indigo-500" />;
        }
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!connectingItem) return;

        setLoading(true);
        try {
            const res = await axios.post('/integrations/connect', {
                provider: connectingItem.provider,
                account_identifier: accountIdentifier || `${connectingItem.name} Workspace`,
                api_token: apiToken || 'token_sample',
            });

            if (res.data.success) {
                setConnectingItem(null);
                setAccountIdentifier('');
                setApiToken('');
                router.reload();
            }
        } catch (err: any) {
            alert('Failed to connect integration: ' + (err.response?.data?.message || 'Error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async (id: number) => {
        if (!confirm('Are you sure you want to disconnect this service?')) return;
        try {
            await axios.delete(`/integrations/${id}`);
            router.reload();
        } catch (err) {
            console.error('Failed to disconnect:', err);
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Integrations Center', href: '/integrations' }]}>
            <Head title="Integrations Center — Angora Work OS" />

            <div className="min-h-screen bg-[#F8F9F7] p-6 md:p-8 dark:bg-[#161624]">
                <div className="mx-auto max-w-6xl space-y-6">
                    {/* Header */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="rounded-xl border border-[#5f27cd]/40 bg-[#5f27cd]/20 p-2 text-[#461b9a] dark:text-[#a25ddc]">
                                    <Puzzle className="h-5 w-5" />
                                </span>
                                <h1 className="text-xl font-black tracking-tight text-[#191927] dark:text-white">Third-Party Integration Center</h1>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                Connect external agency and development tools to synchronize deliverables, notifications, code reviews, and cloud
                                assets.
                            </p>
                        </div>

                        {/* Category filter pills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                                        selectedCategory === cat
                                            ? 'bg-[#191927] text-white dark:bg-[#D8F779] dark:text-[#191927]'
                                            : 'border border-[#ECECF0] bg-white text-slate-600 hover:bg-slate-50 dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-slate-300'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Integrations Grid */}
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((item) => {
                            const isConnected = item.status === 'connected';

                            return (
                                <div
                                    key={item.provider}
                                    className="flex flex-col justify-between rounded-3xl border border-[#ECECF0] bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-[#28283E] dark:bg-[#1E1E2F]"
                                >
                                    <div>
                                        <div className="mb-4 flex items-center justify-between">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ECECF0] bg-slate-50 dark:border-[#28283E] dark:bg-[#161624]">
                                                {getIconComponent(item.icon)}
                                            </div>
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                                    isConnected
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                        : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                                                }`}
                                            >
                                                {isConnected ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                {isConnected ? 'Connected' : 'Not Connected'}
                                            </span>
                                        </div>

                                        <h3 className="mb-1 text-sm font-bold text-[#191927] dark:text-white">{item.name}</h3>
                                        <p className="mb-4 text-xs leading-relaxed text-slate-500">{item.description}</p>

                                        {isConnected && item.account_identifier && (
                                            <div className="mb-4 rounded-xl border border-[#ECECF0] bg-slate-50 p-2.5 text-[11px] dark:border-[#28283E] dark:bg-[#161624]">
                                                <div className="font-semibold text-slate-400">Account:</div>
                                                <div className="truncate font-bold text-slate-700 dark:text-slate-200">{item.account_identifier}</div>
                                                {item.last_synced_at && (
                                                    <div className="mt-1 text-[10px] text-slate-400">
                                                        Last synced: {new Date(item.last_synced_at).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/5">
                                        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{item.category}</span>

                                        {isConnected ? (
                                            <button
                                                onClick={() => handleDisconnect(item.id!)}
                                                className="text-xs font-bold text-red-500 transition-colors hover:text-red-700"
                                            >
                                                Disconnect
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setConnectingItem(item)}
                                                className="rounded-xl bg-[#191927] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-black dark:bg-[#D8F779] dark:text-[#191927]"
                                            >
                                                Connect
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Connect Modal */}
            {connectingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl border border-[#ECECF0] bg-white p-6 shadow-2xl dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-[#161624]">
                                {getIconComponent(connectingItem.icon)}
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-[#191927] dark:text-white">Connect {connectingItem.name}</h3>
                                <p className="text-xs text-slate-500">Provide authorization or API credentials</p>
                            </div>
                        </div>

                        <form onSubmit={handleConnect} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Account / Workspace Identifier
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={accountIdentifier}
                                    onChange={(e) => setAccountIdentifier(e.target.value)}
                                    placeholder={connectingItem.provider === 'slack' ? '#general-notifications' : 'Main Workspace / Repo'}
                                    className="w-full rounded-xl border border-[#ECECF0] bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-[#28283E] dark:bg-[#161624] dark:text-slate-200"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">API Key / OAuth Token</label>
                                <input
                                    type="password"
                                    value={apiToken}
                                    onChange={(e) => setApiToken(e.target.value)}
                                    placeholder="Stored with AES-256-CBC encryption"
                                    className="w-full rounded-xl border border-[#ECECF0] bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-[#28283E] dark:bg-[#161624] dark:text-slate-200"
                                />
                                <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                                    Credentials are encrypted server-side and never exposed to the frontend.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setConnectingItem(null)}
                                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="rounded-xl bg-[#191927] px-4 py-2 text-xs font-bold text-white hover:bg-black dark:bg-[#D8F779] dark:text-[#191927]"
                                >
                                    {loading ? 'Connecting...' : 'Authorize & Connect'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
