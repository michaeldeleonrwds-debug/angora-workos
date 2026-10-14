import { formatDate, formatTime } from '@/lib/utils';
import { usePage } from '@inertiajs/react';
import { Clock } from 'lucide-react';
import { isUserAssignedToTask, KanbanBoard, Task } from '../types';

interface TimelineGanttViewProps {
    board: KanbanBoard;
    searchTerm: string;
    personFilter: string;
    priorityFilter: string;
    onSelectTask: (task: Task) => void;
}

export default function TimelineGanttView({ board, searchTerm, personFilter, priorityFilter, onSelectTask }: TimelineGanttViewProps) {
    const { auth } = usePage<any>().props;
    const currentUserId = auth?.user?.id;
    const tasks = (board.groups || [])
        .flatMap((g) => g.tasks || [])
        .filter((task) => {
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                if (!task.title.toLowerCase().includes(term)) return false;
            }
            if (personFilter !== 'all' && !isUserAssignedToTask(task, personFilter, currentUserId)) return false;
            if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
            return true;
        });

    return (
        <div className="border-border bg-card space-y-4 rounded-2xl border p-4 shadow-xs">
            <div className="border-border/50 flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                    <Clock className="text-primary h-4 w-4" />
                    <h3 className="text-foreground text-sm font-bold">Timeline & Milestones Schedule</h3>
                </div>
                <span className="text-muted-foreground text-xs">{tasks.length} items scheduled</span>
            </div>

            <div className="space-y-3">
                {tasks.map((task) => {
                    const isDone = !!task.completed_at;
                    return (
                        <div
                            key={task.id}
                            onClick={() => onSelectTask(task)}
                            className="group border-border/60 hover:border-primary/50 bg-background hover:bg-muted/20 flex cursor-pointer flex-col items-start justify-between gap-3 rounded-xl border p-3 transition-all sm:flex-row sm:items-center"
                        >
                            <div className="flex min-w-[240px] items-center gap-2.5">
                                <div
                                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                    style={{
                                        backgroundColor: isDone ? '#00c875' : task.priority === 'Urgent' ? '#e2445c' : '#579bfc',
                                    }}
                                />
                                <div>
                                    <h4 className="text-foreground group-hover:text-primary text-xs font-bold transition-colors">{task.title}</h4>
                                    <span className="text-muted-foreground text-[10px]">
                                        {task.column?.title || 'Active'} • {task.priority} Priority
                                    </span>
                                </div>
                            </div>

                            {/* Timeline Visual Bar */}
                            <div className="flex w-full flex-1 items-center gap-3">
                                <div className="bg-muted/60 relative flex h-6 flex-1 items-center overflow-hidden rounded-lg p-1">
                                    <div
                                        className="flex h-full items-center justify-between rounded-md px-2 text-[10px] font-bold text-white shadow-xs transition-all"
                                        style={{
                                            width: `${Math.max(25, task.progress || 35)}%`,
                                            backgroundColor: isDone ? '#00c875' : '#579bfc',
                                        }}
                                    >
                                        <span className="truncate">{task.progress}%</span>
                                    </div>
                                </div>

                                <div className="text-muted-foreground min-w-[120px] text-right text-[11px] font-semibold">
                                    {task.start_date ? formatDate(task.start_date) : 'Start'} –{' '}
                                    {task.due_date ? `${formatDate(task.due_date)}${task.due_time ? ' · ' + formatTime(task.due_time) : ''}` : 'Due date'}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {tasks.length === 0 && (
                    <div className="text-muted-foreground py-12 text-center text-xs">No items match the active filters on this timeline.</div>
                )}
            </div>
        </div>
    );
}
