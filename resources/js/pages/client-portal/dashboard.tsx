import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    ExternalLink,
    FileCheck,
    FolderKanban,
    Layers,
    MessageSquare,
    Paperclip,
    RotateCcw,
    Send,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import React, { useState } from 'react';

interface ClientDeliverable {
    id: number;
    title: string;
    description?: string;
    file_url?: string;
    external_url?: string;
    version: number;
    client_status: 'pending' | 'approved' | 'revision_requested';
    client_feedback?: string;
}

interface ClientComment {
    id: number;
    message: string;
    created_at: string;
    user?: {
        name: string;
        avatar_url?: string;
    };
}

interface ClientAttachment {
    id: number;
    file_name: string;
    file_size_bytes: number;
    mime_type: string;
    download_url: string;
}

interface ClientTask {
    id: number;
    title: string;
    description?: string;
    priority: string;
    due_date?: string | null;
    client_deadline?: string | null;
    status: string;
    stage_key: string;
    stage_color: string;
    client_review_status: string;
    client_revision_count: number;
    is_awaiting_approval: boolean;
    is_revision_requested: boolean;
    is_complete: boolean;
    assignee?: {
        name: string;
        avatar_url?: string;
    } | null;
    review_cycle?: {
        id: number;
        round_number: number;
        state: string;
        notes?: string;
        client_feedback?: string;
        submitted_at?: string;
        resolved_at?: string;
    } | null;
    deliverables: ClientDeliverable[];
    comments: ClientComment[];
    attachments: ClientAttachment[];
}

interface ClientProject {
    id: number;
    name: string;
    description?: string;
    status: string;
    priority: string;
    start_date?: string;
    due_date?: string;
    project_manager?: {
        name: string;
        email: string;
    } | null;
    deliverables_count: number;
    pending_review_count: number;
    approved_count: number;
}

interface ClientPortalDashboardProps {
    client: {
        id: number;
        name: string;
        company?: string;
        email: string;
    };
    projects?: ClientProject[];
    deliverables?: any[];
    tasks?: ClientTask[];
}

export default function ClientPortalDashboard({
    client,
    projects = [],
    tasks = [],
}: ClientPortalDashboardProps) {
    const [activeTab, setActiveTab] = useState<'awaiting' | 'revision' | 'approved' | 'projects'>('awaiting');
    const [selectedTask, setSelectedTask] = useState<ClientTask | null>(null);
    const [isDecisionOpen, setIsDecisionOpen] = useState(false);
    const [decisionType, setDecisionType] = useState<'approved' | 'revision_requested'>('approved');
    const [decisionFeedback, setDecisionFeedback] = useState('');
    const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

    // Filter tasks by status categories
    const awaitingTasks = tasks.filter((t) => t.is_awaiting_approval);
    const revisionTasks = tasks.filter((t) => t.is_revision_requested);
    const approvedTasks = tasks.filter((t) => t.is_complete);

    const handleOpenDecision = (task: ClientTask, type: 'approved' | 'revision_requested') => {
        setSelectedTask(task);
        setDecisionType(type);
        setDecisionFeedback('');
        setIsDecisionOpen(true);
    };

    const handleConfirmDecision = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask) return;

        setIsSubmittingDecision(true);

        const endpoint =
            decisionType === 'approved'
                ? `/client-portal/tasks/${selectedTask.id}/approve`
                : `/client-portal/tasks/${selectedTask.id}/request-revision`;

        router.post(
            endpoint,
            {
                feedback: decisionFeedback,
            },
            {
                onSuccess: () => {
                    setIsDecisionOpen(false);
                    setSelectedTask(null);
                    setDecisionFeedback('');
                    setIsSubmittingDecision(false);
                },
                onError: () => {
                    setIsSubmittingDecision(false);
                },
            },
        );
    };

    return (
        <div className="min-h-screen bg-[#F8F9F7] text-[#12121E]">
            <Head title={`Client Portal — ${client.name} | Angora Work OS`} />

            {/* Portal Navigation Bar */}
            <header className="sticky top-0 z-30 border-b border-white/10 bg-[#12121E] px-6 py-4 text-white shadow-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6366f1] to-[#D8F779] text-lg font-black text-black shadow-sm">
                            A
                        </div>
                        <div>
                            <span className="text-base font-bold tracking-tight">Angora Client Portal</span>
                            <span className="-mt-0.5 block text-xs text-slate-400">Production Review & Approvals</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden text-right sm:block">
                            <span className="block text-xs text-slate-400">Signed in as</span>
                            <span className="text-sm font-bold text-white">
                                {client.name} {client.company ? `(${client.company})` : ''}
                            </span>
                        </div>
                        <Link
                            href="/dashboard"
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:text-white"
                        >
                            Return to App
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
                {/* Welcome Card & Metrics */}
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#12121E] via-[#1a1a2e] to-[#252542] p-8 text-white shadow-xl">
                    <div className="relative z-10 max-w-3xl space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#D8F779]/30 bg-[#D8F779]/20 px-3 py-1 text-xs font-bold text-[#D8F779]">
                            <Sparkles className="h-3.5 w-3.5" />
                            Client Workspace & Review Gate
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight">Welcome, {client.name}</h1>
                        <p className="text-sm leading-relaxed text-slate-300 md:text-base">
                            Review and inspect deliverables published by your agency production team. Approve completed milestones or
                            request specific design revisions directly in this portal.
                        </p>
                    </div>

                    <div className="relative z-10 mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 text-xs md:grid-cols-4">
                        <div
                            onClick={() => setActiveTab('awaiting')}
                            className="cursor-pointer rounded-xl bg-white/5 p-3 transition hover:bg-white/10"
                        >
                            <span className="flex items-center gap-1.5 text-slate-400">
                                <Clock className="h-3.5 w-3.5 text-[#D8F779]" /> Awaiting Your Approval
                            </span>
                            <p className="text-2xl font-black text-[#D8F779]">{awaitingTasks.length}</p>
                        </div>
                        <div
                            onClick={() => setActiveTab('revision')}
                            className="cursor-pointer rounded-xl bg-white/5 p-3 transition hover:bg-white/10"
                        >
                            <span className="flex items-center gap-1.5 text-slate-400">
                                <RotateCcw className="h-3.5 w-3.5 text-rose-400" /> Revisions in Progress
                            </span>
                            <p className="text-2xl font-black text-rose-400">{revisionTasks.length}</p>
                        </div>
                        <div
                            onClick={() => setActiveTab('approved')}
                            className="cursor-pointer rounded-xl bg-white/5 p-3 transition hover:bg-white/10"
                        >
                            <span className="flex items-center gap-1.5 text-slate-400">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Completed & Approved
                            </span>
                            <p className="text-2xl font-black text-emerald-400">{approvedTasks.length}</p>
                        </div>
                        <div
                            onClick={() => setActiveTab('projects')}
                            className="cursor-pointer rounded-xl bg-white/5 p-3 transition hover:bg-white/10"
                        >
                            <span className="flex items-center gap-1.5 text-slate-400">
                                <FolderKanban className="h-3.5 w-3.5 text-indigo-400" /> Active Projects
                            </span>
                            <p className="text-2xl font-black text-white">{projects.length}</p>
                        </div>
                    </div>
                </div>

                {/* Main Tabbed Interface */}
                <div className="space-y-6">
                    {/* Tab Navigation */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                        <button
                            type="button"
                            onClick={() => setActiveTab('awaiting')}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                                activeTab === 'awaiting'
                                    ? 'bg-[#12121E] text-white shadow-xs'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            <span>Awaiting Approval</span>
                            {awaitingTasks.length > 0 && (
                                <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-extrabold text-white">
                                    {awaitingTasks.length}
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('revision')}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                                activeTab === 'revision'
                                    ? 'bg-[#12121E] text-white shadow-xs'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
                            <span>Needs Revision</span>
                            {revisionTasks.length > 0 && (
                                <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-extrabold text-white">
                                    {revisionTasks.length}
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('approved')}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                                activeTab === 'approved'
                                    ? 'bg-[#12121E] text-white shadow-xs'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Approved / Completed</span>
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
                                {approvedTasks.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('projects')}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                                activeTab === 'projects'
                                    ? 'bg-[#12121E] text-white shadow-xs'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <Layers className="h-3.5 w-3.5 text-indigo-500" />
                            <span>Project Overview ({projects.length})</span>
                        </button>
                    </div>

                    {/* Tab 1: Awaiting Approval */}
                    {activeTab === 'awaiting' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight text-[#12121E]">Tasks Awaiting Your Approval</h2>
                                    <p className="text-xs text-slate-500">
                                        These deliverables have passed internal agency quality review and require your official signoff or revision feedback.
                                    </p>
                                </div>
                            </div>

                            {awaitingTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                                    <FileCheck className="mb-2 h-10 w-10 text-slate-400 opacity-60" />
                                    <h3 className="text-base font-bold text-slate-800">No deliverables currently pending your review</h3>
                                    <p className="mt-1 max-w-sm text-xs text-slate-500">
                                        Your agency production team is currently working on your tasks. You will be notified when new rounds are published.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {awaitingTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="flex flex-col justify-between space-y-4 rounded-2xl border border-amber-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                                                        Awaiting Client Approval
                                                    </span>
                                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                                                        Round {task.review_cycle?.round_number || 1}
                                                    </span>
                                                </div>

                                                <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>

                                                {task.description && (
                                                    <p className="text-xs leading-relaxed text-slate-600">{task.description}</p>
                                                )}

                                                {/* Deadlines */}
                                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-2">
                                                    {task.client_deadline && (
                                                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                                                            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                                                            <span>Client Target: {task.client_deadline}</span>
                                                        </div>
                                                    )}
                                                    {task.due_date && (
                                                        <div className="flex items-center gap-1.5 text-slate-500">
                                                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                            <span>Production Due: {task.due_date}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Deliverables / Attachments */}
                                                {task.deliverables.length > 0 && (
                                                    <div className="space-y-2 rounded-xl bg-slate-50 p-3 border border-slate-100">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                                            Published Deliverables
                                                        </span>
                                                        {task.deliverables.map((d) => (
                                                            <div key={d.id} className="flex items-center justify-between text-xs">
                                                                <span className="font-semibold text-slate-800 truncate mr-2">
                                                                    {d.title} (v{d.version})
                                                                </span>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    {d.external_url && (
                                                                        <a
                                                                            href={d.external_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
                                                                        >
                                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                                            Live Preview
                                                                        </a>
                                                                    )}
                                                                    {d.file_url && (
                                                                        <a
                                                                            href={d.file_url}
                                                                            download
                                                                            className="inline-flex items-center gap-1 font-bold text-slate-700 hover:underline"
                                                                        >
                                                                            <Download className="h-3.5 w-3.5" />
                                                                            Download
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Client-visible attachments */}
                                                {task.attachments.length > 0 && (
                                                    <div className="space-y-1.5 pt-1">
                                                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                                            Downloadable Assets
                                                        </span>
                                                        {task.attachments.map((att) => (
                                                            <a
                                                                key={att.id}
                                                                href={att.download_url}
                                                                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs hover:bg-slate-50 transition"
                                                            >
                                                                <span className="truncate font-semibold text-slate-700">
                                                                    {att.file_name}
                                                                </span>
                                                                <Download className="h-3.5 w-3.5 text-slate-500 shrink-0 ml-2" />
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenDecision(task, 'revision_requested')}
                                                    className="border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50"
                                                >
                                                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                                    Request Changes
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => handleOpenDecision(task, 'approved')}
                                                    className="border border-[#c9ea68] bg-[#D8F779] text-xs font-bold text-[#12121E] hover:bg-[#c9ea68]"
                                                >
                                                    <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-800" />
                                                    Approve Work
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: Needs Revision */}
                    {activeTab === 'revision' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight text-[#12121E]">Revisions In Progress</h2>
                                    <p className="text-xs text-slate-500">
                                        Tasks where you requested revisions. The agency production team is actively incorporating your feedback.
                                    </p>
                                </div>
                            </div>

                            {revisionTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                                    <CheckCircle2 className="mb-2 h-10 w-10 text-emerald-500 opacity-60" />
                                    <h3 className="text-base font-bold text-slate-800">No active revision requests</h3>
                                    <p className="mt-1 max-w-sm text-xs text-slate-500">
                                        All your tasks are either awaiting your review or already completed and approved.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {revisionTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="space-y-4 rounded-2xl border border-rose-200 bg-white p-6 shadow-sm"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                                                    Revision Round {task.client_revision_count}
                                                </span>
                                                <Badge variant="outline" className="text-xs">
                                                    Status: {task.status}
                                                </Badge>
                                            </div>

                                            <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>

                                            {/* Submitted Client Feedback */}
                                            {task.review_cycle?.client_feedback && (
                                                <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
                                                    <span className="font-bold block mb-1">Your Requested Changes:</span>
                                                    <p>{task.review_cycle.client_feedback}</p>
                                                </div>
                                            )}

                                            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-900">
                                                <span className="font-bold flex items-center gap-1.5 text-amber-800 mb-1">
                                                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                                                    Under Active Rework
                                                </span>
                                                <p className="text-[11px] text-amber-700">
                                                    Our project management team has reviewed your notes and sent this task back to the creative team. A new revision round will be submitted for your signoff soon.
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 3: Approved / Completed */}
                    {activeTab === 'approved' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight text-[#12121E]">Completed & Approved Work</h2>
                                    <p className="text-xs text-slate-500">
                                        Officially signed-off deliverables and completed milestones.
                                    </p>
                                </div>
                            </div>

                            {approvedTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                                    <FileCheck className="mb-2 h-10 w-10 text-slate-400 opacity-60" />
                                    <h3 className="text-base font-bold text-slate-800">No completed tasks yet</h3>
                                    <p className="mt-1 max-w-sm text-xs text-slate-500">
                                        Approved tasks will appear here once you sign off on submitted deliverables.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {approvedTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                                                    ✓ Officially Approved
                                                </span>
                                                <span className="text-xs text-slate-400">Complete</span>
                                            </div>

                                            <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>

                                            {task.description && (
                                                <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>
                                            )}

                                            {/* Deliverables / Assets */}
                                            {task.deliverables.length > 0 && (
                                                <div className="space-y-1.5 border-t border-slate-100 pt-2">
                                                    {task.deliverables.map((d) => (
                                                        <div key={d.id} className="flex items-center justify-between text-xs">
                                                            <span className="font-semibold text-slate-800 truncate mr-2">
                                                                {d.title}
                                                            </span>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {d.external_url && (
                                                                    <a
                                                                        href={d.external_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="font-bold text-indigo-600 hover:underline"
                                                                    >
                                                                        Preview
                                                                    </a>
                                                                )}
                                                                {d.file_url && (
                                                                    <a
                                                                        href={d.file_url}
                                                                        download
                                                                        className="font-bold text-slate-700 hover:underline"
                                                                    >
                                                                        Download
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 4: Projects Overview */}
                    {activeTab === 'projects' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight text-[#12121E]">Your Projects</h2>
                                    <p className="text-xs text-slate-500">Track status, assigned agency project managers, and deliverable items.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {projects.map((proj) => (
                                    <div
                                        key={proj.id}
                                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Badge className="bg-[#12121E] text-white text-xs">{proj.status}</Badge>
                                                {proj.pending_review_count > 0 && (
                                                    <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-600">
                                                        {proj.pending_review_count} needs review
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="line-clamp-1 text-lg font-bold text-slate-900">{proj.name}</h3>

                                            {proj.description && (
                                                <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">{proj.description}</p>
                                            )}

                                            {proj.project_manager && (
                                                <div className="border-t pt-1 text-xs text-slate-500">
                                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Project Manager</span>
                                                    <span className="font-semibold text-slate-800">{proj.project_manager.name}</span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between border-t pt-2 text-xs text-slate-500">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span>Target: {proj.due_date || 'Ongoing'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                    <span>
                                                        {proj.approved_count}/{proj.deliverables_count} approved
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 border-t pt-4">
                                            <Link
                                                href={`/client-portal/projects/${proj.id}`}
                                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#12121E] px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                                            >
                                                Open Project Workspace →
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Review Decision Modal */}
                <Dialog open={isDecisionOpen} onOpenChange={setIsDecisionOpen}>
                    <DialogContent className="max-w-md bg-white text-slate-900">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold">
                                {decisionType === 'approved' ? 'Approve Deliverable Work' : 'Request Changes on Deliverable'}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                For <strong>{selectedTask?.title}</strong> (Round {selectedTask?.review_cycle?.round_number || 1}).
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleConfirmDecision} className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">Decision Status</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDecisionType('approved')}
                                        className={`rounded-xl border p-3 text-center text-xs font-bold transition ${
                                            decisionType === 'approved'
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        ✓ Approve Work
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setDecisionType('revision_requested')}
                                        className={`rounded-xl border p-3 text-center text-xs font-bold transition ${
                                            decisionType === 'revision_requested'
                                                ? 'border-rose-500 bg-rose-50 text-rose-800'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        Request Changes
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-bold">
                                    {decisionType === 'approved' ? 'Approval Notes (Optional)' : 'Required Change Instructions'}
                                </Label>
                                <Textarea
                                    rows={4}
                                    required={decisionType === 'revision_requested'}
                                    placeholder={
                                        decisionType === 'approved'
                                            ? 'Optional notes: Assets look great! Ready to finalize.'
                                            : 'Please detail specific adjustments or elements that need revision...'
                                    }
                                    value={decisionFeedback}
                                    onChange={(e) => setDecisionFeedback(e.target.value)}
                                    className="text-xs"
                                />
                            </div>

                            <div className="flex justify-end gap-2 border-t pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsDecisionOpen(false)}
                                    disabled={isSubmittingDecision}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={isSubmittingDecision}
                                    className={
                                        decisionType === 'approved'
                                            ? 'bg-emerald-600 font-bold text-white hover:bg-emerald-700'
                                            : 'bg-rose-600 font-bold text-white hover:bg-rose-700'
                                    }
                                >
                                    {isSubmittingDecision ? 'Submitting...' : 'Confirm Decision'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
