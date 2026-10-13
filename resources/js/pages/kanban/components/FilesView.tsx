import { Input } from '@/components/ui/input';
import { Download, FileArchive, FileSpreadsheet, FileText, Files as FilesIcon, HardDrive, Image as ImageIcon, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { KanbanBoard, Task, TaskAttachment, User } from '../types';

interface FilesViewProps {
    board: KanbanBoard;
    searchTerm: string;
    personFilter: string;
    priorityFilter: string;
    users: User[];
    onSelectTask: (task: Task) => void;
}

export default function FilesView({ board, searchTerm, personFilter, priorityFilter, users = [], onSelectTask }: FilesViewProps) {
    const [fileFilter, setFileFilter] = useState<'all' | 'image' | 'pdf' | 'spreadsheet' | 'archive'>('all');
    const [localSearch, setLocalSearch] = useState('');

    // Gather all attachments from all tasks on this board
    const allAttachments = useMemo(() => {
        const list: { attachment: TaskAttachment; task: Task }[] = [];
        (board.groups || []).forEach((g) => {
            (g.tasks || []).forEach((t) => {
                (t.attachments || []).forEach((att) => {
                    list.push({ attachment: att, task: t });
                });
            });
        });
        return list;
    }, [board.groups]);

    // Apply filtering
    const filteredFiles = useMemo(() => {
        return allAttachments.filter(({ attachment, task }) => {
            if (localSearch) {
                const q = localSearch.toLowerCase();
                const matchName = attachment.file_name.toLowerCase().includes(q);
                const matchTask = task.title.toLowerCase().includes(q);
                if (!matchName && !matchTask) return false;
            }

            if (fileFilter !== 'all') {
                const mime = attachment.mime_type.toLowerCase();
                const name = attachment.file_name.toLowerCase();
                if (fileFilter === 'image' && !mime.includes('image')) return false;
                if (fileFilter === 'pdf' && !mime.includes('pdf') && !name.endsWith('.pdf')) return false;
                if (
                    fileFilter === 'spreadsheet' &&
                    !mime.includes('sheet') &&
                    !mime.includes('csv') &&
                    !name.endsWith('.xlsx') &&
                    !name.endsWith('.csv')
                )
                    return false;
                if (fileFilter === 'archive' && !mime.includes('zip') && !mime.includes('tar') && !name.endsWith('.zip')) return false;
            }

            return true;
        });
    }, [allAttachments, localSearch, fileFilter]);

    const formatBytes = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getFileIcon = (mime: string, name: string) => {
        if (mime.includes('image')) return <ImageIcon className="h-5 w-5 text-indigo-500" />;
        if (mime.includes('pdf') || name.endsWith('.pdf')) return <FileText className="h-5 w-5 text-rose-500" />;
        if (mime.includes('sheet') || name.endsWith('.xlsx') || name.endsWith('.csv'))
            return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
        if (mime.includes('zip') || name.endsWith('.zip')) return <FileArchive className="h-5 w-5 text-amber-500" />;
        return <HardDrive className="h-5 w-5 text-slate-500" />;
    };

    return (
        <div className="border-border bg-card space-y-4 rounded-2xl border p-4 shadow-xs">
            {/* Header Toolbar */}
            <div className="border-border/50 flex flex-col items-start justify-between gap-3 border-b pb-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                    <FilesIcon className="text-primary h-4 w-4" />
                    <h3 className="text-foreground text-sm font-bold">Board Document & Asset Vault</h3>
                    <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs">{allAttachments.length} files</span>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[160px]">
                        <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                        <Input
                            placeholder="Filter files..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="bg-background border-border h-8 rounded-xl pr-2.5 pl-8 text-xs"
                        />
                    </div>

                    <div className="bg-muted/60 border-border/50 flex rounded-xl border p-0.5 text-xs">
                        <button
                            onClick={() => setFileFilter('all')}
                            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                                fileFilter === 'all' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFileFilter('image')}
                            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                                fileFilter === 'image' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                            }`}
                        >
                            Images
                        </button>
                        <button
                            onClick={() => setFileFilter('pdf')}
                            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                                fileFilter === 'pdf' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                            }`}
                        >
                            PDFs
                        </button>
                        <button
                            onClick={() => setFileFilter('spreadsheet')}
                            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                                fileFilter === 'spreadsheet' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
                            }`}
                        >
                            Sheets
                        </button>
                    </div>
                </div>
            </div>

            {/* Files Grid */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredFiles.map(({ attachment, task }) => {
                    const isImg = attachment.mime_type.startsWith('image/');
                    return (
                        <div
                            key={attachment.id}
                            className="border-border/70 hover:border-primary/50 bg-background hover:bg-card group flex flex-col justify-between gap-3 rounded-xl border p-3 transition-all"
                        >
                            {/* File Preview Thumbnail if image */}
                            {isImg ? (
                                <div className="bg-muted/30 border-border/40 relative h-28 w-full overflow-hidden rounded-lg border">
                                    <img
                                        src={`/storage/${attachment.file_path}`}
                                        alt={attachment.file_name}
                                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                    />
                                </div>
                            ) : (
                                <div className="bg-muted/40 border-border/40 flex h-20 w-full items-center justify-center rounded-lg border">
                                    {getFileIcon(attachment.mime_type, attachment.file_name)}
                                </div>
                            )}

                            {/* Details */}
                            <div className="space-y-1">
                                <h4
                                    className="text-foreground group-hover:text-primary truncate text-xs font-bold transition-colors"
                                    title={attachment.file_name}
                                >
                                    {attachment.file_name}
                                </h4>
                                <div className="text-muted-foreground flex items-center justify-between text-[10px]">
                                    <span>{formatBytes(attachment.file_size_bytes)}</span>
                                    <span>{attachment.user?.name || 'User'}</span>
                                </div>

                                <button
                                    onClick={() => onSelectTask(task)}
                                    className="text-primary/80 hover:text-primary border-border/30 block w-full truncate border-t pt-1 text-left text-[10px] font-semibold"
                                >
                                    Attached to: {task.title}
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-1.5 pt-1">
                                <a
                                    href={`/storage/${attachment.file_path}`}
                                    download={attachment.file_name}
                                    className="border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg border p-1.5 transition-all"
                                    title="Download File"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                </a>
                            </div>
                        </div>
                    );
                })}

                {filteredFiles.length === 0 && (
                    <div className="text-muted-foreground col-span-full space-y-2 py-16 text-center text-xs">
                        <FilesIcon className="text-muted-foreground mx-auto h-8 w-8 opacity-30" />
                        <p>No attachments found on this board.</p>
                        <p className="text-[11px] opacity-70">Upload files inside any item details overlay to see them aggregated here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
