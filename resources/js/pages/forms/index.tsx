import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle2, Copy, ExternalLink, FileCheck, Plus, Search } from 'lucide-react';
import React, { useState } from 'react';

interface FormItem {
    id: number;
    uuid: string;
    title: string;
    description?: string;
    category: string;
    visibility: string;
    is_published: boolean;
    submissions_count: number;
    board?: { id: number; title: string };
    project?: { id: number; name: string; code: string };
    owner: { id: number; name: string };
    created_at: string;
}

interface Props {
    forms: FormItem[];
    boards: Array<{ id: number; title: string }>;
    projects: Array<{ id: number; name: string; code: string }>;
}

export default function FormsIndex({ forms, boards, projects }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [copiedUuid, setCopiedUuid] = useState<string | null>(null);

    const { data, setData, post, processing, reset } = useForm({
        title: '',
        description: '',
        category: 'design',
        board_id: '',
        project_id: '',
        visibility: 'internal',
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        post('/forms', {
            onSuccess: () => {
                setIsCreateOpen(false);
                reset();
            },
        });
    };

    const copyPublicUrl = (uuid: string) => {
        const url = `${window.location.origin}/f/${uuid}`;
        navigator.clipboard.writeText(url);
        setCopiedUuid(uuid);
        setTimeout(() => setCopiedUuid(null), 2000);
    };

    const filteredForms = forms.filter(
        (f) =>
            f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase())),
    );

    return (
        <AppLayout breadcrumbs={[{ title: 'WorkForms Builder', href: '/forms' }]}>
            <Head title="WorkForms Builder & Client Inquiries" />

            <div className="mx-auto max-w-7xl space-y-6 p-6">
                {/* Header Banner */}
                <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-[28px] bg-gradient-to-r from-[#12121E] via-[#1a1a2e] to-[#252542] p-8 text-white shadow-xl md:flex-row md:items-center">
                    <div className="relative z-10 space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#00c875] backdrop-blur-md">
                            <FileCheck className="h-3.5 w-3.5" /> monday.com WorkForms Engine
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white">Agency WorkForms</h1>
                        <p className="max-w-xl text-sm text-gray-300">
                            Build conditional request forms that automatically generate tasks on production boards, assign team members, and kick off
                            review automations.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-3">
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="rounded-xl bg-[#00c875] font-bold text-[#12121E] shadow-lg hover:bg-[#00b268]">
                                    <Plus className="mr-1.5 h-4 w-4" /> Create Form
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md rounded-[24px]">
                                <DialogHeader>
                                    <DialogTitle>Create Agency Request Form</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreate} className="space-y-4 pt-2">
                                    <div className="space-y-1">
                                        <Label>Form Title</Label>
                                        <Input
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="e.g. Q4 Website Development Intake"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Description</Label>
                                        <Input
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Instructions for submitters..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label>Request Category</Label>
                                            <select
                                                value={data.category}
                                                onChange={(e) => setData('category', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                            >
                                                <option value="design">Graphic Design Request</option>
                                                <option value="web_dev">Website Development Request</option>
                                                <option value="revision">Design Revision Request</option>
                                                <option value="onboarding">Client Onboarding Intake</option>
                                                <option value="general">General Task Submission</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Access Visibility</Label>
                                            <select
                                                value={data.visibility}
                                                onChange={(e) => setData('visibility', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                            >
                                                <option value="internal">Internal Team Only</option>
                                                <option value="project_members">Project Members</option>
                                                <option value="client_portal">Client Portal</option>
                                                <option value="public">Public Link</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Target Kanban Board (Optional)</Label>
                                        <select
                                            value={data.board_id}
                                            onChange={(e) => setData('board_id', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                        >
                                            <option value="">Default Board</option>
                                            {boards.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-3">
                                        <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={processing} className="bg-[#00c875] text-[#12121E]">
                                            Create & Configure
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Filter and Search */}
                <div className="flex items-center justify-between gap-4">
                    <div className="relative w-72">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Search forms..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="rounded-xl border-gray-200 bg-white pl-9 dark:border-gray-800 dark:bg-gray-900"
                        />
                    </div>
                </div>

                {/* Forms Grid */}
                {filteredForms.length === 0 ? (
                    <div className="space-y-3 rounded-[28px] border border-gray-100 bg-white py-20 text-center dark:border-gray-800 dark:bg-gray-900">
                        <FileCheck className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">No forms created yet</h3>
                        <p className="mx-auto max-w-sm text-xs text-gray-400">
                            Design intake forms for client briefs, bug reports, design requests, and feature specs.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredForms.map((form) => (
                            <div
                                key={form.id}
                                className="group flex flex-col justify-between rounded-[28px] border border-gray-100 bg-white p-6 transition-all duration-300 hover:border-[#00c875] hover:shadow-xl dark:border-gray-800 dark:bg-gray-900"
                            >
                                <div>
                                    <div className="mb-3 flex items-start justify-between">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[#00c875] dark:bg-emerald-950/60">
                                            <FileCheck className="h-5 w-5" />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 uppercase dark:bg-gray-800 dark:text-gray-300">
                                                {form.visibility}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="text-base font-bold text-gray-900 transition-colors group-hover:text-[#00c875] dark:text-white">
                                        {form.title}
                                    </h3>
                                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                                        {form.description || 'Intake request form mapped to Kanban boards.'}
                                    </p>

                                    <div className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-[11px] text-gray-400 dark:border-gray-800">
                                        <div className="flex justify-between">
                                            <span>Submissions:</span>
                                            <span className="font-bold text-gray-900 dark:text-white">{form.submissions_count}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Destination Board:</span>
                                            <span className="max-w-[140px] truncate font-medium text-gray-700 dark:text-gray-300">
                                                {form.board?.title ?? 'Default'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-4 text-xs dark:border-gray-800">
                                    <Link href={`/forms/${form.id}/edit`}>
                                        <Button size="sm" variant="outline" className="h-8 rounded-xl text-[11px]">
                                            Builder
                                        </Button>
                                    </Link>
                                    <Link href={`/forms/${form.id}/submissions`}>
                                        <Button size="sm" variant="ghost" className="h-8 rounded-xl text-[11px]">
                                            Submissions ({form.submissions_count})
                                        </Button>
                                    </Link>
                                    <button
                                        onClick={() => copyPublicUrl(form.uuid)}
                                        className="ml-auto rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-[#00c875] dark:hover:bg-gray-800"
                                        title="Copy Public Link"
                                    >
                                        {copiedUuid === form.uuid ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </button>
                                    <a href={`/f/${form.uuid}`} target="_blank" rel="noreferrer" title="Open Public Form">
                                        <ExternalLink className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
