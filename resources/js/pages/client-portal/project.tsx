import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Calendar, CheckCircle2, ExternalLink, FileCheck, Paperclip, RotateCcw } from 'lucide-react';
import React, { useState } from 'react';

interface ClientProjectProps {
    client: {
        id: number;
        name: string;
        company?: string;
    };
    project: {
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
        };
        deliverables: any[];
    };
}

export default function ClientProjectShowPage({ client, project }: ClientProjectProps) {
    const [selectedDeliverable, setSelectedDeliverable] = useState<any | null>(null);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [feedbackStatus, setFeedbackStatus] = useState<'approved' | 'revision_requested'>('approved');
    const [feedbackComment, setFeedbackComment] = useState('');

    const handleOpenFeedback = (deliverable: any, defaultStatus: 'approved' | 'revision_requested') => {
        setSelectedDeliverable(deliverable);
        setFeedbackStatus(defaultStatus);
        setFeedbackComment(deliverable.client_feedback || '');
        setIsFeedbackOpen(true);
    };

    const handleSubmitFeedback = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDeliverable) return;

        router.post(
            `/client-portal/deliverables/${selectedDeliverable.id}/feedback`,
            {
                client_status: feedbackStatus,
                client_feedback: feedbackComment,
            },
            {
                onSuccess: () => {
                    setIsFeedbackOpen(false);
                    setSelectedDeliverable(null);
                    setFeedbackComment('');
                },
            },
        );
    };

    return (
        <div className="min-h-screen bg-[#F8F9F7] text-[#12121E]">
            <Head title={`${project.name} — Client Portal`} />

            {/* Portal Navigation Bar */}
            <header className="sticky top-0 z-30 border-b border-white/10 bg-[#12121E] px-6 py-4 text-white shadow-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/client-portal"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 transition hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Portal Overview
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="hidden text-xs text-slate-400 sm:inline">
                            Client Account: <strong className="text-white">{client.name}</strong>
                        </span>
                        <Link
                            href="/dashboard"
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:text-white"
                        >
                            Angora Home
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
                {/* Project Header Summary */}
                <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                            <div className="mb-1.5 flex items-center gap-2">
                                <Badge className="bg-[#12121E] text-xs text-white">{project.status}</Badge>
                                <Badge variant="outline" className="text-xs">
                                    Priority: {project.priority}
                                </Badge>
                            </div>
                            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">{project.name}</h1>
                        </div>

                        {project.project_manager && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-xs text-slate-600 sm:text-right">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Assigned Project Manager</span>
                                <span className="font-bold text-slate-900">{project.project_manager.name}</span>
                                <span className="block text-slate-500">{project.project_manager.email}</span>
                            </div>
                        )}
                    </div>

                    {project.description && <p className="border-t pt-3 text-sm leading-relaxed text-slate-600">{project.description}</p>}

                    <div className="flex flex-wrap items-center gap-6 border-t pt-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span>
                                Estimated Completion: <strong>{project.due_date || 'In progress'}</strong>
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span>
                                Published Deliverables: <strong>{project.deliverables?.length || 0}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Deliverables Review Workspace */}
                <div className="space-y-4">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-[#12121E]">Project Deliverables & Assets</h2>
                        <p className="text-xs text-slate-500">
                            Inspect files and live previews, leave feedback, and record official approval for each deliverable version.
                        </p>
                    </div>

                    {project.deliverables?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-white p-12 text-center">
                            <FileCheck className="mb-2 h-10 w-10 text-slate-400 opacity-60" />
                            <h3 className="text-base font-bold text-slate-800">No deliverables published yet</h3>
                            <p className="mt-1 max-w-sm text-xs text-slate-500">
                                Work is in progress. The team will publish milestone deliverables here as soon as internal quality reviews are
                                completed.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {project.deliverables.map((item) => (
                                <div key={item.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    className={
                                                        item.client_status === 'approved'
                                                            ? 'border-emerald-500/30 bg-emerald-500/15 font-semibold text-emerald-700'
                                                            : item.client_status === 'revision_requested'
                                                              ? 'border-rose-500/30 bg-rose-500/15 font-semibold text-rose-700'
                                                              : 'border-amber-500/30 bg-amber-500/15 font-semibold text-amber-700'
                                                    }
                                                >
                                                    {item.client_status === 'approved'
                                                        ? '✓ Approved'
                                                        : item.client_status === 'revision_requested'
                                                          ? 'Revision Requested'
                                                          : 'Awaiting Your Review'}
                                                </Badge>
                                                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                                                    v{item.version}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {item.external_url && (
                                                <a
                                                    href={item.external_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold transition hover:bg-slate-50"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5 text-indigo-600" />
                                                    View Live Prototype
                                                </a>
                                            )}

                                            {item.file_url && (
                                                <a
                                                    href={item.file_url}
                                                    download
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold transition hover:bg-slate-50"
                                                >
                                                    <Paperclip className="h-3.5 w-3.5 text-slate-600" />
                                                    Download File
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {item.description && (
                                        <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                                            {item.description}
                                        </p>
                                    )}

                                    {item.client_feedback && (
                                        <div className="space-y-0.5 rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
                                            <span className="block font-bold">Your Recorded Feedback:</span>
                                            <p>{item.client_feedback}</p>
                                        </div>
                                    )}

                                    {/* Action Buttons: Approve or Request Revision */}
                                    <div className="flex items-center justify-end gap-3 border-t pt-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOpenFeedback(item, 'revision_requested')}
                                            className="border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50"
                                        >
                                            <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                            Request Changes
                                        </Button>

                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => handleOpenFeedback(item, 'approved')}
                                            className="border border-[#c9ea68] bg-[#D8F779] text-xs font-bold text-[#12121E] hover:bg-[#c9ea68]"
                                        >
                                            <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-800" />
                                            Approve Deliverable
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Client Feedback Modal */}
                <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
                    <DialogContent className="max-w-md bg-white text-slate-900">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold">
                                {feedbackStatus === 'approved' ? 'Approve Deliverable' : 'Request Changes on Deliverable'}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                For <strong>{selectedDeliverable?.title}</strong> (v{selectedDeliverable?.version}).
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmitFeedback} className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">Decision Status</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFeedbackStatus('approved')}
                                        className={`rounded-xl border p-3 text-center text-xs font-bold transition ${
                                            feedbackStatus === 'approved'
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        ✓ Approved
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFeedbackStatus('revision_requested')}
                                        className={`rounded-xl border p-3 text-center text-xs font-bold transition ${
                                            feedbackStatus === 'revision_requested'
                                                ? 'border-rose-500 bg-rose-50 text-rose-800'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        Request Changes
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-bold">Feedback / Comments for the Team</Label>
                                <Textarea
                                    rows={4}
                                    placeholder={
                                        feedbackStatus === 'approved'
                                            ? 'Optional notes: Looks great! Approved to move ahead with production.'
                                            : 'Please detail specific adjustments or elements that need revision...'
                                    }
                                    value={feedbackComment}
                                    onChange={(e) => setFeedbackComment(e.target.value)}
                                    className="text-xs"
                                />
                            </div>

                            <div className="flex justify-end gap-2 border-t pt-2">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setIsFeedbackOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    className={
                                        feedbackStatus === 'approved'
                                            ? 'bg-emerald-600 font-bold text-white hover:bg-emerald-700'
                                            : 'bg-rose-600 font-bold text-white hover:bg-rose-700'
                                    }
                                >
                                    Submit Review
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
