import { Badge } from '@/components/ui/badge';
import { Head, Link } from '@inertiajs/react';
import { Calendar, CheckCircle2, ExternalLink, FileCheck, Paperclip, Sparkles } from 'lucide-react';

interface ClientPortalDashboardProps {
    client: {
        id: number;
        name: string;
        company?: string;
        email: string;
    };
    projects: any[];
    deliverables: any[];
}

export default function ClientPortalDashboard({ client, projects = [], deliverables = [] }: ClientPortalDashboardProps) {
    const pendingDeliverables = deliverables.filter((d) => d.client_status === 'pending');
    const approvedDeliverables = deliverables.filter((d) => d.client_status === 'approved');

    return (
        <div className="min-h-screen bg-[#F8F9F7] text-[#12121E]">
            <Head title={`Client Portal — ${client.name} | Angora`} />

            {/* Portal Navigation Bar */}
            <header className="sticky top-0 z-30 border-b border-white/10 bg-[#12121E] px-6 py-4 text-white shadow-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6366f1] to-[#D8F779] text-lg font-black text-black shadow-sm">
                            A
                        </div>
                        <div>
                            <span className="text-base font-bold tracking-tight">Angora Client Portal</span>
                            <span className="-mt-0.5 block text-xs text-slate-400">Review Workspace & Approvals</span>
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
                {/* Welcome Card */}
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#12121E] via-[#1a1a2e] to-[#252542] p-8 text-white shadow-xl">
                    <div className="relative z-10 max-w-3xl space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#D8F779]/30 bg-[#D8F779]/20 px-3 py-1 text-xs font-bold text-[#D8F779]">
                            <Sparkles className="h-3.5 w-3.5" />
                            Secure Client Workspace
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight">Welcome, {client.name}</h1>
                        <p className="text-sm leading-relaxed text-slate-300 md:text-base">
                            Review project progress, inspect submitted deliverables, provide design feedback, and approve milestone work in one
                            unified workspace.
                        </p>
                    </div>

                    <div className="relative z-10 mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 text-xs md:grid-cols-3">
                        <div>
                            <span className="text-slate-400">Active Projects</span>
                            <p className="text-2xl font-black text-white">{projects.length}</p>
                        </div>
                        <div>
                            <span className="text-slate-400">Pending Your Review</span>
                            <p className="text-2xl font-black text-[#D8F779]">{pendingDeliverables.length}</p>
                        </div>
                        <div>
                            <span className="text-slate-400">Approved Deliverables</span>
                            <p className="text-2xl font-black text-emerald-400">{approvedDeliverables.length}</p>
                        </div>
                    </div>
                </div>

                {/* Section 1: Active Projects */}
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
                                        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">{proj.status}</Badge>
                                        {proj.pending_review_count > 0 && (
                                            <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-600">
                                                {proj.pending_review_count} needs review
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="line-clamp-1 text-lg font-bold text-slate-900">{proj.name}</h3>

                                    {proj.description && <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">{proj.description}</p>}

                                    {proj.project_manager && (
                                        <div className="border-t pt-1 text-xs text-slate-500">
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase">Project Manager</span>
                                            <span className="font-semibold text-slate-800">{proj.project_manager.name}</span> (
                                            {proj.project_manager.email})
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

                {/* Section 2: Deliverables Requiring Client Action */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-[#12121E]">Deliverables Ready For Review</h2>
                            <p className="text-xs text-slate-500">Provide direct feedback or approval on submitted milestones.</p>
                        </div>
                    </div>

                    {deliverables.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-white p-12 text-center">
                            <FileCheck className="mb-2 h-10 w-10 text-slate-400 opacity-60" />
                            <h3 className="text-base font-bold text-slate-800">No deliverables pending review</h3>
                            <p className="mt-1 max-w-sm text-xs text-slate-500">
                                Your agency team is currently preparing work. You will be notified when new assets are published for your review.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {deliverables.map((item) => (
                                <div key={item.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">{item.project_name}</span>
                                        <Badge
                                            className={
                                                item.client_status === 'approved'
                                                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700'
                                                    : item.client_status === 'revision_requested'
                                                      ? 'border-rose-500/30 bg-rose-500/15 text-rose-700'
                                                      : 'border-amber-500/30 bg-amber-500/15 text-amber-700'
                                            }
                                        >
                                            {item.client_status === 'approved'
                                                ? 'Approved by you'
                                                : item.client_status === 'revision_requested'
                                                  ? 'Revision Requested'
                                                  : 'Pending your review'}
                                        </Badge>
                                    </div>

                                    <h3 className="text-base font-bold text-slate-900">
                                        {item.title} (v{item.version})
                                    </h3>
                                    {item.description && <p className="text-xs leading-relaxed text-slate-600">{item.description}</p>}

                                    {item.client_feedback && (
                                        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
                                            <span className="font-bold">Your submitted notes:</span> {item.client_feedback}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between border-t pt-3">
                                        <div className="flex items-center gap-2">
                                            {item.external_url && (
                                                <a
                                                    href={item.external_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    View External Link
                                                </a>
                                            )}
                                            {item.file_url && (
                                                <a
                                                    href={item.file_url}
                                                    download
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:underline"
                                                >
                                                    <Paperclip className="h-3.5 w-3.5" />
                                                    Download File
                                                </a>
                                            )}
                                        </div>

                                        <Link
                                            href={`/client-portal/projects/${item.project_id}`}
                                            className="inline-flex items-center gap-1 rounded-lg bg-[#D8F779] px-3 py-1.5 text-xs font-bold text-[#12121E] transition hover:bg-[#c9ea68]"
                                        >
                                            Review & Feedback →
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
