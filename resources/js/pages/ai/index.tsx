import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { BarChart3, Bot, CheckCircle2, ExternalLink, Layers, Plus, RefreshCw, Send, Settings, Sparkles, User, XCircle, Zap } from 'lucide-react';
import React, { useState } from 'react';

interface AiMessage {
    id: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tool_calls?: {
        action: string;
        tasks?: Array<{
            title: string;
            description?: string;
            priority?: string;
            subtasks?: string[];
        }>;
        rule?: {
            name: string;
            trigger_type: string;
            trigger_config: any;
            conditions: any[];
            action_type: string;
            action_config: any;
        };
        improved_text?: string;
    } | null;
    citations?: Array<{
        type: string;
        id: number;
        title: string;
    }> | null;
    tokens_used: number;
    created_at: string;
}

interface AiConversation {
    id: number;
    title: string;
    context_type: string;
    created_at: string;
    messages?: AiMessage[];
}

interface AiConfig {
    provider: string;
    model: string;
    has_key: boolean;
    monthly_token_cap: number;
    monthly_spend_cap: number;
}

interface Props {
    conversations: AiConversation[];
    activeConversation?: AiConversation | null;
    activeConfig?: AiConfig | null;
    usage: {
        monthly_tokens: number;
        monthly_spend: number;
    };
    boards: Array<{ id: number; title: string }>;
}

export default function AiWorkspace({ conversations, activeConversation, activeConfig, usage, boards }: Props) {
    const [inputPrompt, setInputPrompt] = useState('');
    const [sending, setSending] = useState(false);
    const [currentConversation, setCurrentConversation] = useState<AiConversation | null>(activeConversation || null);
    const [messages, setMessages] = useState<AiMessage[]>(activeConversation?.messages || []);

    // Approval states
    const [selectedBoardId, setSelectedBoardId] = useState<number>(boards[0]?.id || 1);
    const [approvedActions, setApprovedActions] = useState<Record<number, boolean>>({});
    const [approving, setApproving] = useState(false);

    // Settings Modal
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [provider, setProvider] = useState(activeConfig?.provider || 'openai');
    const [model, setModel] = useState(activeConfig?.model || 'gpt-4o');
    const [apiKey, setApiKey] = useState('');
    const [monthlyTokenCap, setMonthlyTokenCap] = useState(activeConfig?.monthly_token_cap || 1000000);
    const [monthlySpendCap, setMonthlySpendCap] = useState(activeConfig?.monthly_spend_cap || 50);
    const [savingSettings, setSavingSettings] = useState(false);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputPrompt.trim() || sending) return;

        const text = inputPrompt.trim();
        setInputPrompt('');
        setSending(true);

        try {
            let convId = currentConversation?.id;

            // If no conversation yet, create one
            if (!convId) {
                const convRes = await axios.post('/ai/conversations', {
                    context_type: 'general',
                });
                convId = convRes.data.conversation.id;
                setCurrentConversation(convRes.data.conversation);
            }

            // Optimistic message
            const optimisticMsg: AiMessage = {
                id: Date.now(),
                role: 'user',
                content: text,
                tokens_used: 0,
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, optimisticMsg]);

            const res = await axios.post(`/ai/conversations/${convId}/messages`, {
                message: text,
            });

            if (res.data.success) {
                setMessages((prev) => [...prev, res.data.message]);
                if (res.data.conversation) {
                    setCurrentConversation(res.data.conversation);
                }
            }
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setSending(false);
        }
    };

    const handleNewConversation = async () => {
        try {
            const res = await axios.post('/ai/conversations', { context_type: 'general' });
            if (res.data.success) {
                router.visit(`/ai?conversation_id=${res.data.conversation.id}`);
            }
        } catch (err) {
            console.error('Failed to create new conversation:', err);
        }
    };

    const handleApproveTasks = async (messageId: number, tasks: any[]) => {
        setApproving(true);
        try {
            const res = await axios.post('/ai/actions/approve-tasks', {
                board_id: selectedBoardId,
                tasks: tasks,
            });

            if (res.data.success) {
                setApprovedActions((prev) => ({ ...prev, [messageId]: true }));
            }
        } catch (err) {
            console.error('Failed to approve tasks:', err);
        } finally {
            setApproving(false);
        }
    };

    const handleApproveAutomation = async (messageId: number, rule: any) => {
        setApproving(true);
        try {
            const res = await axios.post('/ai/actions/approve-automation', {
                board_id: selectedBoardId,
                rule: rule,
            });

            if (res.data.success) {
                setApprovedActions((prev) => ({ ...prev, [messageId]: true }));
            }
        } catch (err) {
            console.error('Failed to approve automation:', err);
        } finally {
            setApproving(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingSettings(true);
        try {
            await axios.post('/ai/settings', {
                provider,
                model,
                api_key: apiKey || null,
                monthly_token_cap: monthlyTokenCap,
                monthly_spend_cap: monthlySpendCap,
            });
            setShowSettingsModal(false);
            router.reload();
        } catch (err) {
            console.error('Failed to save AI config:', err);
        } finally {
            setSavingSettings(false);
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Angora AI Copilot', href: '/ai' }]}>
            <Head title="Angora AI Copilot — Work Management Assistant" />

            <div className="flex h-[calc(100vh-4.25rem)] overflow-hidden bg-[#F8F9F7] dark:bg-[#161624]">
                {/* 1. Left Sidebar: Conversations & Usage Cap */}
                <div className="flex w-80 shrink-0 flex-col justify-between border-r border-[#ECECF0] bg-white dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <div>
                        {/* Header & New Chat */}
                        <div className="border-b border-[#ECECF0] p-4 dark:border-[#28283E]">
                            <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#D8F779]/40 bg-[#D8F779]/20 text-[#557b0b] dark:text-[#D8F779]">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm leading-tight font-bold text-[#191927] dark:text-white">Angora AI</h2>
                                        <p className="text-[11px] text-slate-500">Workspace Copilot</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowSettingsModal(true)}
                                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
                                    title="AI Provider & Model Settings"
                                >
                                    <Settings className="h-4 w-4" />
                                </button>
                            </div>

                            <button
                                onClick={handleNewConversation}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#191927] px-3 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-black dark:bg-[#D8F779] dark:text-[#191927] dark:hover:bg-[#c9eb60]"
                            >
                                <Plus className="h-4 w-4" />
                                <span>New Conversation</span>
                            </button>
                        </div>

                        {/* Conversation List */}
                        <div className="max-h-[calc(100vh-16rem)] space-y-1 overflow-y-auto p-2">
                            {conversations.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => router.visit(`/ai?conversation_id=${c.id}`)}
                                    className={`w-full rounded-xl px-3 py-2.5 text-left text-xs transition-all ${
                                        currentConversation?.id === c.id
                                            ? 'bg-[#E9DDFB] font-bold text-[#5B309A] dark:bg-[#3D2C5E] dark:text-[#D8B4FE]'
                                            : 'font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <div className="truncate">{c.title}</div>
                                    <div className="mt-0.5 text-[10px] text-slate-400">{new Date(c.created_at).toLocaleDateString()}</div>
                                </button>
                            ))}
                            {conversations.length === 0 && (
                                <div className="py-8 text-center text-xs text-slate-400">No conversations yet. Start by asking a question!</div>
                            )}
                        </div>
                    </div>

                    {/* Bottom: Monthly Usage Stats */}
                    <div className="border-t border-[#ECECF0] bg-slate-50/50 p-4 dark:border-[#28283E] dark:bg-black/20">
                        <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                            <span className="flex items-center gap-1.5">
                                <BarChart3 className="h-3.5 w-3.5 text-slate-400" /> Monthly Quota
                            </span>
                            <span className="text-[11px] text-[#5B309A] dark:text-[#D8B4FE]">
                                ${(usage.monthly_spend || 0).toFixed(2)} / ${(activeConfig?.monthly_spend_cap || 50).toFixed(0)}
                            </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                            <div
                                className="h-full rounded-full bg-[#D8F779] transition-all"
                                style={{
                                    width: `${Math.min(100, ((usage.monthly_spend || 0) / (activeConfig?.monthly_spend_cap || 50)) * 100)}%`,
                                }}
                            />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                            <span>{(usage.monthly_tokens || 0).toLocaleString()} tokens</span>
                            <span className="capitalize">
                                {activeConfig?.has_key ? `${activeConfig.provider} (${activeConfig.model})` : 'Offline Heuristics'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Main Chat Canvas */}
                <div className="flex flex-1 flex-col justify-between overflow-hidden bg-[#F8F9F7] dark:bg-[#161624]">
                    {/* Top Bar: Target Board Selector */}
                    <div className="flex h-14 items-center justify-between border-b border-[#ECECF0] bg-white/70 px-6 backdrop-blur-md dark:border-[#28283E] dark:bg-[#1E1E2F]/70">
                        <div className="flex items-center gap-2.5">
                            <Bot className="h-4 w-4 text-[#557b0b] dark:text-[#D8F779]" />
                            <h3 className="text-sm font-bold text-[#191927] dark:text-white">
                                {currentConversation?.title || 'Interactive AI Session'}
                            </h3>
                            {activeConfig?.has_key ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                    Live Model: {activeConfig.provider}/{activeConfig.model}
                                </span>
                            ) : (
                                <span
                                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                                    title="No third-party API key configured. Running local deterministic heuristics engine."
                                >
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    [Offline / Local Heuristics Mode]
                                </span>
                            )}
                        </div>

                        {/* Target Board for Approved Tasks */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">Target Board:</span>
                            <select
                                value={selectedBoardId}
                                onChange={(e) => setSelectedBoardId(Number(e.target.value))}
                                className="rounded-xl border border-[#ECECF0] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-[#D8F779] focus:outline-none dark:border-[#28283E] dark:bg-[#161624] dark:text-slate-200"
                            >
                                {boards.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Messages Thread */}
                    <div className="flex-1 space-y-6 overflow-y-auto p-6">
                        {messages.map((m) => (
                            <div key={m.id} className={`flex max-w-3xl gap-3 ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                                <div
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                                        m.role === 'user'
                                            ? 'bg-[#191927] text-white dark:bg-white dark:text-[#191927]'
                                            : 'border border-[#D8F779]/40 bg-[#D8F779]/20 text-[#557b0b] dark:text-[#D8F779]'
                                    }`}
                                >
                                    {m.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                                </div>

                                <div className={`flex flex-col space-y-2 ${m.role === 'user' ? 'items-end' : ''}`}>
                                    <div
                                        className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                                            m.role === 'user'
                                                ? 'rounded-tr-none bg-[#191927] font-medium text-white'
                                                : 'rounded-tl-none border border-[#ECECF0] bg-white text-slate-800 shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-slate-200'
                                        }`}
                                    >
                                        <div className="whitespace-pre-wrap">{m.content}</div>

                                        {/* Citations if available */}
                                        {m.citations && m.citations.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5 dark:border-white/5">
                                                <span className="block w-full text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                                    Referenced Sources:
                                                </span>
                                                {m.citations.map((c, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-white/5 dark:text-slate-300"
                                                    >
                                                        <ExternalLink className="h-2.5 w-2.5" />
                                                        {c.title}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Proposal Card (Human-in-the-Loop Approval) */}
                                    {m.tool_calls && m.tool_calls.action === 'propose_tasks' && m.tool_calls.tasks && (
                                        <div className="w-full max-w-xl rounded-2xl border border-[#D8F779]/40 bg-[#D8F779]/5 p-4 shadow-sm dark:bg-[#D8F779]/10">
                                            <div className="mb-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Layers className="h-4 w-4 text-[#557b0b] dark:text-[#D8F779]" />
                                                    <h4 className="text-xs font-bold text-[#191927] dark:text-white">
                                                        Proposed Work Tasks ({m.tool_calls.tasks.length})
                                                    </h4>
                                                </div>
                                                <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-600 uppercase dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-400">
                                                    Pending Approval
                                                </span>
                                            </div>

                                            <div className="mb-4 space-y-2">
                                                {m.tool_calls.tasks.map((task, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="rounded-xl border border-white/60 bg-white/80 p-2.5 text-xs dark:border-white/10 dark:bg-[#1E1E2F]/80"
                                                    >
                                                        <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                                                            <span>{task.title}</span>
                                                            <span className="text-[10px] font-semibold text-slate-400 uppercase">
                                                                {task.priority || 'medium'}
                                                            </span>
                                                        </div>
                                                        {task.description && <p className="mt-1 text-[11px] text-slate-500">{task.description}</p>}
                                                        {task.subtasks && task.subtasks.length > 0 && (
                                                            <div className="mt-2 space-y-0.5 border-l-2 border-slate-200 pl-2 dark:border-white/10">
                                                                {task.subtasks.map((sub, sIdx) => (
                                                                    <div key={sIdx} className="text-[10px] text-slate-600 dark:text-slate-400">
                                                                        • {sub}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Action Buttons */}
                                            {approvedActions[m.id] ? (
                                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    <span>Tasks successfully approved & added to board!</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleApproveTasks(m.id, m.tool_calls!.tasks!)}
                                                        disabled={approving}
                                                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700 disabled:opacity-50"
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        <span>Approve & Add to Board</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setApprovedActions((prev) => ({ ...prev, [m.id]: false }))}
                                                        className="flex items-center gap-1.5 rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-300 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" />
                                                        <span>Decline</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Action Proposal Card: Proposed Automation Rule */}
                                    {m.tool_calls && m.tool_calls.action === 'propose_automation' && m.tool_calls.rule && (
                                        <div className="w-full max-w-xl rounded-2xl border border-[#C8AEF5]/50 bg-[#C8AEF5]/10 p-4 shadow-sm">
                                            <div className="mb-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Zap className="h-4 w-4 text-[#5B309A] dark:text-[#D8B4FE]" />
                                                    <h4 className="text-xs font-bold text-[#191927] dark:text-white">Proposed Automation Rule</h4>
                                                </div>
                                                <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-purple-700 uppercase dark:bg-purple-950/60 dark:text-purple-300">
                                                    Approval Required
                                                </span>
                                            </div>

                                            <div className="mb-3 space-y-1.5 rounded-xl border border-white/60 bg-white/80 p-3 text-xs dark:border-white/10 dark:bg-[#1E1E2F]/80">
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{m.tool_calls.rule.name}</div>
                                                <div className="text-[11px] text-slate-500">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">Trigger:</span>{' '}
                                                    {m.tool_calls.rule.trigger_type}
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">Action:</span>{' '}
                                                    {m.tool_calls.rule.action_type}
                                                </div>
                                            </div>

                                            {approvedActions[m.id] ? (
                                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    <span>Automation rule activated!</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleApproveAutomation(m.id, m.tool_calls!.rule!)}
                                                    disabled={approving}
                                                    className="flex items-center gap-1.5 rounded-xl bg-[#5B309A] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#4a267d] disabled:opacity-50"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    <span>Activate Automation</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {sending && (
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 animate-pulse items-center justify-center rounded-xl border border-[#D8F779]/40 bg-[#D8F779]/20 text-[#557b0b] dark:text-[#D8F779]">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <div className="flex items-center gap-2 rounded-2xl border border-[#ECECF0] bg-white px-4 py-2.5 text-xs text-slate-500 dark:border-[#28283E] dark:bg-[#1E1E2F]">
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#557b0b] dark:text-[#D8F779]" />
                                    <span>Angora AI is analyzing workspace context...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Prompt Input */}
                    <div className="border-t border-[#ECECF0] bg-white p-4 dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <form onSubmit={handleSendMessage} className="relative flex items-center">
                            <input
                                type="text"
                                value={inputPrompt}
                                onChange={(e) => setInputPrompt(e.target.value)}
                                placeholder="Ask Angora AI to summarize projects, break down tasks, or draft automations..."
                                className="w-full rounded-2xl border border-[#ECECF0] bg-[#F8F9F7] px-4 py-3 pr-12 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#D8F779] focus:outline-none dark:border-[#28283E] dark:bg-[#161624] dark:text-slate-100"
                            />
                            <button
                                type="submit"
                                disabled={!inputPrompt.trim() || sending}
                                className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#191927] text-white transition-all hover:bg-black disabled:opacity-40 dark:bg-[#D8F779] dark:text-[#191927] dark:hover:bg-[#c9eb60]"
                            >
                                <Send className="h-3.5 w-3.5" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Provider Configuration Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-3xl border border-[#ECECF0] bg-white p-6 shadow-2xl dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-base font-bold text-[#191927] dark:text-white">
                                <Settings className="h-4 w-4" /> AI Provider & Budget Limits
                            </h3>
                            <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSettings} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">AI Provider</label>
                                <select
                                    value={provider}
                                    onChange={(e) => {
                                        setProvider(e.target.value);
                                        if (e.target.value === 'anthropic') setModel('claude-3-5-sonnet-20241022');
                                        else if (e.target.value === 'gemini') setModel('gemini-1.5-pro');
                                        else setModel('gpt-4o');
                                    }}
                                    className="w-full rounded-xl border border-[#ECECF0] bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-[#28283E] dark:bg-[#161624] dark:text-slate-200"
                                >
                                    <option value="openai">OpenAI (ChatGPT-4o)</option>
                                    <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                                    <option value="gemini">Google Gemini (Gemini 1.5 Pro)</option>
                                    <option value="local">Local Endpoint / Self-Hosted</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Model Name</label>
                                <input
                                    type="text"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="w-full rounded-xl border border-[#ECECF0] bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-[#28283E] dark:bg-[#161624] dark:text-slate-200"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">API Key (Stored Encrypted)</label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={activeConfig?.has_key ? '••••••••••••••••••••' : 'sk-...'}
                                    className="w-full rounded-xl border border-[#ECECF0] bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-[#28283E] dark:bg-[#161624] dark:text-slate-200"
                                />
                                <p className="mt-1 text-[10px] text-slate-400">
                                    Leave blank to keep existing encrypted key or fallback to local heuristics.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Monthly Token Cap</label>
                                    <input
                                        type="number"
                                        value={monthlyTokenCap}
                                        onChange={(e) => setMonthlyTokenCap(Number(e.target.value))}
                                        className="w-full rounded-xl border border-[#ECECF0] bg-slate-50 px-3 py-2 text-xs dark:border-[#28283E] dark:bg-[#161624]"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Monthly Spend Cap ($)</label>
                                    <input
                                        type="number"
                                        value={monthlySpendCap}
                                        onChange={(e) => setMonthlySpendCap(Number(e.target.value))}
                                        className="w-full rounded-xl border border-[#ECECF0] bg-slate-50 px-3 py-2 text-xs dark:border-[#28283E] dark:bg-[#161624]"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowSettingsModal(false)}
                                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingSettings}
                                    className="rounded-xl bg-[#191927] px-4 py-2 text-xs font-bold text-white hover:bg-black dark:bg-[#D8F779] dark:text-[#191927]"
                                >
                                    Save Configuration
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
