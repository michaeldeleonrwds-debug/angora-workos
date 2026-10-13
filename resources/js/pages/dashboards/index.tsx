import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronRight, Layers, LayoutDashboard, Plus, Search } from 'lucide-react';
import React, { useState } from 'react';

interface DashboardItem {
    id: number;
    name: string;
    description?: string;
    icon: string;
    type: string;
    department?: string;
    visibility: string;
    is_favorite: boolean;
    widgets: any[];
    owner: {
        id: number;
        name: string;
    };
    created_at: string;
}

interface Props {
    dashboards: DashboardItem[];
    projects: Array<{ id: number; name: string; code: string }>;
    boards: Array<{ id: number; title: string }>;
}

export default function DashboardsIndex({ dashboards, projects, boards }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        description: '',
        type: 'custom',
        department: '',
        project_id: '',
        visibility: 'team',
    });

    const filteredDashboards = dashboards.filter((d) => {
        const matchesSearch =
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()));

        if (activeTab === 'all') return matchesSearch;
        if (activeTab === 'favorites') return matchesSearch && d.is_favorite;
        if (activeTab === 'executive') return matchesSearch && d.type === 'executive';
        if (activeTab === 'agency') return matchesSearch && (d.type === 'agency' || d.type === 'project');
        if (activeTab === 'department') return matchesSearch && d.type === 'department';
        return matchesSearch;
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        post('/dashboards', {
            onSuccess: () => {
                setIsCreateOpen(false);
                reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard Hub', href: '/dashboards' }]}>
            <Head title="Enterprise Dashboards & Portfolio Hub" />

            <div className="mx-auto max-w-7xl space-y-6 p-6">
                {/* Header Banner */}
                <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-[28px] bg-gradient-to-r from-[#12121E] via-[#1c1c30] to-[#252542] p-8 text-white shadow-xl md:flex-row md:items-center">
                    <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
                    <div className="relative z-10 space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#D8F779] backdrop-blur-md">
                            <Layers className="h-3.5 w-3.5" /> Angora Portfolio Analytics
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white">Dashboard Hub</h1>
                        <p className="max-w-xl text-sm text-gray-300">
                            Consolidate real-time reporting across boards, agency deliverables, marketing campaigns, and cross-department workflows
                            into customizable widgets.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-3">
                        <Link href="/reports">
                            <Button variant="outline" className="rounded-xl border-white/20 text-white hover:bg-white/10">
                                Report Builder
                            </Button>
                        </Link>

                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="rounded-xl bg-[#C8AEF5] font-semibold text-[#12121E] shadow-lg hover:bg-[#b89cee]">
                                    <Plus className="mr-1.5 h-4 w-4" /> Create Dashboard
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md rounded-[24px]">
                                <DialogHeader>
                                    <DialogTitle>Create New Dashboard</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreate} className="space-y-4 pt-2">
                                    <div className="space-y-1">
                                        <Label>Dashboard Name</Label>
                                        <Input
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="e.g. Executive Q4 Overview"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Description</Label>
                                        <Input
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Summary of this dashboard's purpose..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label>Type / Template</Label>
                                            <select
                                                value={data.type}
                                                onChange={(e) => setData('type', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                            >
                                                <option value="custom">Blank Canvas</option>
                                                <option value="executive">Executive Portfolio</option>
                                                <option value="agency">Agency Client Projects</option>
                                                <option value="department">Department Operations</option>
                                                <option value="personal">Personal Workload</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Visibility</Label>
                                            <select
                                                value={data.visibility}
                                                onChange={(e) => setData('visibility', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                            >
                                                <option value="team">Team Visible</option>
                                                <option value="private">Private (Only Me)</option>
                                                <option value="public">Workspace Public</option>
                                            </select>
                                        </div>
                                    </div>
                                    {data.type === 'agency' && (
                                        <div className="space-y-1">
                                            <Label>Filter by Project (Optional)</Label>
                                            <select
                                                value={data.project_id}
                                                onChange={(e) => setData('project_id', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                            >
                                                <option value="">All Active Projects</option>
                                                {projects.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.code} - {p.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div className="flex justify-end gap-2 pt-3">
                                        <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={processing} className="bg-[#C8AEF5] text-[#12121E] hover:bg-[#b89cee]">
                                            {processing ? 'Creating...' : 'Create Dashboard'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col items-center justify-between gap-4 pb-2 sm:flex-row">
                    <div className="flex w-full items-center gap-1.5 rounded-2xl bg-gray-100 p-1 sm:w-auto dark:bg-gray-800/80">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                activeTab === 'all'
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            All ({dashboards.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('favorites')}
                            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                activeTab === 'favorites'
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            Favorites
                        </button>
                        <button
                            onClick={() => setActiveTab('executive')}
                            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                activeTab === 'executive'
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            Executive
                        </button>
                        <button
                            onClick={() => setActiveTab('agency')}
                            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                activeTab === 'agency'
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            Agency Projects
                        </button>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Search dashboards..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="rounded-xl border-gray-200 bg-white pl-9 dark:border-gray-800 dark:bg-gray-900"
                        />
                    </div>
                </div>

                {/* Dashboard Grid */}
                {filteredDashboards.length === 0 ? (
                    <div className="space-y-3 rounded-[28px] border border-gray-100 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/60">
                            <LayoutDashboard className="h-6 w-6" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">No dashboards found</h3>
                        <p className="mx-auto max-w-sm text-xs text-gray-400">
                            Get started by creating your first executive, agency, or team performance dashboard.
                        </p>
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            className="rounded-xl bg-[#C8AEF5] text-xs font-semibold text-[#12121E] hover:bg-[#b89cee]"
                        >
                            <Plus className="mr-1 h-4 w-4" /> Create Dashboard
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredDashboards.map((dashboard) => (
                            <Link
                                key={dashboard.id}
                                href={`/dashboards/${dashboard.id}`}
                                className="group relative flex flex-col justify-between rounded-[28px] border border-gray-100 bg-white p-6 transition-all duration-300 hover:border-[#C8AEF5] hover:shadow-xl hover:shadow-purple-500/5 dark:border-gray-800 dark:bg-gray-900"
                            >
                                <div>
                                    <div className="mb-4 flex items-start justify-between">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F8F9F7] text-[#12121E] transition-colors group-hover:bg-[#C8AEF5] group-hover:text-[#12121E] dark:bg-gray-800 dark:text-white">
                                            <LayoutDashboard className="h-5 w-5" />
                                        </div>
                                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 capitalize dark:bg-gray-800 dark:text-gray-300">
                                            {dashboard.type}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 transition-colors group-hover:text-[#6366f1] dark:text-white">
                                        {dashboard.name}
                                    </h3>
                                    <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                                        {dashboard.description || 'Configurable enterprise work management dashboard.'}
                                    </p>
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-6 text-xs text-gray-400 dark:border-gray-800/80">
                                    <span>{dashboard.widgets?.length || 0} active widgets</span>
                                    <span className="flex items-center font-semibold text-[#6366f1] transition-transform group-hover:translate-x-1">
                                        Open <ChevronRight className="ml-0.5 h-4 w-4" />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
