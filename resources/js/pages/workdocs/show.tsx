import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Bold, History, Italic, List, ListOrdered, MessageSquare, RotateCcw, Save, Send, Sparkles, Underline } from 'lucide-react';
import React, { useRef, useState } from 'react';

interface Version {
    id: number;
    version_number: string;
    summary?: string;
    created_at: string;
    content: string;
    user?: { id: number; name: string };
}

interface Comment {
    id: number;
    comment: string;
    is_resolved: boolean;
    created_at: string;
    user: { id: number; name: string };
    replies: any[];
}

interface Workdoc {
    id: number;
    title: string;
    content: string;
    visibility: string;
    folder_name?: string;
    project_id?: number;
    board_id?: number;
    task_id?: number;
    owner: { id: number; name: string };
    project?: { id: number; name: string; code: string };
    task?: { id: number; title: string };
    versions: Version[];
    comments: Comment[];
}

interface Props {
    doc: Workdoc;
    tasks: Array<{ id: number; title: string }>;
    projects: Array<{ id: number; name: string; code: string }>;
    canEdit: boolean;
}

export default function WorkdocShow({ doc, tasks, projects, canEdit }: Props) {
    const [title, setTitle] = useState(doc.title);
    const [content, setContent] = useState(doc.content || '');
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const [isVersionsOpen, setIsVersionsOpen] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [commentText, setCommentText] = useState('');
    const contentEditableRef = useRef<HTMLDivElement>(null);

    // Autosave handler (debounced)
    const saveContent = async (explicitVersion = false) => {
        if (!canEdit) return;
        setIsSaving(true);
        try {
            await fetch(`/workdocs/${doc.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({
                    title,
                    content,
                    create_version: explicitVersion,
                    version_summary: explicitVersion ? 'Manual checkpoint snapshot' : undefined,
                }),
            });
            setLastSaved(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Failed to autosave workdoc', e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestoreVersion = (versionId: number) => {
        if (confirm('Restore this snapshot? Current content will be archived.')) {
            router.post(`/workdocs/${doc.id}/versions/${versionId}/restore`);
        }
    };

    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        router.post(
            `/workdocs/${doc.id}/comments`,
            { comment: commentText },
            {
                onSuccess: () => setCommentText(''),
            },
        );
    };

    const [isAiOpen, setIsAiOpen] = useState(false);
    const [aiAction, setAiAction] = useState('improve');
    const [aiResult, setAiResult] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const handleRunAi = async () => {
        setIsAiLoading(true);
        try {
            const res = await fetch('/ai/assist-workdoc', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({
                    workdoc_id: doc.id,
                    action: aiAction,
                    selected_text: content,
                }),
            });
            const data = await res.json();
            if (data.success && data.result) {
                setAiResult(data.result.content || data.result.tool_calls?.improved_text);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsAiLoading(false);
        }
    };

    // Format commands using standard contentEditable execCommand
    const formatDoc = (cmd: string, val: string | undefined = undefined) => {
        document.execCommand(cmd, false, val);
        if (contentEditableRef.current) {
            setContent(contentEditableRef.current.innerHTML);
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Workdocs', href: '/workdocs' },
                { title: doc.title, href: `/workdocs/${doc.id}` },
            ]}
        >
            <Head title={`${doc.title} | Angora Workdocs`} />

            <div className="flex h-[calc(100vh-65px)] flex-col bg-[#F8F9F7] dark:bg-[#12121E]">
                {/* Header Toolbar */}
                <div className="z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-2.5 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <Link href="/workdocs" className="text-gray-400 hover:text-gray-600">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={() => saveContent(false)}
                            disabled={!canEdit}
                            className="max-w-md border-none p-0 text-lg font-extrabold text-[#12121E] shadow-none focus-visible:ring-0 dark:text-white"
                        />
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 uppercase dark:bg-purple-950/60 dark:text-purple-300">
                            {doc.visibility.replace('_', ' ')}
                        </span>
                        {doc.project && (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                Project: {doc.project.code}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400">
                            {isSaving ? 'Saving...' : lastSaved ? `Saved at ${lastSaved}` : 'Autosaved'}
                        </span>

                        <Button variant="outline" size="sm" onClick={() => setIsVersionsOpen(true)} className="h-8 rounded-xl text-xs">
                            <History className="mr-1 h-3.5 w-3.5" /> History ({doc.versions.length})
                        </Button>

                        <Button variant="outline" size="sm" onClick={() => setIsCommentsOpen(true)} className="h-8 rounded-xl text-xs">
                            <MessageSquare className="mr-1 h-3.5 w-3.5" /> Comments ({doc.comments.length})
                        </Button>

                        {canEdit && (
                            <Button
                                size="sm"
                                onClick={() => {
                                    setAiResult(null);
                                    setIsAiOpen(true);
                                }}
                                className="mr-1 h-8 rounded-xl border border-[#D8F779]/30 bg-[#191927] text-xs font-bold text-[#D8F779] hover:bg-black"
                            >
                                <Sparkles className="mr-1 h-3.5 w-3.5 text-[#D8F779]" /> AI Assistant
                            </Button>
                        )}

                        {canEdit && (
                            <Button
                                size="sm"
                                onClick={() => saveContent(true)}
                                className="h-8 rounded-xl bg-[#a25ddc] text-xs font-bold text-white hover:bg-[#8f4ac9]"
                            >
                                <Save className="mr-1 h-3.5 w-3.5" /> Save Milestone
                            </Button>
                        )}
                    </div>
                </div>

                {/* Rich Text Editor Canvas */}
                <div className="flex flex-1 flex-col items-center overflow-y-auto p-6">
                    {canEdit && (
                        /* Text Formatting Toolbar */
                        <div className="sticky top-0 z-20 mb-6 flex items-center gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-md dark:border-gray-700 dark:bg-gray-800">
                            <button
                                onClick={() => formatDoc('bold')}
                                className="rounded-xl p-1.5 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                title="Bold"
                            >
                                <Bold className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => formatDoc('italic')}
                                className="rounded-xl p-1.5 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                title="Italic"
                            >
                                <Italic className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => formatDoc('underline')}
                                className="rounded-xl p-1.5 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                title="Underline"
                            >
                                <Underline className="h-4 w-4" />
                            </button>
                            <span className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />
                            <button
                                onClick={() => formatDoc('formatBlock', '<h1>')}
                                className="rounded-xl p-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                title="Heading 1"
                            >
                                H1
                            </button>
                            <button
                                onClick={() => formatDoc('formatBlock', '<h2>')}
                                className="rounded-xl p-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                title="Heading 2"
                            >
                                H2
                            </button>
                            <button
                                onClick={() => formatDoc('insertUnorderedList')}
                                className="rounded-xl p-1.5 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                title="Bullet List"
                            >
                                <List className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => formatDoc('insertOrderedList')}
                                className="rounded-xl p-1.5 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                title="Numbered List"
                            >
                                <ListOrdered className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Document Page Canvas */}
                    <div className="prose dark:prose-invert min-h-[700px] w-full max-w-4xl max-w-none rounded-[32px] border border-gray-200 bg-white p-10 text-gray-900 shadow-xl sm:p-14 dark:border-gray-800 dark:bg-gray-900 dark:text-white">
                        <div
                            ref={contentEditableRef}
                            contentEditable={canEdit}
                            dangerouslySetInnerHTML={{ __html: doc.content }}
                            onBlur={(e) => {
                                setContent(e.currentTarget.innerHTML);
                                saveContent(false);
                            }}
                            className="min-h-[500px] outline-none"
                        />
                    </div>
                </div>

                {/* Versions History Modal */}
                <Dialog open={isVersionsOpen} onOpenChange={setIsVersionsOpen}>
                    <DialogContent className="max-w-lg rounded-[24px]">
                        <DialogHeader>
                            <DialogTitle>Document Version Snapshots</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-96 space-y-3 overflow-y-auto pt-2">
                            {doc.versions.map((v) => (
                                <div key={v.id} className="flex items-center justify-between rounded-2xl bg-gray-50 p-3 text-xs dark:bg-gray-800">
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">Version {v.version_number}</h4>
                                        <p className="text-[11px] text-gray-400">
                                            {v.summary || 'Snapshot'} • {new Date(v.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    {canEdit && (
                                        <Button size="sm" variant="outline" onClick={() => handleRestoreVersion(v.id)} className="rounded-xl text-xs">
                                            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Comments Drawer / Modal */}
                <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                    <DialogContent className="max-w-lg rounded-[24px]">
                        <DialogHeader>
                            <DialogTitle>Document Comments & Discussions</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                            <form onSubmit={handleAddComment} className="flex gap-2">
                                <Input
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Write a feedback note or mention a colleague..."
                                    className="rounded-xl text-xs"
                                />
                                <Button type="submit" size="sm" className="rounded-xl bg-[#a25ddc] text-white">
                                    <Send className="h-3.5 w-3.5" />
                                </Button>
                            </form>

                            <div className="max-h-80 space-y-3 overflow-y-auto">
                                {doc.comments.length === 0 ? (
                                    <p className="py-6 text-center text-xs text-gray-400">No comments yet.</p>
                                ) : (
                                    doc.comments.map((c) => (
                                        <div key={c.id} className="space-y-1 rounded-2xl bg-gray-50 p-3 text-xs dark:bg-gray-800">
                                            <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                                                <span>{c.user.name}</span>
                                                <span className="text-[10px] font-normal text-gray-400">
                                                    {new Date(c.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 dark:text-gray-300">{c.comment}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* AI Assistant Dialog */}
                <Dialog open={isAiOpen} onOpenChange={setIsAiOpen}>
                    <DialogContent className="max-w-md rounded-3xl bg-white p-6 dark:bg-gray-900">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base font-bold">
                                <Sparkles className="h-4 w-4 text-[#557b0b] dark:text-[#D8F779]" />
                                Angora AI Writing Tools
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">Action</label>
                                <select
                                    value={aiAction}
                                    onChange={(e) => setAiAction(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs dark:border-gray-700 dark:bg-gray-800"
                                >
                                    <option value="improve">Improve Writing & Clarity</option>
                                    <option value="summarize">Summarize Document</option>
                                    <option value="fix_grammar">Fix Grammar & Tone</option>
                                    <option value="extract_tasks">Extract Action Items & Tasks</option>
                                    <option value="shorten">Make Shorter & Concise</option>
                                    <option value="expand">Expand with Detail</option>
                                </select>
                            </div>

                            <Button
                                onClick={handleRunAi}
                                disabled={isAiLoading}
                                className="w-full rounded-xl bg-[#191927] text-xs font-bold text-white dark:bg-[#D8F779] dark:text-[#191927]"
                            >
                                {isAiLoading ? 'Analyzing Document...' : 'Run AI Assistant'}
                            </Button>

                            {aiResult && (
                                <div className="space-y-3 pt-2">
                                    <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs whitespace-pre-wrap dark:border-gray-700 dark:bg-gray-800">
                                        {aiResult}
                                    </div>
                                    <Button
                                        onClick={() => {
                                            setContent(content + `<br><br><div class="ai-generated">${aiResult}</div>`);
                                            setIsAiOpen(false);
                                        }}
                                        className="w-full rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                                    >
                                        Insert into Document
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
