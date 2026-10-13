import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { AlertCircle, BookOpen, Check, CheckCircle2, Code2, Copy, ExternalLink, Key, Plus, Send, Trash2, Webhook, XCircle } from 'lucide-react';
import React, { useState } from 'react';

interface ApiToken {
    id: number;
    name: string;
    token_prefix: string;
    scopes: string[];
    last_used_at: string | null;
    expires_at: string | null;
    is_revoked: boolean;
    created_at: string;
}

interface WebhookSubscription {
    id: number;
    name: string;
    url: string;
    events: string[];
    is_active: boolean;
    failure_count: number;
    created_at: string;
    deliveries_count?: number;
}

interface WebhookDelivery {
    id: number;
    subscription_id: number;
    event: string;
    status_code: number | null;
    is_successful: boolean;
    attempts: number;
    created_at: string;
    payload: any;
    response_body: string | null;
    subscription?: {
        name: string;
    };
}

interface Props {
    tokens: ApiToken[];
    webhooks: WebhookSubscription[];
    recentDeliveries: WebhookDelivery[];
    recentRequestLogs: any[];
}

export default function DeveloperHub({ tokens, webhooks, recentDeliveries }: Props) {
    const [activeTab, setActiveTab] = useState<'tokens' | 'webhooks' | 'docs'>('tokens');

    // Token creation modal
    const [showTokenModal, setShowTokenModal] = useState(false);
    const [tokenName, setTokenName] = useState('');
    const [tokenScopes, setTokenScopes] = useState<string[]>(['*']);
    const [tokenExpiryDays, setTokenExpiryDays] = useState(30);
    const [generatedToken, setGeneratedToken] = useState<string | null>(null);
    const [copiedToken, setCopiedToken] = useState(false);
    const [creatingToken, setCreatingToken] = useState(false);

    // Webhook creation modal
    const [showWebhookModal, setShowWebhookModal] = useState(false);
    const [webhookName, setWebhookName] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookEvents, setWebhookEvents] = useState<string[]>(['task.created', 'task.status_changed']);
    const [creatingWebhook, setCreatingWebhook] = useState(false);
    const [testingId, setTestingId] = useState<number | null>(null);

    const handleCreateToken = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingToken(true);
        try {
            const res = await axios.post('/developer/tokens', {
                name: tokenName,
                scopes: tokenScopes,
                expires_days: tokenExpiryDays,
            });

            if (res.data.success) {
                setGeneratedToken(res.data.plain_text_token);
            }
        } catch (err) {
            console.error('Failed to create token:', err);
        } finally {
            setCreatingToken(false);
        }
    };

    const handleRevokeToken = async (id: number) => {
        if (!confirm('Are you sure you want to revoke this API token? Any client using it will lose access.')) return;
        try {
            await axios.delete(`/developer/tokens/${id}`);
            router.reload();
        } catch (err) {
            console.error('Failed to revoke token:', err);
        }
    };

    const handleCreateWebhook = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingWebhook(true);
        try {
            const res = await axios.post('/developer/webhooks', {
                name: webhookName,
                url: webhookUrl,
                events: webhookEvents,
            });

            if (res.data.success) {
                setShowWebhookModal(false);
                setWebhookName('');
                setWebhookUrl('');
                router.reload();
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to create webhook subscription.');
        } finally {
            setCreatingWebhook(false);
        }
    };

    const handleDeleteWebhook = async (id: number) => {
        if (!confirm('Delete this webhook subscription?')) return;
        try {
            await axios.delete(`/developer/webhooks/${id}`);
            router.reload();
        } catch (err) {
            console.error('Failed to delete webhook:', err);
        }
    };

    const handleTestWebhook = async (id: number) => {
        setTestingId(id);
        try {
            const res = await axios.post(`/developer/webhooks/${id}/test`);
            alert(res.data.message);
            router.reload();
        } catch (err: any) {
            alert('Test ping failed: ' + (err.response?.data?.message || 'Server error'));
        } finally {
            setTestingId(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Developer Hub', href: '/developer' }]}>
            <Head title="Developer Hub & REST API — Angora Work OS" />

            <div className="min-h-screen bg-[#F8F9F7] p-6 md:p-8 dark:bg-[#161624]">
                <div className="mx-auto max-w-6xl space-y-6">
                    {/* Header */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="rounded-xl border border-[#00d2d3]/40 bg-[#00d2d3]/20 p-2 text-[#009697] dark:text-[#00d2d3]">
                                    <Code2 className="h-5 w-5" />
                                </span>
                                <h1 className="text-xl font-black tracking-tight text-[#191927] dark:text-white">Developer Hub & API</h1>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                Secure programmatic access to Angora Work OS via REST API v1, Personal Access Tokens, and signed Webhooks.
                            </p>
                        </div>

                        {/* Tab Selector */}
                        <div className="flex items-center gap-1 rounded-2xl border border-[#ECECF0] bg-white p-1 shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                            <button
                                onClick={() => setActiveTab('tokens')}
                                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                    activeTab === 'tokens'
                                        ? 'bg-[#191927] text-white dark:bg-[#D8F779] dark:text-[#191927]'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                                }`}
                            >
                                <Key className="h-3.5 w-3.5" />
                                <span>API Tokens</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('webhooks')}
                                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                    activeTab === 'webhooks'
                                        ? 'bg-[#191927] text-white dark:bg-[#D8F779] dark:text-[#191927]'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                                }`}
                            >
                                <Webhook className="h-3.5 w-3.5" />
                                <span>Webhooks</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('docs')}
                                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                    activeTab === 'docs'
                                        ? 'bg-[#191927] text-white dark:bg-[#D8F779] dark:text-[#191927]'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                                }`}
                            >
                                <BookOpen className="h-3.5 w-3.5" />
                                <span>Documentation</span>
                            </button>
                        </div>
                    </div>

                    {/* Tab 1: Personal Access Tokens */}
                    {activeTab === 'tokens' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-[#191927] dark:text-white">Active Personal Access Tokens</h3>
                                <button
                                    onClick={() => {
                                        setGeneratedToken(null);
                                        setShowTokenModal(true);
                                    }}
                                    className="flex items-center gap-1.5 rounded-xl bg-[#191927] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-black dark:bg-[#D8F779] dark:text-[#191927]"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Generate New Token</span>
                                </button>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b border-[#ECECF0] bg-slate-50/50 font-bold text-slate-500 dark:border-[#28283E] dark:bg-black/20">
                                        <tr>
                                            <th className="px-4 py-3">Token Name</th>
                                            <th className="px-4 py-3">Prefix</th>
                                            <th className="px-4 py-3">Scopes</th>
                                            <th className="px-4 py-3">Last Used</th>
                                            <th className="px-4 py-3">Expires</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ECECF0] dark:divide-[#28283E]">
                                        {tokens.map((token) => (
                                            <tr key={token.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{token.name}</td>
                                                <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{token.token_prefix}••••</td>
                                                <td className="px-4 py-3">
                                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                                                        {(token.scopes || []).join(', ') || '*'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    {token.last_used_at ? new Date(token.last_used_at).toLocaleDateString() : 'Never'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    {token.expires_at ? new Date(token.expires_at).toLocaleDateString() : 'Never'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {token.is_revoked ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                                                            <XCircle className="h-3 w-3" /> Revoked
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                            <CheckCircle2 className="h-3 w-3" /> Active
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {!token.is_revoked && (
                                                        <button
                                                            onClick={() => handleRevokeToken(token.id)}
                                                            className="rounded-lg p-1 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20"
                                                            title="Revoke Token"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {tokens.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                                    No API tokens generated yet. Click "Generate New Token" above to get started.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Outbound Webhooks */}
                    {activeTab === 'webhooks' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-[#191927] dark:text-white">Webhook Subscriptions</h3>
                                    <p className="text-[11px] text-slate-500">
                                        Deliver events in real-time with HMAC SHA-256 signatures in the <code>X-Angora-Signature</code> header.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowWebhookModal(true)}
                                    className="flex items-center gap-1.5 rounded-xl bg-[#191927] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-black dark:bg-[#D8F779] dark:text-[#191927]"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Add Endpoint</span>
                                </button>
                            </div>

                            {/* Subscriptions Grid */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {webhooks.map((sub) => (
                                    <div
                                        key={sub.id}
                                        className="flex flex-col justify-between rounded-2xl border border-[#ECECF0] bg-white p-4 shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]"
                                    >
                                        <div>
                                            <div className="mb-2 flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-[#191927] dark:text-white">{sub.name}</h4>
                                                <span
                                                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                                        sub.failure_count > 3
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                    }`}
                                                >
                                                    {sub.failure_count > 3 ? 'Degraded' : 'Active'}
                                                </span>
                                            </div>
                                            <div className="mb-3 truncate rounded-lg border border-[#ECECF0] bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-500 dark:border-[#28283E] dark:bg-[#161624]">
                                                {sub.url}
                                            </div>
                                            <div className="mb-3 flex flex-wrap gap-1">
                                                {sub.events.map((ev, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                                                    >
                                                        {ev}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-white/5">
                                            <button
                                                onClick={() => handleTestWebhook(sub.id)}
                                                disabled={testingId === sub.id}
                                                className="flex items-center gap-1 font-semibold text-[#5B309A] hover:underline disabled:opacity-50 dark:text-[#D8B4FE]"
                                            >
                                                <Send className="h-3 w-3" />
                                                <span>{testingId === sub.id ? 'Sending ping...' : 'Send Test Ping'}</span>
                                            </button>
                                            <button onClick={() => handleDeleteWebhook(sub.id)} className="text-red-500 hover:text-red-700">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {webhooks.length === 0 && (
                                    <div className="col-span-2 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-400 dark:border-white/10">
                                        No outbound webhook subscriptions configured yet.
                                    </div>
                                )}
                            </div>

                            {/* Recent Delivery Logs */}
                            <div>
                                <h3 className="mb-2 text-sm font-bold text-[#191927] dark:text-white">Recent Webhook Deliveries</h3>
                                <div className="overflow-hidden rounded-2xl border border-[#ECECF0] bg-white dark:border-[#28283E] dark:bg-[#1E1E2F]">
                                    <table className="w-full text-left text-xs">
                                        <thead className="border-b border-[#ECECF0] bg-slate-50/50 font-bold text-slate-500 dark:border-[#28283E] dark:bg-black/20">
                                            <tr>
                                                <th className="px-4 py-2.5">Event</th>
                                                <th className="px-4 py-2.5">Endpoint</th>
                                                <th className="px-4 py-2.5">Status</th>
                                                <th className="px-4 py-2.5">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#ECECF0] dark:divide-[#28283E]">
                                            {recentDeliveries.map((del) => (
                                                <tr key={del.id}>
                                                    <td className="px-4 py-2.5 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                                        {del.event}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-slate-500">
                                                        {del.subscription?.name || `#${del.subscription_id}`}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        {del.is_successful ? (
                                                            <span className="font-semibold text-emerald-600">{del.status_code || 200} OK</span>
                                                        ) : (
                                                            <span className="font-semibold text-red-500">{del.status_code || 'Failed'}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-[11px] text-slate-400">
                                                        {new Date(del.created_at).toLocaleTimeString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {recentDeliveries.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-4 text-center text-slate-400">
                                                        No delivery attempts recorded yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Interactive Documentation & OpenAPI Specification */}
                    {activeTab === 'docs' && (
                        <div className="space-y-6">
                            <div className="rounded-2xl border border-[#ECECF0] bg-white p-6 shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-[#191927] dark:text-white">OpenAPI 3.0 REST Specification</h3>
                                        <p className="text-xs text-slate-500">
                                            Machine-readable schema available at <code>/api/v1/openapi.json</code>
                                        </p>
                                    </div>
                                    <a
                                        href="/api/v1/openapi.json"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        <span>View Raw JSON</span>
                                    </a>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">Example: List Kanban Tasks</h4>
                                        <div className="overflow-x-auto rounded-xl bg-[#12121E] p-4 font-mono text-[11px] text-slate-200">
                                            curl -X GET "https://angora.work/api/v1/tasks?board_id=1&priority=high" \<br />
                                            &nbsp;&nbsp;-H "Authorization: Bearer angora_pat_YOUR_TOKEN_HERE" \<br />
                                            &nbsp;&nbsp;-H "Accept: application/json"
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">Example: Create New Task</h4>
                                        <div className="overflow-x-auto rounded-xl bg-[#12121E] p-4 font-mono text-[11px] text-slate-200">
                                            curl -X POST "https://angora.work/api/v1/tasks" \<br />
                                            &nbsp;&nbsp;-H "Authorization: Bearer angora_pat_YOUR_TOKEN_HERE" \<br />
                                            &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                                            &nbsp;&nbsp;-d '&#123;"board_id": 1, "title": "Deploy API Webhooks", "priority": "urgent"&#125;'
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Token Generation Modal */}
            {showTokenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl border border-[#ECECF0] bg-white p-6 shadow-2xl dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <h3 className="mb-3 text-base font-bold text-[#191927] dark:text-white">
                            {generatedToken ? 'API Token Generated' : 'Create Personal Access Token'}
                        </h3>

                        {generatedToken ? (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-200">
                                    <AlertCircle className="mr-1 inline h-4 w-4 text-amber-600" />
                                    Make sure to copy your personal access token now. You won't be able to see it again!
                                </div>

                                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100 p-3 font-mono text-xs break-all text-slate-800 dark:border-white/10 dark:bg-[#12121E] dark:text-slate-200">
                                    <span>{generatedToken}</span>
                                    <button
                                        onClick={() => copyToClipboard(generatedToken)}
                                        className="ml-2 shrink-0 rounded-lg bg-white p-1.5 hover:bg-slate-200 dark:bg-white/10"
                                        title="Copy token"
                                    >
                                        {copiedToken ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        setShowTokenModal(false);
                                        setGeneratedToken(null);
                                        router.reload();
                                    }}
                                    className="w-full rounded-xl bg-[#191927] py-2.5 text-xs font-bold text-white dark:bg-[#D8F779] dark:text-[#191927]"
                                >
                                    I Have Saved My Token
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateToken} className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Token Description / App Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={tokenName}
                                        onChange={(e) => setTokenName(e.target.value)}
                                        placeholder="e.g., CI/CD Deployment Bot"
                                        className="w-full rounded-xl border border-[#ECECF0] bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-[#28283E] dark:bg-[#161624] dark:text-slate-200"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Expiration</label>
                                    <select
                                        value={tokenExpiryDays}
                                        onChange={(e) => setTokenExpiryDays(Number(e.target.value))}
                                        className="w-full rounded-xl border border-[#ECECF0] bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-[#28283E] dark:bg-[#161624] dark:text-slate-200"
                                    >
                                        <option value={7}>7 Days</option>
                                        <option value={30}>30 Days</option>
                                        <option value={90}>90 Days</option>
                                        <option value={365}>1 Year</option>
                                    </select>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowTokenModal(false)}
                                        className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creatingToken}
                                        className="rounded-xl bg-[#191927] px-4 py-2 text-xs font-bold text-white hover:bg-black dark:bg-[#D8F779] dark:text-[#191927]"
                                    >
                                        Generate Token
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Webhook Endpoint Modal */}
            {showWebhookModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl border border-[#ECECF0] bg-white p-6 shadow-2xl dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <h3 className="mb-3 text-base font-bold text-[#191927] dark:text-white">Add Webhook Subscription</h3>
                        <form onSubmit={handleCreateWebhook} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={webhookName}
                                    onChange={(e) => setWebhookName(e.target.value)}
                                    placeholder="e.g. Production Slack Sync"
                                    className="w-full rounded-xl border border-[#ECECF0] bg-slate-50 px-3 py-2 text-xs dark:border-[#28283E] dark:bg-[#161624]"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Endpoint URL (HTTPS)</label>
                                <input
                                    type="url"
                                    required
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    placeholder="https://your-server.com/webhooks/angora"
                                    className="w-full rounded-xl border border-[#ECECF0] bg-slate-50 px-3 py-2 text-xs dark:border-[#28283E] dark:bg-[#161624]"
                                />
                                <p className="mt-1 text-[10px] text-slate-400">
                                    SSRF protection is enabled. Localhost, loopback, and RFC-1918 private IPs are blocked.
                                </p>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Subscribed Events</label>
                                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                                    {['task.created', 'task.status_changed', 'task.updated', 'comment.added', 'deliverable.submitted'].map((ev) => (
                                        <label key={ev} className="flex cursor-pointer items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={webhookEvents.includes(ev)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setWebhookEvents([...webhookEvents, ev]);
                                                    else setWebhookEvents(webhookEvents.filter((x) => x !== ev));
                                                }}
                                                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                            />
                                            <span>
                                                <code>{ev}</code>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowWebhookModal(false)}
                                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingWebhook}
                                    className="rounded-xl bg-[#191927] px-4 py-2 text-xs font-bold text-white hover:bg-black dark:bg-[#D8F779] dark:text-[#191927]"
                                >
                                    Register Webhook
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
