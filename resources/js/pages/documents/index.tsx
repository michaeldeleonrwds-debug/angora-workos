import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { FileText, Folder, Plus, RotateCcw, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Document Management', href: '/documents' },
];

interface DocumentProps {
    categories: any[];
    documents: any[];
    trashedDocuments: any[];
}

export default function DocumentPage({ categories = [], documents = [], trashedDocuments = [] }: DocumentProps) {
    const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [isOpen, setIsOpen] = useState(false);

    const [newDoc, setNewDoc] = useState({
        category_id: categories[0]?.id || '',
        title: '',
        original_filename: '',
        department_access: 'All',
        version: '1.0',
    });

    const handleCreateDocument = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/documents', newDoc, {
            onSuccess: () => {
                setIsOpen(false);
                setNewDoc({ category_id: categories[0]?.id || '', title: '', original_filename: '', department_access: 'All', version: '1.0' });
            },
        });
    };

    const handleToggleTrash = (docId: number) => {
        router.patch(`/documents/${docId}/trash`, {}, { preserveScroll: true });
    };

    const displayDocs = viewMode === 'active' ? documents : trashedDocuments;
    const filteredDocs = selectedCategory === 'All' ? displayDocs : displayDocs.filter((d) => String(d.category_id) === String(selectedCategory));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Document & File Management" />

            <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 p-4 text-[#191927] transition-colors md:p-6 lg:p-8 dark:text-white">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-[#191927] dark:text-white">Document & File Management</h1>
                            <Badge variant="outline" className="border-[#ECECF0] text-xs text-[#777785] dark:border-[#28283E] dark:text-slate-400">
                                Module 09
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#777785] md:text-sm dark:text-slate-400">
                            Enterprise document vault, multi-department access permissions, revision history, and recycle bin.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center rounded-xl border border-[#ECECF0] bg-slate-50 p-1 dark:border-[#28283E] dark:bg-[#181826]">
                            <Button
                                size="sm"
                                variant={viewMode === 'active' ? 'secondary' : 'ghost'}
                                onClick={() => setViewMode('active')}
                                className="h-7 rounded-lg text-xs dark:text-white"
                            >
                                <Folder className="mr-1.5 h-3.5 w-3.5 text-violet-600" />
                                Repository ({documents.length})
                            </Button>
                            <Button
                                size="sm"
                                variant={viewMode === 'trash' ? 'secondary' : 'ghost'}
                                onClick={() => setViewMode('trash')}
                                className="h-7 rounded-lg text-xs dark:text-white"
                            >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5 text-rose-500" />
                                Recycle Bin ({trashedDocuments.length})
                            </Button>
                        </div>

                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 rounded-xl bg-violet-600 text-white shadow-sm hover:bg-violet-700">
                                    <Plus className="h-4 w-4" />
                                    Register Document
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-2xl border-[#ECECF0] bg-white dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white">
                                <DialogHeader>
                                    <DialogTitle>Upload Document to Vault</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateDocument} className="space-y-4 pt-2">
                                    <div>
                                        <Label>Document Category</Label>
                                        <Select
                                            value={String(newDoc.category_id)}
                                            onValueChange={(val) => setNewDoc({ ...newDoc, category_id: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-[#ECECF0] bg-white dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white">
                                                {categories.map((c) => (
                                                    <SelectItem key={c.id} value={String(c.id)}>
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Document Title</Label>
                                        <Input
                                            required
                                            value={newDoc.title}
                                            onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                                            placeholder="e.g. SMT Line SOP Rev 2.1"
                                        />
                                    </div>
                                    <div>
                                        <Label>Original File Name</Label>
                                        <Input
                                            required
                                            value={newDoc.original_filename}
                                            onChange={(e) => setNewDoc({ ...newDoc, original_filename: e.target.value })}
                                            placeholder="e.g. SMT_Quality_Procedure_2026.pdf"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Department Access</Label>
                                            <Select
                                                value={newDoc.department_access}
                                                onValueChange={(val) => setNewDoc({ ...newDoc, department_access: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-[#ECECF0] bg-white dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white">
                                                    <SelectItem value="All">All Departments</SelectItem>
                                                    <SelectItem value="Engineering">Engineering Only</SelectItem>
                                                    <SelectItem value="HR">HR Only</SelectItem>
                                                    <SelectItem value="Production & QC">Production & QC Only</SelectItem>
                                                    <SelectItem value="Finance">Finance Only</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Version</Label>
                                            <Input
                                                value={newDoc.version}
                                                onChange={(e) => setNewDoc({ ...newDoc, version: e.target.value })}
                                                placeholder="1.0"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="rounded-xl bg-violet-600 text-white hover:bg-violet-700">
                                            Save Document
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Categories Pills */}
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        size="sm"
                        variant={selectedCategory === 'All' ? 'default' : 'outline'}
                        onClick={() => setSelectedCategory('All')}
                        className={`h-8 rounded-xl text-xs ${selectedCategory === 'All' ? '' : 'border-[#ECECF0] bg-white text-[#191927] dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white'}`}
                    >
                        All Categories
                    </Button>
                    {categories.map((c) => (
                        <Button
                            key={c.id}
                            size="sm"
                            variant={selectedCategory === String(c.id) ? 'default' : 'outline'}
                            onClick={() => setSelectedCategory(String(c.id))}
                            className={`h-8 rounded-xl text-xs ${selectedCategory === String(c.id) ? '' : 'border-[#ECECF0] bg-white text-[#191927] dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white'}`}
                        >
                            {c.name} ({c.documents_count})
                        </Button>
                    ))}
                </div>

                {/* Document Files List */}
                <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-[#191927] dark:text-white">
                            {viewMode === 'active' ? 'Vault File Archive' : 'Recycle Bin Archive'}
                        </CardTitle>
                        <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                            Secure versioned records with departmental permissions
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-[#ECECF0] overflow-hidden rounded-xl border border-[#ECECF0] dark:divide-[#28283E] dark:border-[#28283E]">
                            {filteredDocs.length === 0 ? (
                                <div className="p-8 text-center text-xs text-[#777785] dark:text-slate-400">No documents found in this section</div>
                            ) : (
                                filteredDocs.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="flex flex-col justify-between gap-3 p-4 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center dark:hover:bg-[#181826]/70"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 rounded-xl bg-violet-500/10 p-2 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-semibold text-[#191927] dark:text-white">{doc.title}</h3>
                                                    <Badge
                                                        variant="outline"
                                                        className="border-[#ECECF0] text-[10px] text-[#777785] dark:border-[#28283E] dark:text-slate-400"
                                                    >
                                                        v{doc.version}
                                                    </Badge>
                                                    <Badge
                                                        variant="secondary"
                                                        className="bg-[#ECECF0] text-[10px] text-[#191927] dark:bg-[#28283E] dark:text-slate-300"
                                                    >
                                                        {doc.department_access} Access
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-[#777785] dark:text-slate-400">
                                                    <span>{doc.original_filename}</span>
                                                    <span>• {(doc.file_size_kb / 1024).toFixed(2)} MB</span>
                                                    <span>• Added by: {doc.user?.name || 'Staff'}</span>
                                                    {doc.created_at && <span>• {formatDate(doc.created_at)}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleToggleTrash(doc.id)}
                                                className={`h-8 gap-1.5 rounded-xl border-[#ECECF0] text-xs dark:border-[#28283E] ${viewMode === 'trash' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                                            >
                                                {viewMode === 'trash' ? (
                                                    <>
                                                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 className="h-3.5 w-3.5" /> Trash
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
