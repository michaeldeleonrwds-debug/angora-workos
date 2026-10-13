import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { BookOpen, ChevronRight, FileText, Plus, Search } from 'lucide-react';
import React, { useState } from 'react';

interface WorkdocItem {
    id: number;
    title: string;
    folder_name?: string;
    visibility: string;
    is_template: boolean;
    is_favorite: boolean;
    updated_at: string;
    owner: { id: number; name: string };
    project?: { id: number; name: string; code: string };
    board?: { id: number; title: string };
    task?: { id: number; title: string };
}

interface Props {
    docs: WorkdocItem[];
    folders: string[];
    projects: Array<{ id: number; name: string; code: string }>;
}

export default function WorkdocsIndex({ docs, folders, projects }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFolder, setSelectedFolder] = useState<string>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const { data, setData, post, processing, reset } = useForm({
        title: '',
        folder_name: 'General',
        project_id: '',
        visibility: 'team',
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        post('/workdocs', {
            onSuccess: () => {
                setIsCreateOpen(false);
                reset();
            },
        });
    };

    const filteredDocs = docs.filter((d) => {
        const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase());
        if (selectedFolder === 'all') return matchesSearch;
        return matchesSearch && d.folder_name === selectedFolder;
    });

    return (
        <AppLayout breadcrumbs={[{ title: 'Workdocs Library', href: '/workdocs' }]}>
            <Head title="Workdocs Library & Collaborative Documents" />

            <div className="mx-auto max-w-7xl space-y-6 p-6">
                {/* Header Banner */}
                <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-[28px] bg-gradient-to-r from-[#12121E] via-[#211a33] to-[#252542] p-8 text-white shadow-xl md:flex-row md:items-center">
                    <div className="relative z-10 space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#a25ddc] backdrop-blur-md">
                            <BookOpen className="h-3.5 w-3.5" /> monday.com Collaborative Workdocs
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white">Angora Workdocs Library</h1>
                        <p className="max-w-xl text-sm text-gray-300">
                            Create rich project briefs, meeting notes, SOPs, and QA checklists. Reference live tasks, collaborate via inline comments,
                            and track autosaved version snapshots.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-3">
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="rounded-xl bg-[#a25ddc] font-bold text-white shadow-lg hover:bg-[#8f4ac9]">
                                    <Plus className="mr-1.5 h-4 w-4" /> New Workdoc
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md rounded-[24px]">
                                <DialogHeader>
                                    <DialogTitle>Create Collaborative Workdoc</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreate} className="space-y-4 pt-2">
                                    <div className="space-y-1">
                                        <Label>Document Title</Label>
                                        <Input
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="e.g. Q4 Website Discovery & Architecture Brief"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label>Folder / Section</Label>
                                            <Input
                                                value={data.folder_name}
                                                onChange={(e) => setData('folder_name', e.target.value)}
                                                placeholder="e.g. Project Briefs"
                                            />
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
                                                <option value="client_shared">Shared with Client Portal</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Link to Agency Project (Optional)</Label>
                                        <select
                                            value={data.project_id}
                                            onChange={(e) => setData('project_id', e.target.value)}
                                            className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                        >
                                            <option value="">No Project Link</option>
                                            {projects.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.code} - {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-3">
                                        <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={processing} className="bg-[#a25ddc] text-white">
                                            Create Document
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Filter and Search */}
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <div className="flex w-full items-center gap-1.5 overflow-x-auto rounded-2xl bg-gray-100 p-1 sm:w-auto dark:bg-gray-800/80">
                        <button
                            onClick={() => setSelectedFolder('all')}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                selectedFolder === 'all'
                                    ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            All Docs ({docs.length})
                        </button>
                        {folders.map((f) => (
                            <button
                                key={f}
                                onClick={() => setSelectedFolder(f)}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                    selectedFolder === f
                                        ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white'
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Search workdocs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="rounded-xl border-gray-200 bg-white pl-9 dark:border-gray-800 dark:bg-gray-900"
                        />
                    </div>
                </div>

                {/* Docs Grid */}
                {filteredDocs.length === 0 ? (
                    <div className="space-y-3 rounded-[28px] border border-gray-100 bg-white py-20 text-center dark:border-gray-800 dark:bg-gray-900">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">No documents found</h3>
                        <p className="mx-auto max-w-sm text-xs text-gray-400">
                            Author collaborative living documents, connect them to tasks, and share them with your team.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredDocs.map((doc) => (
                            <Link
                                key={doc.id}
                                href={`/workdocs/${doc.id}`}
                                className="group flex flex-col justify-between rounded-[28px] border border-gray-100 bg-white p-6 transition-all duration-300 hover:border-[#a25ddc] hover:shadow-xl dark:border-gray-800 dark:bg-gray-900"
                            >
                                <div>
                                    <div className="mb-3 flex items-start justify-between">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-[#a25ddc] dark:bg-purple-950/60">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 capitalize dark:bg-gray-800 dark:text-gray-300">
                                            {doc.visibility.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <h3 className="text-base font-bold text-gray-900 transition-colors group-hover:text-[#a25ddc] dark:text-white">
                                        {doc.title}
                                    </h3>
                                    <p className="mt-1 text-xs text-gray-400">Folder: {doc.folder_name || 'General'}</p>

                                    {doc.project && (
                                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] text-gray-400 dark:border-gray-800">
                                            <span>Project:</span>
                                            <span className="font-semibold text-gray-700 dark:text-gray-200">{doc.project.code}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-400 dark:border-gray-800">
                                    <span>By {doc.owner.name}</span>
                                    <span className="flex items-center font-semibold text-[#a25ddc] transition-transform group-hover:translate-x-1">
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
