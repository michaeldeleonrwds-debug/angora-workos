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
import { Building2, Calendar, CheckCircle2, ExternalLink, FolderGit2, LayoutDashboard, Plus, Search, Sparkles, Users } from 'lucide-react';
import React, { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Workspaces', href: '/dashboard' },
    { title: 'Agency Projects', href: '/projects' },
];

interface ProjectsPageProps {
    projects: any[];
    clients: any[];
    users: any[];
    boards: any[];
    workspaces: any[];
    currentFilter: string;
}

export default function ProjectsIndexPage({
    projects = [],
    clients = [],
    users = [],
    boards = [],
    workspaces = [],
    currentFilter = 'all',
}: ProjectsPageProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState(currentFilter);

    // Form state for creating an agency project
    const [form, setForm] = useState({
        name: '',
        description: '',
        client_id: clients[0]?.id?.toString() || '',
        project_manager_id: users[0]?.id?.toString() || '',
        project_leader_id: users[1]?.id?.toString() || '',
        board_id: '',
        create_board: true,
        status: 'Planning',
        priority: 'Medium',
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        budget: 15000,
        client_visible: true,
    });

    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/projects', form, {
            onSuccess: () => {
                setIsCreateOpen(false);
                setForm({
                    name: '',
                    description: '',
                    client_id: clients[0]?.id?.toString() || '',
                    project_manager_id: users[0]?.id?.toString() || '',
                    project_leader_id: users[1]?.id?.toString() || '',
                    board_id: '',
                    create_board: true,
                    status: 'Planning',
                    priority: 'Medium',
                    start_date: new Date().toISOString().split('T')[0],
                    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                    budget: 15000,
                    client_visible: true,
                });
            },
        });
    };

    const filteredProjects = projects.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.client?.company?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'In Progress':
                return <Badge className="border-[#0085ff]/30 bg-[#0085ff]/15 text-[#0085ff]">In Progress</Badge>;
            case 'Internal Review':
                return <Badge className="border-[#fdab3d]/30 bg-[#fdab3d]/15 text-[#fdab3d]">Internal Review</Badge>;
            case 'Client Review':
                return <Badge className="border-[#a25ddc]/30 bg-[#a25ddc]/15 text-[#a25ddc]">Client Review</Badge>;
            case 'Completed':
                return <Badge className="border-[#00c875]/30 bg-[#00c875]/15 text-[#00c875]">Completed</Badge>;
            default:
                return (
                    <Badge variant="outline" className="text-muted-foreground">
                        {status}
                    </Badge>
                );
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'Urgent':
                return (
                    <span className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-500">Urgent</span>
                );
            case 'High':
                return (
                    <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">High</span>
                );
            case 'Medium':
                return (
                    <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-500">Medium</span>
                );
            default:
                return <span className="rounded bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-slate-400">Low</span>;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Agency Project Management — Angora Work OS" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
                {/* Header Banner */}
                <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-[#12121E] via-[#1a1a2e] to-[#252542] p-6 text-white shadow-xl md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="rounded-xl border border-[#6366f1]/30 bg-[#6366f1]/20 p-2 text-[#818cf8]">
                                <FolderGit2 className="h-6 w-6" />
                            </span>
                            <h1 className="text-2xl font-bold tracking-tight">Agency Project Operations</h1>
                        </div>
                        <p className="max-w-2xl text-sm text-slate-300">
                            Multi-role creative and web development delivery engine. Coordinate Project Managers, Project Leaders, Designers,
                            Developers, and Clients with synchronous board execution.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/client-portal"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                        >
                            <ExternalLink className="h-4 w-4 text-[#D8F779]" />
                            Client Portal
                        </Link>

                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="rounded-xl bg-[#D8F779] font-bold text-[#12121E] shadow-lg transition hover:bg-[#c9ea68] hover:shadow-xl">
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    New Agency Project
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-white/10 bg-[#181824] text-white">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                        <Sparkles className="h-5 w-5 text-[#D8F779]" />
                                        Launch Agency Project
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                        Assign responsibility hierarchy (PM & PL), connect the client CRM profile, and spin up an integrated Kanban
                                        delivery board.
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleCreateProject} className="space-y-4 pt-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-300">Project Title *</Label>
                                        <Input
                                            required
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            placeholder="e.g. Acme Corp — 2026 E-Commerce Brand Redesign & Web App"
                                            className="border-white/10 bg-[#12121E] text-white"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-300">Project Scope & Deliverable Brief</Label>
                                        <Textarea
                                            rows={3}
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            placeholder="Detail key creative requirements, design system constraints, milestone deadlines..."
                                            className="border-white/10 bg-[#12121E] text-white"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-300">Client / Account *</Label>
                                            <Select value={form.client_id} onValueChange={(val) => setForm({ ...form, client_id: val })}>
                                                <SelectTrigger className="border-white/10 bg-[#12121E] text-white">
                                                    <SelectValue placeholder="Select client" />
                                                </SelectTrigger>
                                                <SelectContent className="border-white/10 bg-[#181824] text-white">
                                                    {clients.map((c) => (
                                                        <SelectItem key={c.id} value={c.id.toString()}>
                                                            {c.name} {c.company ? `(${c.company})` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-300">Project Manager (PM) *</Label>
                                            <Select
                                                value={form.project_manager_id}
                                                onValueChange={(val) => setForm({ ...form, project_manager_id: val })}
                                            >
                                                <SelectTrigger className="border-white/10 bg-[#12121E] text-white">
                                                    <SelectValue placeholder="Select PM" />
                                                </SelectTrigger>
                                                <SelectContent className="border-white/10 bg-[#181824] text-white">
                                                    {users.map((u) => (
                                                        <SelectItem key={u.id} value={u.id.toString()}>
                                                            {u.name} ({u.role})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-300">Project Leader (PL / Production Lead)</Label>
                                            <Select
                                                value={form.project_leader_id}
                                                onValueChange={(val) => setForm({ ...form, project_leader_id: val })}
                                            >
                                                <SelectTrigger className="border-white/10 bg-[#12121E] text-white">
                                                    <SelectValue placeholder="Select PL" />
                                                </SelectTrigger>
                                                <SelectContent className="border-white/10 bg-[#181824] text-white">
                                                    {users.map((u) => (
                                                        <SelectItem key={u.id} value={u.id.toString()}>
                                                            {u.name} ({u.department || 'Production'})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-300">Initial Status</Label>
                                            <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                                                <SelectTrigger className="border-white/10 bg-[#12121E] text-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="border-white/10 bg-[#181824] text-white">
                                                    <SelectItem value="Planning">Planning</SelectItem>
                                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                                    <SelectItem value="Internal Review">Internal Review</SelectItem>
                                                    <SelectItem value="Client Review">Client Review</SelectItem>
                                                    <SelectItem value="Completed">Completed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-300">Priority</Label>
                                            <Select value={form.priority} onValueChange={(val) => setForm({ ...form, priority: val })}>
                                                <SelectTrigger className="border-white/10 bg-[#12121E] text-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="border-white/10 bg-[#181824] text-white">
                                                    <SelectItem value="Low">Low</SelectItem>
                                                    <SelectItem value="Medium">Medium</SelectItem>
                                                    <SelectItem value="High">High</SelectItem>
                                                    <SelectItem value="Urgent">Urgent</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-300">Start Date</Label>
                                            <Input
                                                type="date"
                                                value={form.start_date}
                                                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                                                className="border-white/10 bg-[#12121E] text-white"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-300">Due Date</Label>
                                            <Input
                                                type="date"
                                                value={form.due_date}
                                                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                                                className="border-white/10 bg-[#12121E] text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-300">Project Budget ($ USD)</Label>
                                            <Input
                                                type="number"
                                                value={form.budget}
                                                onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                                                className="border-white/10 bg-[#12121E] text-white"
                                            />
                                        </div>

                                        <div className="flex items-center gap-3 pt-6">
                                            <input
                                                type="checkbox"
                                                id="create_board_check"
                                                checked={form.create_board}
                                                onChange={(e) => setForm({ ...form, create_board: e.target.checked })}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <label htmlFor="create_board_check" className="cursor-pointer text-sm font-medium text-slate-200">
                                                Auto-generate delivery Kanban board
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setIsCreateOpen(false)}
                                            className="text-slate-400 hover:text-white"
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="bg-[#D8F779] font-bold text-[#12121E] hover:bg-[#c9ea68]">
                                            Create Agency Project
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Filters & Search Toolbar */}
                <div className="bg-card flex flex-col items-center justify-between gap-4 rounded-xl border p-4 shadow-sm sm:flex-row">
                    <div className="relative w-full sm:w-80">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                            placeholder="Filter projects or clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-background/50 pl-9"
                        />
                    </div>

                    <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
                        {['all', 'Planning', 'In Progress', 'Internal Review', 'Client Review', 'Completed'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                                    statusFilter === status
                                        ? 'bg-[#12121E] text-white shadow-sm dark:bg-white dark:text-black'
                                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                {status === 'all' ? 'All Statuses' : status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Projects Grid */}
                {filteredProjects.length === 0 ? (
                    <div className="bg-card/50 flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
                        <FolderGit2 className="text-muted-foreground mb-3 h-12 w-12 opacity-40" />
                        <h3 className="text-lg font-semibold">No agency projects found</h3>
                        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                            {searchQuery
                                ? 'Try adjusting your search query or status filter.'
                                : 'Launch your first agency project to synchronize designers, developers, and clients.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredProjects.map((project) => (
                            <div
                                key={project.id}
                                className="group bg-card hover:border-primary/40 flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 hover:shadow-lg"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(project.status)}
                                                {getPriorityBadge(project.priority)}
                                            </div>
                                            <Link
                                                href={`/projects/${project.id}`}
                                                className="text-foreground hover:text-primary mt-1 line-clamp-1 block text-base font-bold transition"
                                            >
                                                {project.name}
                                            </Link>
                                        </div>
                                    </div>

                                    {project.description && <p className="text-muted-foreground line-clamp-2 text-xs">{project.description}</p>}

                                    {/* Client info */}
                                    <div className="text-muted-foreground bg-muted/40 flex items-center gap-2 rounded-lg p-2 text-xs">
                                        <Building2 className="text-primary h-3.5 w-3.5" />
                                        <span className="text-foreground font-semibold">{project.client?.name}</span>
                                        {project.client?.company && <span className="text-muted-foreground">({project.client?.company})</span>}
                                    </div>

                                    {/* Hierarchy assignments: PM & PL */}
                                    <div className="grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                                        <div className="space-y-0.5">
                                            <span className="text-muted-foreground text-[10px] font-bold uppercase">Project Manager</span>
                                            <p className="text-foreground truncate font-medium">{project.project_manager?.name || 'Unassigned'}</p>
                                        </div>

                                        <div className="space-y-0.5">
                                            <span className="text-muted-foreground text-[10px] font-bold uppercase">Project Leader</span>
                                            <p className="text-foreground truncate font-medium">{project.project_leader?.name || 'Unassigned'}</p>
                                        </div>
                                    </div>

                                    {/* Team members & Deliverable metrics */}
                                    <div className="text-muted-foreground flex items-center justify-between pt-1 text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="h-3.5 w-3.5" />
                                            <span>{project.members?.length || 0} crew</span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                            <span>{project.deliverables?.length || 0} deliverables</span>
                                        </div>

                                        {project.due_date && (
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>
                                                    {new Date(project.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
                                    {project.board_id ? (
                                        <Link
                                            href={`/kanban?board=${project.board_id}`}
                                            className="text-primary inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                                        >
                                            <LayoutDashboard className="h-3.5 w-3.5" />
                                            Open Board
                                        </Link>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">No linked board</span>
                                    )}

                                    <Link
                                        href={`/projects/${project.id}`}
                                        className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                                    >
                                        Manage & Review →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
