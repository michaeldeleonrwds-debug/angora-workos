import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { BookOpen, Briefcase, ChevronRight, FolderKanban, LayoutTemplate, Search, Sparkles } from 'lucide-react';
import React, { useState } from 'react';

interface TemplateItem {
    id: number;
    title: string;
    description?: string;
    type: string;
    category: string;
    is_system_template: boolean;
    icon: string;
    color: string;
    content_schema: any;
    creator?: { id: number; name: string };
}

interface Props {
    templates: TemplateItem[];
    workspaces: Array<{ id: number; name: string }>;
    projects: Array<{ id: number; name: string; code: string }>;
    clients: Array<{ id: number; name: string; company_name: string }>;
    managers: Array<{ id: number; name: string }>;
}

export default function TemplatesIndex({ templates, workspaces, projects, clients, managers }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
    const [isUseOpen, setIsUseOpen] = useState(false);

    const instantiateForm = useForm({
        title: '',
        name: '',
        workspace_id: workspaces[0]?.id || '',
        client_id: '',
        project_manager_id: managers[0]?.id || '',
        project_leader_id: managers[0]?.id || '',
        budget_total: 15000,
    });

    const handleOpenUse = (template: TemplateItem) => {
        setSelectedTemplate(template);
        instantiateForm.setData('title', `${template.title} Instance`);
        instantiateForm.setData('name', `${template.title} Project`);
        setIsUseOpen(true);
    };

    const handleInstantiate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemplate) return;

        instantiateForm.post(`/templates/${selectedTemplate.id}/instantiate`, {
            onSuccess: () => {
                setIsUseOpen(false);
            },
        });
    };

    const filteredTemplates = templates.filter((t) => {
        const matchesSearch =
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

        if (activeTab === 'all') return matchesSearch;
        return matchesSearch && t.type === activeTab;
    });

    return (
        <AppLayout breadcrumbs={[{ title: 'Templates Gallery', href: '/templates' }]}>
            <Head title="Templates Gallery & Reusable Workflows" />

            <div className="mx-auto max-w-7xl space-y-6 p-6">
                {/* Header Banner */}
                <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-[28px] bg-gradient-to-r from-[#12121E] via-[#2a1c2f] to-[#252542] p-8 text-white shadow-xl md:flex-row md:items-center">
                    <div className="relative z-10 space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#ff5ac4] backdrop-blur-md">
                            <Sparkles className="h-3.5 w-3.5" /> Reusable Workflow Blueprints
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white">Templates Gallery</h1>
                        <p className="max-w-xl text-sm text-gray-300">
                            Instantly spin up end-to-end Agency Projects, Kanban boards, project briefs, and task checklists with standardized stage
                            columns, custom fields, and milestones.
                        </p>
                    </div>
                </div>

                {/* Filter and Search */}
                <div className="flex flex-col items-center justify-between gap-4 pb-2 sm:flex-row">
                    <div className="flex w-full items-center gap-1.5 rounded-2xl bg-gray-100 p-1 sm:w-auto dark:bg-gray-800/80">
                        {['all', 'project', 'board', 'workdoc'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                                    activeTab === tab
                                        ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                {tab === 'all' ? 'All Templates' : `${tab}s`}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="rounded-xl border-gray-200 bg-white pl-9 dark:border-gray-800 dark:bg-gray-900"
                        />
                    </div>
                </div>

                {/* Templates Grid */}
                {filteredTemplates.length === 0 ? (
                    <div className="space-y-3 rounded-[28px] border border-gray-100 bg-white py-20 text-center dark:border-gray-800 dark:bg-gray-900">
                        <LayoutTemplate className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">No templates found</h3>
                        <p className="mx-auto max-w-sm text-xs text-gray-400">
                            Save boards, projects, or documents as reusable templates from their respective views.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredTemplates.map((template) => (
                            <div
                                key={template.id}
                                className="group flex flex-col justify-between rounded-[28px] border border-gray-100 bg-white p-6 transition-all duration-300 hover:border-[#ff5ac4] hover:shadow-xl dark:border-gray-800 dark:bg-gray-900"
                            >
                                <div>
                                    <div className="mb-3 flex items-start justify-between">
                                        <div
                                            className="flex h-10 w-10 items-center justify-center rounded-2xl text-white"
                                            style={{ backgroundColor: template.color || '#ff5ac4' }}
                                        >
                                            {template.type === 'project' ? (
                                                <Briefcase className="h-5 w-5" />
                                            ) : template.type === 'board' ? (
                                                <FolderKanban className="h-5 w-5" />
                                            ) : (
                                                <BookOpen className="h-5 w-5" />
                                            )}
                                        </div>
                                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600 uppercase dark:bg-gray-800 dark:text-gray-300">
                                            {template.type}
                                        </span>
                                    </div>

                                    <h3 className="text-base font-bold text-gray-900 transition-colors group-hover:text-[#ff5ac4] dark:text-white">
                                        {template.title}
                                    </h3>
                                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                                        {template.description || 'Pre-configured workflow template with columns and tasks.'}
                                    </p>

                                    <div className="mt-4 border-t border-gray-100 pt-3 text-[11px] text-gray-400 dark:border-gray-800">
                                        <span>Category: </span>
                                        <span className="font-semibold text-gray-700 capitalize dark:text-gray-300">
                                            {template.category.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                                    <Button
                                        onClick={() => handleOpenUse(template)}
                                        className="w-full rounded-xl bg-[#ff5ac4] py-2 text-xs font-bold text-white shadow-sm hover:bg-[#e045a7]"
                                    >
                                        Use Template <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Instantiate Modal */}
                <Dialog open={isUseOpen} onOpenChange={setIsUseOpen}>
                    <DialogContent className="max-w-md rounded-[24px]">
                        <DialogHeader>
                            <DialogTitle>Create from Template: {selectedTemplate?.title}</DialogTitle>
                        </DialogHeader>
                        {selectedTemplate && (
                            <form onSubmit={handleInstantiate} className="space-y-4 pt-2">
                                {selectedTemplate.type === 'project' ? (
                                    <>
                                        <div className="space-y-1">
                                            <Label>Project Name</Label>
                                            <Input
                                                value={instantiateForm.data.name}
                                                onChange={(e) => instantiateForm.setData('name', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Target Workspace</Label>
                                            <select
                                                value={instantiateForm.data.workspace_id}
                                                onChange={(e) => instantiateForm.setData('workspace_id', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                            >
                                                {workspaces.map((w) => (
                                                    <option key={w.id} value={w.id}>
                                                        {w.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Client (Optional)</Label>
                                            <select
                                                value={instantiateForm.data.client_id}
                                                onChange={(e) => instantiateForm.setData('client_id', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                            >
                                                <option value="">No Client Association</option>
                                                {clients.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.name} ({c.company_name})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1">
                                            <Label>Title</Label>
                                            <Input
                                                value={instantiateForm.data.title}
                                                onChange={(e) => instantiateForm.setData('title', e.target.value)}
                                                required
                                            />
                                        </div>
                                        {selectedTemplate.type === 'board' && (
                                            <div className="space-y-1">
                                                <Label>Workspace</Label>
                                                <select
                                                    value={instantiateForm.data.workspace_id}
                                                    onChange={(e) => instantiateForm.setData('workspace_id', e.target.value)}
                                                    className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                                >
                                                    {workspaces.map((w) => (
                                                        <option key={w.id} value={w.id}>
                                                            {w.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="flex justify-end gap-2 border-t pt-3">
                                    <Button type="button" variant="ghost" onClick={() => setIsUseOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={instantiateForm.processing}
                                        className="bg-[#ff5ac4] text-white hover:bg-[#e045a7]"
                                    >
                                        Generate Records
                                    </Button>
                                </div>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
