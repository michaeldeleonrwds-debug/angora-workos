import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    Calendar,
    DollarSign,
    ExternalLink,
    Eye,
    FileCheck,
    LayoutDashboard,
    Paperclip,
    Shield,
    Trash2,
    UploadCloud,
    UserPlus,
    Users,
} from 'lucide-react';
import React, { useState } from 'react';

interface ProjectShowProps {
    project: any;
    users: any[];
}

export default function ProjectShowPage({ project, users = [] }: ProjectShowProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Workspaces', href: '/dashboard' },
        { title: 'Agency Projects', href: '/projects' },
        { title: project.name, href: `/projects/${project.id}` },
    ];

    const [activeTab, setActiveTab] = useState<'deliverables' | 'team' | 'board' | 'details'>('deliverables');

    // Deliverable upload modal
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [deliverableForm, setDeliverableForm] = useState({
        title: '',
        description: '',
        external_url: '',
        version: 1,
        internal_notes: '',
        task_id: '',
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Member assign modal
    const [isMemberOpen, setIsMemberOpen] = useState(false);
    const [memberForm, setMemberForm] = useState({
        user_id: users[0]?.id?.toString() || '',
        agency_role: 'designer',
    });

    // Review action state
    const [selectedDeliverable, setSelectedDeliverable] = useState<any | null>(null);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [reviewAction, setReviewAction] = useState<'approve_for_client' | 'request_revision' | 'approve_internally'>('approve_for_client');
    const [reviewNotes, setReviewNotes] = useState('');

    const handleDeliverableSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', deliverableForm.title);
        formData.append('description', deliverableForm.description);
        formData.append('external_url', deliverableForm.external_url);
        formData.append('version', deliverableForm.version.toString());
        formData.append('internal_notes', deliverableForm.internal_notes);
        if (deliverableForm.task_id) formData.append('task_id', deliverableForm.task_id);
        if (selectedFile) formData.append('file', selectedFile);

        router.post(`/projects/${project.id}/deliverables`, formData, {
            onSuccess: () => {
                setIsUploadOpen(false);
                setDeliverableForm({
                    title: '',
                    description: '',
                    external_url: '',
                    version: 1,
                    internal_notes: '',
                    task_id: '',
                });
                setSelectedFile(null);
            },
        });
    };

    const handleAssignMember = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(`/projects/${project.id}/members`, memberForm, {
            onSuccess: () => {
                setIsMemberOpen(false);
            },
        });
    };

    const handleRemoveMember = (memberId: number) => {
        if (confirm('Remove this member from the project?')) {
            router.delete(`/projects/${project.id}/members/${memberId}`);
        }
    };

    const handleOpenReview = (deliverable: any) => {
        setSelectedDeliverable(deliverable);
        setReviewNotes(deliverable.internal_notes || '');
        setIsReviewOpen(true);
    };

    const handleExecuteReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDeliverable) return;

        router.post(
            `/deliverables/${selectedDeliverable.id}/review`,
            {
                action: reviewAction,
                internal_notes: reviewNotes,
            },
            {
                onSuccess: () => {
                    setIsReviewOpen(false);
                    setSelectedDeliverable(null);
                },
            },
        );
    };

    const handleDeleteDeliverable = (deliverableId: number) => {
        if (confirm('Delete this deliverable?')) {
            router.delete(`/deliverables/${deliverableId}`);
        }
    };

    const getDeliverableStatusBadge = (status: string, clientStatus: string, isClientVisible: boolean) => {
        if (status === 'client_approved' || clientStatus === 'approved') {
            return <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-500">Client Approved</Badge>;
        }
        if (status === 'approved_for_client' || isClientVisible) {
            return <Badge className="border-purple-500/30 bg-purple-500/15 text-purple-500">Published to Client</Badge>;
        }
        if (status === 'revision_required' || clientStatus === 'revision_requested') {
            return <Badge className="border-rose-500/30 bg-rose-500/15 text-rose-500">Revision Needed</Badge>;
        }
        if (status === 'internal_review') {
            return <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-500">Internal Review</Badge>;
        }
        return (
            <Badge variant="outline" className="text-muted-foreground">
                Draft Submitted
            </Badge>
        );
    };

    const boardTasks = [
        ...(project.board?.columns?.flatMap((c: any) => c.tasks || []) || []),
        ...(project.board?.groups?.flatMap((g: any) => g.tasks || []) || []),
    ];
    // Deduplicate tasks
    const uniqueTasks = Array.from(new Map(boardTasks.map((t: any) => [t.id, t])).values());

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${project.name} — Agency Project`} />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
                {/* Header Back & Overview Card */}
                <div className="bg-card flex flex-col gap-4 rounded-2xl border p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="space-y-1">
                            <Link
                                href="/projects"
                                className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1.5 text-xs font-semibold transition"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Back to All Projects
                            </Link>
                            <h1 className="text-foreground text-2xl font-bold tracking-tight">{project.name}</h1>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <Badge variant="outline" className="text-xs">
                                    {project.status}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                    Priority: {project.priority}
                                </Badge>
                                {project.client && (
                                    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                                        <Building2 className="h-3.5 w-3.5" />
                                        {project.client.name} {project.client.company ? `(${project.client.company})` : ''}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {project.board_id && (
                                <Link
                                    href={`/kanban?board=${project.board_id}`}
                                    className="bg-muted hover:bg-muted/80 text-foreground inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition"
                                >
                                    <LayoutDashboard className="text-primary h-4 w-4" />
                                    Open Kanban Board
                                </Link>
                            )}

                            <Link
                                href={`/client-portal/projects/${project.id}`}
                                target="_blank"
                                className="inline-flex items-center gap-2 rounded-xl border border-[#D8F779]/30 bg-[#D8F779]/20 px-4 py-2 text-sm font-semibold text-[#293d04] transition hover:bg-[#D8F779]/30 dark:text-[#D8F779]"
                            >
                                <Eye className="h-4 w-4" />
                                Preview Client View
                            </Link>
                        </div>
                    </div>

                    {project.description && <p className="text-muted-foreground mt-1 border-t pt-3 text-sm">{project.description}</p>}

                    {/* Responsibility Grid */}
                    <div className="grid grid-cols-2 gap-4 border-t pt-4 text-xs md:grid-cols-4">
                        <div className="space-y-1">
                            <span className="text-muted-foreground text-[10px] font-bold uppercase">Project Manager</span>
                            <div className="flex items-center gap-2">
                                <div className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold">
                                    {project.project_manager?.name?.charAt(0) || 'P'}
                                </div>
                                <span className="text-foreground font-semibold">{project.project_manager?.name || 'Unassigned'}</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-muted-foreground text-[10px] font-bold uppercase">Project Leader</span>
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-500">
                                    {project.project_leader?.name?.charAt(0) || 'L'}
                                </div>
                                <span className="text-foreground font-semibold">{project.project_leader?.name || 'Unassigned'}</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-muted-foreground text-[10px] font-bold uppercase">Due Date</span>
                            <div className="text-foreground flex items-center gap-1.5 font-medium">
                                <Calendar className="text-muted-foreground h-4 w-4" />
                                <span>{project.due_date ? new Date(project.due_date).toLocaleDateString() : 'No date set'}</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-muted-foreground text-[10px] font-bold uppercase">Budget</span>
                            <div className="text-foreground flex items-center gap-1.5 font-medium">
                                <DollarSign className="h-4 w-4 text-emerald-500" />
                                <span>${Number(project.budget || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs for Navigation */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-1">
                        <div className="bg-muted/50 flex items-center gap-1 rounded-xl p-1">
                            <button
                                onClick={() => setActiveTab('deliverables')}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                    activeTab === 'deliverables' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <FileCheck className="h-4 w-4" />
                                Deliverables & Reviews ({project.deliverables?.length || 0})
                            </button>
                            <button
                                onClick={() => setActiveTab('team')}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                    activeTab === 'team' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Users className="h-4 w-4" />
                                Team & Roles ({project.members?.length || 0})
                            </button>
                        </div>

                        {activeTab === 'deliverables' && (
                            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="rounded-xl bg-[#6366f1] font-semibold text-white hover:bg-[#4f46e5]">
                                        <UploadCloud className="mr-1.5 h-4 w-4" />
                                        Submit Deliverable
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-card text-foreground max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                                            <UploadCloud className="h-5 w-5 text-indigo-500" />
                                            Submit Creative/Code Deliverable
                                        </DialogTitle>
                                        <DialogDescription className="text-muted-foreground text-xs">
                                            Submit for internal review (Project Leader & PM). Once reviewed and approved, it can be published to the
                                            Client Portal.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <form onSubmit={handleDeliverableSubmit} className="space-y-4 pt-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Deliverable Title *</Label>
                                            <Input
                                                required
                                                placeholder="e.g. Homepage UI Kit (Figma) v1.0"
                                                value={deliverableForm.title}
                                                onChange={(e) => setDeliverableForm({ ...deliverableForm, title: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Description & What Changed</Label>
                                            <Textarea
                                                rows={2}
                                                placeholder="Explain work performed, components finished..."
                                                value={deliverableForm.description}
                                                onChange={(e) => setDeliverableForm({ ...deliverableForm, description: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs">External Link (Figma, GitHub, Staging)</Label>
                                                <Input
                                                    type="url"
                                                    placeholder="https://figma.com/file/..."
                                                    value={deliverableForm.external_url}
                                                    onChange={(e) => setDeliverableForm({ ...deliverableForm, external_url: e.target.value })}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs">Version Number</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={deliverableForm.version}
                                                    onChange={(e) => setDeliverableForm({ ...deliverableForm, version: Number(e.target.value) })}
                                                />
                                            </div>
                                        </div>

                                        {uniqueTasks.length > 0 && (
                                            <div className="space-y-1">
                                                <Label className="text-xs">Associated Board Task (Optional)</Label>
                                                <Select
                                                    value={deliverableForm.task_id}
                                                    onValueChange={(val) => setDeliverableForm({ ...deliverableForm, task_id: val })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select task to link" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {uniqueTasks.map((t: any) => (
                                                            <SelectItem key={t.id} value={t.id.toString()}>
                                                                #{t.id} {t.title}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        <div className="space-y-1">
                                            <Label className="text-xs">File Upload (ZIP, PDF, Mockups max 50MB)</Label>
                                            <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Internal Notes (Hidden from Client)</Label>
                                            <Textarea
                                                rows={2}
                                                placeholder="Internal notes for PM and Project Leader..."
                                                value={deliverableForm.internal_notes}
                                                onChange={(e) => setDeliverableForm({ ...deliverableForm, internal_notes: e.target.value })}
                                            />
                                        </div>

                                        <div className="flex justify-end gap-2 border-t pt-2">
                                            <Button type="button" variant="ghost" onClick={() => setIsUploadOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" className="bg-[#6366f1] text-white hover:bg-[#4f46e5]">
                                                Submit Deliverable
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}

                        {activeTab === 'team' && (
                            <Dialog open={isMemberOpen} onOpenChange={setIsMemberOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="bg-primary text-primary-foreground rounded-xl font-semibold">
                                        <UserPlus className="mr-1.5 h-4 w-4" />
                                        Assign Team Member
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-card text-foreground max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="text-lg font-bold">Assign Member to Project</DialogTitle>
                                        <DialogDescription className="text-muted-foreground text-xs">
                                            Specify their functional role on this project (Designer, Developer, QA, Leader).
                                        </DialogDescription>
                                    </DialogHeader>

                                    <form onSubmit={handleAssignMember} className="space-y-4 pt-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Select User *</Label>
                                            <Select
                                                value={memberForm.user_id}
                                                onValueChange={(val) => setMemberForm({ ...memberForm, user_id: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {users.map((u) => (
                                                        <SelectItem key={u.id} value={u.id.toString()}>
                                                            {u.name} ({u.role})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Project Agency Role *</Label>
                                            <Select
                                                value={memberForm.agency_role}
                                                onValueChange={(val) => setMemberForm({ ...memberForm, agency_role: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="designer">Designer (Figma / UI / UX)</SelectItem>
                                                    <SelectItem value="developer">Developer (Frontend / Backend / Fullstack)</SelectItem>
                                                    <SelectItem value="qa_engineer">QA / Tester</SelectItem>
                                                    <SelectItem value="project_leader">Project Leader</SelectItem>
                                                    <SelectItem value="project_manager">Project Manager</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex justify-end gap-2 border-t pt-2">
                                            <Button type="button" variant="ghost" onClick={() => setIsMemberOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button type="submit">Assign Member</Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>

                    {/* TAB 1: Deliverables & Multi-Step Review */}
                    {activeTab === 'deliverables' && (
                        <div className="m-0 space-y-4">
                            {project.deliverables?.length === 0 ? (
                                <div className="bg-card/40 flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
                                    <UploadCloud className="text-muted-foreground mb-2 h-10 w-10 opacity-50" />
                                    <h4 className="text-base font-semibold">No deliverables submitted yet</h4>
                                    <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                                        Designers and developers submit work for internal review. Once approved, deliverables are published to the
                                        Client Portal.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {project.deliverables.map((item: any) => (
                                        <div
                                            key={item.id}
                                            className="bg-card flex flex-col justify-between gap-4 rounded-2xl border p-5 transition hover:shadow-md sm:flex-row sm:items-center"
                                        >
                                            <div className="max-w-2xl space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {getDeliverableStatusBadge(item.status, item.client_status, item.is_client_visible)}
                                                    <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs font-bold">
                                                        v{item.version}
                                                    </span>
                                                    <h3 className="text-foreground text-base font-bold">{item.title}</h3>
                                                </div>

                                                {item.description && <p className="text-muted-foreground text-xs">{item.description}</p>}

                                                <div className="text-muted-foreground flex flex-wrap items-center gap-4 pt-1 text-xs">
                                                    <span>
                                                        Submitted by: <strong>{item.submitter?.name}</strong>
                                                    </span>
                                                    {item.reviewer && (
                                                        <span>
                                                            Reviewed by: <strong>{item.reviewer?.name}</strong>
                                                        </span>
                                                    )}
                                                    {item.task && (
                                                        <span className="text-primary font-medium">
                                                            Task: #{item.task.id} {item.task.title}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Internal Notes / Client Feedback Alerts */}
                                                {item.internal_notes && (
                                                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                                                        <span className="font-bold">Internal Review Note:</span> {item.internal_notes}
                                                    </div>
                                                )}

                                                {item.client_feedback && (
                                                    <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-2.5 text-xs text-purple-700 dark:text-purple-300">
                                                        <span className="font-bold">Client Review Feedback ({item.client_status}):</span>{' '}
                                                        {item.client_feedback}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 flex-col items-start gap-2 sm:flex-row sm:items-center">
                                                {item.external_url && (
                                                    <a
                                                        href={item.external_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        Open Link
                                                    </a>
                                                )}

                                                {item.file_url && (
                                                    <a
                                                        href={item.file_url}
                                                        download
                                                        className="hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition"
                                                    >
                                                        <Paperclip className="h-3.5 w-3.5" />
                                                        Download
                                                    </a>
                                                )}

                                                {/* Review Trigger Button */}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleOpenReview(item)}
                                                    className="text-xs font-semibold"
                                                >
                                                    Review & Gate
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteDeliverable(item.id)}
                                                    className="text-muted-foreground h-8 w-8 p-2 hover:text-rose-500"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: Team Members & Agency Roles */}
                    {activeTab === 'team' && (
                        <div className="m-0 space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {/* Key Leaders (PM & PL) */}
                                {project.project_manager && (
                                    <div className="bg-card flex items-center justify-between rounded-xl border p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/20 text-primary flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold">
                                                {project.project_manager.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-foreground text-sm font-bold">{project.project_manager.name}</p>
                                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Project Manager</Badge>
                                            </div>
                                        </div>
                                        <span className="text-muted-foreground font-mono text-xs">Lead</span>
                                    </div>
                                )}

                                {project.project_leader && (
                                    <div className="bg-card flex items-center justify-between rounded-xl border p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-500">
                                                {project.project_leader.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-foreground text-sm font-bold">{project.project_leader.name}</p>
                                                <Badge className="border-indigo-500/20 bg-indigo-500/10 text-[10px] text-indigo-500">
                                                    Project Leader
                                                </Badge>
                                            </div>
                                        </div>
                                        <span className="text-muted-foreground font-mono text-xs">Lead</span>
                                    </div>
                                )}

                                {/* Assigned Crew Members */}
                                {project.members?.map((member: any) => (
                                    <div key={member.id} className="bg-card flex items-center justify-between rounded-xl border p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-muted text-foreground flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold">
                                                {member.user?.name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-foreground text-sm font-bold">{member.user?.name}</p>
                                                <Badge variant="outline" className="text-[10px] capitalize">
                                                    {member.agency_role.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleRemoveMember(member.id)}
                                            className="text-muted-foreground h-8 w-8 p-0 hover:text-rose-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Review & Gate Modal */}
                <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                    <DialogContent className="bg-card text-foreground max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                                <Shield className="text-primary h-5 w-5" />
                                Review & Approval Gate
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs">
                                Make a review determination on <strong>{selectedDeliverable?.title}</strong>.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleExecuteReview} className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">Review Determination *</Label>
                                <div className="grid grid-cols-1 gap-2">
                                    <label
                                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${reviewAction === 'approve_for_client' ? 'border-purple-500 bg-purple-500/10' : 'hover:bg-muted/50'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="reviewAction"
                                            value="approve_for_client"
                                            checked={reviewAction === 'approve_for_client'}
                                            onChange={() => setReviewAction('approve_for_client')}
                                            className="mt-0.5"
                                        />
                                        <div>
                                            <p className="text-foreground text-sm font-bold">Approve & Publish to Client Portal</p>
                                            <p className="text-muted-foreground text-xs">
                                                Marks approved internally and instantly makes deliverable visible in the client review workspace.
                                            </p>
                                        </div>
                                    </label>

                                    <label
                                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${reviewAction === 'request_revision' ? 'border-rose-500 bg-rose-500/10' : 'hover:bg-muted/50'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="reviewAction"
                                            value="request_revision"
                                            checked={reviewAction === 'request_revision'}
                                            onChange={() => setReviewAction('request_revision')}
                                            className="mt-0.5"
                                        />
                                        <div>
                                            <p className="text-foreground text-sm font-bold">Request Revision</p>
                                            <p className="text-muted-foreground text-xs">
                                                Returns deliverable to designer/developer with feedback notes. Kept hidden from client.
                                            </p>
                                        </div>
                                    </label>

                                    <label
                                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${reviewAction === 'approve_internally' ? 'border-amber-500 bg-amber-500/10' : 'hover:bg-muted/50'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="reviewAction"
                                            value="approve_internally"
                                            checked={reviewAction === 'approve_internally'}
                                            onChange={() => setReviewAction('approve_internally')}
                                            className="mt-0.5"
                                        />
                                        <div>
                                            <p className="text-foreground text-sm font-bold">Keep in Internal Review (Draft Review)</p>
                                            <p className="text-muted-foreground text-xs">
                                                Continue internal iterations without notifying the client yet.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs">Feedback / Review Notes</Label>
                                <Textarea
                                    rows={3}
                                    placeholder="Enter actionable review comments or instructions..."
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-2 border-t pt-2">
                                <Button type="button" variant="ghost" onClick={() => setIsReviewOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                                    Confirm Decision
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
