import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LayoutGrid, MessageCircle, Paperclip } from 'lucide-react';
import { useMemo } from 'react';
import { KanbanBoard, Task, User } from '../types';

interface GalleryViewProps {
    board: KanbanBoard;
    searchTerm: string;
    personFilter: string;
    priorityFilter: string;
    users: User[];
    onSelectTask: (task: Task) => void;
}

export default function GalleryView({ board, searchTerm, personFilter, priorityFilter, users = [], onSelectTask }: GalleryViewProps) {
    const tasks = useMemo(() => {
        return (board.groups || [])
            .flatMap((g) => g.tasks || [])
            .filter((task) => {
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    if (!task.title.toLowerCase().includes(term)) return false;
                }
                if (personFilter !== 'all' && String(task.assigned_to) !== personFilter) return false;
                if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
                return true;
            });
    }, [board.groups, searchTerm, personFilter, priorityFilter]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="text-primary h-4 w-4" />
                    <h3 className="text-foreground text-sm font-bold">Visual Gallery Cards</h3>
                    <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs">{tasks.length} items</span>
                </div>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {tasks.map((task) => {
                    const isDone = !!task.completed_at;
                    const firstImg = (task.attachments || []).find((a) => a.mime_type.startsWith('image/'));

                    return (
                        <div
                            key={task.id}
                            onClick={() => onSelectTask(task)}
                            className="border-border/70 hover:border-primary/60 bg-card group flex cursor-pointer flex-col justify-between gap-3 rounded-2xl border p-4 transition-all hover:shadow-sm"
                        >
                            {/* Visual Header / Cover Image if attachment exists */}
                            {firstImg ? (
                                <div className="bg-muted/40 border-border/40 relative h-32 w-full overflow-hidden rounded-xl border">
                                    <img
                                        src={`/storage/${firstImg.file_path}`}
                                        alt={firstImg.file_name}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                </div>
                            ) : (
                                <div
                                    className="h-2.5 w-full rounded-full"
                                    style={{
                                        backgroundColor: isDone
                                            ? '#00c875'
                                            : task.priority === 'Urgent'
                                              ? '#e2445c'
                                              : task.priority === 'High'
                                                ? '#fdab3d'
                                                : '#579bfc',
                                    }}
                                />
                            )}

                            {/* Card Body */}
                            <div className="flex-1 space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span
                                        className="rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                                        style={{
                                            backgroundColor:
                                                task.priority === 'Urgent' ? '#fee2e2' : task.priority === 'High' ? '#ffedd5' : '#e0f2fe',
                                            color: task.priority === 'Urgent' ? '#b91c1c' : task.priority === 'High' ? '#c2410c' : '#0369a1',
                                        }}
                                    >
                                        {task.priority}
                                    </span>

                                    <span className="text-muted-foreground max-w-[120px] truncate text-[11px] font-semibold">
                                        {task.column?.title || 'Open'}
                                    </span>
                                </div>

                                <h4
                                    className={`group-hover:text-primary line-clamp-2 text-sm font-black tracking-tight transition-colors ${
                                        isDone ? 'text-muted-foreground line-through' : 'text-foreground'
                                    }`}
                                >
                                    {task.title}
                                </h4>

                                {task.description && <p className="text-muted-foreground line-clamp-2 text-xs">{task.description}</p>}
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1">
                                <div className="text-muted-foreground flex items-center justify-between text-[10px] font-semibold">
                                    <span>Progress</span>
                                    <span>{task.progress || 0}%</span>
                                </div>
                                <div className="bg-muted/60 h-1.5 w-full overflow-hidden rounded-full">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${task.progress || 0}%`,
                                            backgroundColor: isDone ? '#00c875' : '#579bfc',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Card Footer */}
                            <div className="border-border/50 text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
                                <div className="flex items-center gap-1.5">
                                    {task.assignee ? (
                                        <div className="flex items-center gap-1.5">
                                            <Avatar className="bg-primary/20 text-primary flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-bold">
                                                <AvatarFallback>{task.assignee.name.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-foreground max-w-[80px] truncate text-[11px] font-semibold">
                                                {task.assignee.name}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-[11px]">Unassigned</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 text-[11px]">
                                    {(task.attachments || []).length > 0 && (
                                        <span className="flex items-center gap-0.5">
                                            <Paperclip className="h-3 w-3" /> {(task.attachments || []).length}
                                        </span>
                                    )}
                                    {(task.comments || []).length > 0 && (
                                        <span className="flex items-center gap-0.5">
                                            <MessageCircle className="h-3 w-3" /> {(task.comments || []).length}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {tasks.length === 0 && (
                    <div className="text-muted-foreground col-span-full py-16 text-center text-xs">
                        No cards match the active filters in this gallery.
                    </div>
                )}
            </div>
        </div>
    );
}
