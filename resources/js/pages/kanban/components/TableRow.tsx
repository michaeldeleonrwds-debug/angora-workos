import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Check, ChevronDown, ChevronRight, Copy, Edit2, Link2, MessageCircle, MoreHorizontal, Plus, Star, Trash2, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { BoardColumn, BoardGroup, KanbanColumn, Task, User } from '../types';
import ConnectBoardsModal from './ConnectBoardsModal';
import SubitemTable from './SubitemTable';

interface TableRowProps {
    task: Task;
    group: BoardGroup;
    boardColumns: BoardColumn[];
    statusColumns: KanbanColumn[];
    groups: BoardGroup[];
    users: User[];
    mirroredValues?: Record<string, any>;
    onSelectTask: (task: Task) => void;
}

export default function TableRow({
    task,
    group,
    boardColumns = [],
    statusColumns = [],
    groups = [],
    users = [],
    mirroredValues = {},
    onSelectTask,
}: TableRowProps) {
    const [isSubitemsOpen, setIsSubitemsOpen] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleVal, setTitleVal] = useState(task.title);
    const [activeConnectColumn, setActiveConnectColumn] = useState<BoardColumn | null>(null);

    const subitems = task.subitems || [];

    const handleTitleBlur = () => {
        setIsEditingTitle(false);
        if (titleVal.trim() && titleVal !== task.title) {
            router.patch(`/kanban/tasks/${task.id}`, {
                title: titleVal.trim(),
            });
        }
    };

    const handleUpdateStatus = (columnId: number) => {
        router.patch(`/kanban/tasks/${task.id}/column`, {
            column_id: columnId,
        });
    };

    const handleUpdatePriority = (priority: string) => {
        router.patch(`/kanban/tasks/${task.id}`, {
            priority,
        });
    };

    const handleUpdateAssignee = (userId: number | null) => {
        router.patch(`/kanban/tasks/${task.id}`, {
            assigned_to: userId,
        });
    };

    const handleUpdateDate = (date: string) => {
        router.patch(`/kanban/tasks/${task.id}`, {
            due_date: date || null,
        });
    };

    const handleUpdateDueTime = (time: string) => {
        router.patch(`/kanban/tasks/${task.id}`, {
            due_time: time || null,
        });
    };

    const handleUpdateProgress = (val: number) => {
        router.patch(`/kanban/tasks/${task.id}`, {
            progress: Math.min(100, Math.max(0, val)),
        });
    };

    const handleUpdateCustomValue = (key: string, val: any) => {
        router.patch(`/kanban/tasks/${task.id}`, {
            custom_values: { [key]: val },
        });
    };

    const handleMoveGroup = (targetGroupId: number) => {
        router.patch(`/kanban/tasks/${task.id}/group`, {
            group_id: targetGroupId,
        });
    };

    const handleDelete = () => {
        if (confirm('Delete this item?')) {
            router.delete(`/kanban/tasks/${task.id}`);
        }
    };

    // Color definitions
    const getStatusStyle = (title: string = '') => {
        const lower = title.toLowerCase();
        if (lower.includes('done') || lower.includes('complete')) {
            return { bg: '#00c875', label: title || 'Done' };
        }
        if (lower.includes('working') || lower.includes('progress') || lower.includes('in progress')) {
            return { bg: '#fdab3d', label: title || 'Working on it' };
        }
        if (lower.includes('review') || lower.includes('qa') || lower.includes('for review')) {
            return { bg: '#a25ddc', label: title || 'For Review' };
        }
        if (lower.includes('revision') || lower.includes('needs revision')) {
            return { bg: '#ff642e', label: title || 'Needs Revision' };
        }
        if (lower.includes('hold') || lower.includes('on hold')) {
            return { bg: '#e2445c', label: title || 'Hold' };
        }
        if (lower.includes('stuck') || lower.includes('blocked')) {
            return { bg: '#e2445c', label: title || 'Stuck' };
        }
        if (lower.includes('resource')) {
            return { bg: '#579bfc', label: title || 'Resources' };
        }
        if (lower.includes('new') || lower.includes('backlog')) {
            return { bg: '#579bfc', label: title || 'New Task' };
        }
        return { bg: '#94a3b8', label: title || 'Not Started' };
    };

    const getPriorityStyle = (priority: string = 'Medium') => {
        switch (priority) {
            case 'Urgent':
                return { bg: '#e2445c', label: 'Urgent' };
            case 'High':
                return { bg: '#579bfc', label: 'High' };
            case 'Medium':
                return { bg: '#a25ddc', label: 'Medium' };
            case 'Low':
                return { bg: '#64748b', label: 'Low' };
            default:
                return { bg: '#94a3b8', label: priority };
        }
    };

    const statusMeta = getStatusStyle(task.column?.title);
    const priorityMeta = getPriorityStyle(task.priority);

    return (
        <>
            <div className="group border-border/50 hover:bg-muted/30 flex items-center border-b text-xs transition-colors select-none">
                {/* Left group color indicator & Checkbox / Expander */}
                <div className="w-1.5 flex-shrink-0 self-stretch" style={{ backgroundColor: group.color || '#579bfc' }} />

                {/* Subitems Toggle & Row Actions */}
                <div className="flex flex-shrink-0 items-center gap-1 px-2 py-2">
                    <button
                        onClick={() => setIsSubitemsOpen(!isSubitemsOpen)}
                        className={`hover:bg-muted text-muted-foreground rounded p-1 transition-transform ${
                            subitems.length > 0 ? 'visible' : 'invisible group-hover:visible'
                        }`}
                        title="Subitems"
                    >
                        {isSubitemsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>

                    {subitems.length > 0 && (
                        <span className="py-0.2 bg-primary/10 text-primary rounded-full px-1.5 text-[10px] font-bold">{subitems.length}</span>
                    )}
                </div>

                {/* Item Name (Primary Column) */}
                <div className="border-border/40 flex min-w-[200px] flex-1 items-center justify-between border-r px-2 py-2">
                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={titleVal}
                            onChange={(e) => setTitleVal(e.target.value)}
                            onBlur={handleTitleBlur}
                            onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
                            autoFocus
                            className="bg-background border-primary w-full rounded border px-1.5 py-0.5 text-xs font-semibold focus:outline-none"
                        />
                    ) : (
                        <span
                            onClick={() => onSelectTask(task)}
                            className="text-foreground hover:text-primary max-w-sm cursor-pointer truncate font-semibold"
                            title="Click to open item details"
                        >
                            {task.title}
                        </span>
                    )}

                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsEditingTitle(true);
                            }}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1"
                            title="Rename Item"
                        >
                            <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => onSelectTask(task)}
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded p-1"
                            title="Open Updates & Details"
                        >
                            <MessageCircle className="h-3.5 w-3.5" />
                        </button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground rounded p-1">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                <DropdownMenuItem onClick={() => onSelectTask(task)}>
                                    <span>Open Item Card</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsSubitemsOpen(true)}>
                                    <Plus className="mr-2 h-3.5 w-3.5" />
                                    <span>Add Subitem</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <div className="text-muted-foreground px-2 py-1 text-[10px] font-semibold uppercase">Move to Group</div>
                                {groups
                                    .filter((g) => g.id !== group.id)
                                    .map((g) => (
                                        <DropdownMenuItem key={g.id} onClick={() => handleMoveGroup(g.id)}>
                                            <span className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                                            <span>{g.title}</span>
                                        </DropdownMenuItem>
                                    ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDelete} className="text-red-500">
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    <span>Delete Item</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Dynamic Columns Rendering */}
                {boardColumns.map((col) => {
                    if (!col.is_visible) return null;

                    // 1. People / Assignee Column
                    if (col.type === 'people') {
                        const isMainAssigneeCol = col.key === 'person' || col.key === 'assigned_to';
                        const assignedUserId = isMainAssigneeCol ? task.assigned_to : (task.custom_values?.[col.key] as number | null);
                        const assignedUser = isMainAssigneeCol
                            ? task.assignee
                            : users.find((u) => u.id === assignedUserId);

                        const onAssign = (userId: number | null) => {
                            if (isMainAssigneeCol) {
                                handleUpdateAssignee(userId);
                            } else {
                                handleUpdateCustomValue(col.key, userId);
                            }
                        };

                        return (
                            <div
                                key={col.id}
                                style={{ width: col.width || 140 }}
                                className="border-border/40 flex flex-shrink-0 items-center justify-center border-r px-2 py-1.5"
                            >
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="hover:bg-muted/70 flex items-center gap-1.5 rounded-lg p-1 transition-colors">
                                            {assignedUser ? (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
                                                        {assignedUser.name.charAt(0)}
                                                    </div>
                                                    <span className="max-w-[80px] truncate text-xs font-medium">
                                                        {assignedUser.name.split(' ')[0]}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="border-border text-muted-foreground flex h-6 w-6 items-center justify-center rounded-full border border-dashed">
                                                    <UserIcon className="h-3.5 w-3.5" />
                                                </div>
                                            )}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center" className="w-44 rounded-xl">
                                        <DropdownMenuItem onClick={() => onAssign(null)}>
                                            <span className="text-muted-foreground">Unassigned</span>
                                        </DropdownMenuItem>
                                        {users.map((u) => (
                                            <DropdownMenuItem key={u.id} onClick={() => onAssign(u.id)}>
                                                <span>{u.name}</span>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        );
                    }

                    // 2. Status Column (Dynamic board-configured colored cell)
                    if (col.type === 'status') {
                        const statusOptions = (col.config?.status_options as string[]) || [];
                        const currentStatusTitle = task.column?.title || 'Not Started';

                        return (
                            <div
                                key={col.id}
                                style={{ width: col.width || 150 }}
                                className="border-border/40 flex flex-shrink-0 items-center justify-center border-r px-1.5 py-1"
                            >
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="h-8 w-full truncate rounded px-2 text-center text-xs font-bold text-white shadow-2xs transition-all hover:brightness-105"
                                            style={{ backgroundColor: statusMeta.bg }}
                                        >
                                            {statusMeta.label}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center" className="w-44 space-y-1 rounded-xl p-1.5">
                                        {statusColumns.map((sc) => {
                                            const meta = getStatusStyle(sc.title);
                                            return (
                                                <button
                                                    key={sc.id}
                                                    type="button"
                                                    onClick={() => handleUpdateStatus(sc.id)}
                                                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                                                    style={{ backgroundColor: sc.color || meta.bg }}
                                                >
                                                    <span className="truncate">{sc.title}</span>
                                                    {sc.id === task.column_id && <Check className="h-3 w-3 shrink-0" />}
                                                </button>
                                            );
                                        })}
                                        {/* Board-configured custom status labels if defined on column */}
                                        {statusOptions.length > 0 && statusColumns.length === 0 && (
                                            statusOptions.map((opt) => {
                                                const meta = getStatusStyle(opt);
                                                return (
                                                    <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => handleUpdateCustomValue(col.key, opt)}
                                                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                                                        style={{ backgroundColor: meta.bg }}
                                                    >
                                                        <span className="truncate">{opt}</span>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        );
                    }

                    // 3. Priority Column
                    if (col.type === 'priority') {
                        return (
                            <div
                                key={col.id}
                                style={{ width: col.width || 130 }}
                                className="border-border/40 flex flex-shrink-0 items-center justify-center border-r px-1.5 py-1"
                            >
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="h-8 w-full truncate rounded px-2 text-center text-xs font-bold text-white shadow-2xs transition-all hover:brightness-105"
                                            style={{ backgroundColor: priorityMeta.bg }}
                                        >
                                            {priorityMeta.label}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center" className="w-36 space-y-1 rounded-xl p-1.5">
                                        {['Urgent', 'High', 'Medium', 'Low'].map((pr) => {
                                            const meta = getPriorityStyle(pr);
                                            return (
                                                <button
                                                    key={pr}
                                                    type="button"
                                                    onClick={() => handleUpdatePriority(pr)}
                                                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                                                    style={{ backgroundColor: meta.bg }}
                                                >
                                                    <span>{pr}</span>
                                                    {pr === task.priority && <Check className="h-3 w-3 shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        );
                    }

                    // 4. Date Column
                    if (col.type === 'date') {
                        const isMainDueDateCol = col.key === 'due_date' || col.key === 'deadline';
                        const dateVal = isMainDueDateCol ? (task.due_date || '') : ((task.custom_values?.[col.key] as string) || '');
                        const isOverdue = isMainDueDateCol && task.deadline_status === 'overdue';
                        const isDueToday = isMainDueDateCol && task.deadline_status === 'due_today';

                        const onDateChange = (val: string) => {
                            if (isMainDueDateCol) {
                                handleUpdateDate(val);
                            } else {
                                handleUpdateCustomValue(col.key, val || null);
                            }
                        };

                        return (
                            <div
                                key={col.id}
                                style={{ width: col.width || 150 }}
                                className={`border-border/40 text-foreground flex flex-shrink-0 items-center justify-center gap-1 border-r px-2 py-1.5 font-medium ${
                                    isOverdue ? 'bg-red-500/10' : isDueToday ? 'bg-amber-500/10' : ''
                                }`}
                            >
                                <input
                                    type="date"
                                    value={dateVal}
                                    onChange={(e) => onDateChange(e.target.value)}
                                    className={`cursor-pointer border-none bg-transparent text-center text-xs focus:outline-none ${
                                        isOverdue ? 'font-bold text-red-600' : isDueToday ? 'font-bold text-amber-600' : ''
                                    }`}
                                />
                                {isMainDueDateCol && task.due_time && (
                                    <span className="text-muted-foreground text-[10px] font-medium">
                                        {task.due_time}
                                    </span>
                                )}
                                {isMainDueDateCol && task.is_milestone && (
                                    <span title="Milestone">
                                        <Star className="h-3 w-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                                    </span>
                                )}
                            </div>
                        );
                    }

                    // 5. Timeline Column
                    if (col.type === 'timeline') {
                        return (
                            <div
                                key={col.id}
                                style={{ width: col.width || 180 }}
                                className="border-border/40 flex flex-shrink-0 items-center justify-center border-r px-2 py-1.5"
                            >
                                <div
                                    onClick={() => onSelectTask(task)}
                                    className="flex h-6 w-full cursor-pointer items-center justify-center gap-1 rounded-full px-2.5 text-[10px] font-bold text-white shadow-2xs hover:brightness-105"
                                    style={{ backgroundColor: statusMeta.bg }}
                                    title="Click to edit schedule in Item Details"
                                >
                                    <span>
                                        {task.start_date ? formatDate(task.start_date) : 'Start'}
                                        {task.start_time ? ` ${task.start_time}` : ''} –{' '}
                                        {task.due_date ? formatDate(task.due_date) : 'End'}
                                        {task.due_time ? ` ${task.due_time}` : ''}
                                    </span>
                                </div>
                            </div>
                        );
                    }

                    // 6. Progress Column
                    if (col.type === 'progress') {
                        const prog = task.progress || 0;
                        return (
                            <div
                                key={col.id}
                                style={{ width: col.width || 150 }}
                                className="border-border/40 flex flex-shrink-0 items-center gap-2 border-r px-3 py-1.5"
                            >
                                <div className="bg-muted h-3 flex-1 overflow-hidden rounded-full">
                                    <div
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{
                                            width: `${prog}%`,
                                            backgroundColor: prog === 100 ? '#00c875' : '#579bfc',
                                        }}
                                    />
                                </div>
                                <span className="text-muted-foreground w-8 text-right text-[11px] font-bold">{prog}%</span>
                            </div>
                        );
                    }

                    // 7. Checkbox Column
                    if (col.type === 'checkbox') {
                        const isChecked = Boolean(task.custom_values?.[col.key]);
                        return (
                            <div
                                key={col.id}
                                style={{ width: col.width || 100 }}
                                className="border-border/40 flex flex-shrink-0 items-center justify-center border-r px-2 py-1.5"
                            >
                                <button
                                    type="button"
                                    onClick={() => handleUpdateCustomValue(col.key, !isChecked)}
                                    className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                                        isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-card hover:bg-muted'
                                    }`}
                                >
                                    {isChecked && <Check className="h-3 w-3" />}
                                </button>
                            </div>
                        );
                    }

                    // 8. Dropdown Column
                    if (col.type === 'dropdown') {
                        const currentVal = task.custom_values?.[col.key] || 'Select';
                        const options = (col.config?.options as string[]) || ['Option A', 'Option B', 'Option C'];
                        return (
                            <div
                                key={col.id}
                                style={{ width: col.width || 140 }}
                                className="border-border/40 flex flex-shrink-0 items-center justify-center border-r px-2 py-1.5"
                            >
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="bg-muted/30 hover:bg-muted/60 text-foreground w-full truncate rounded px-2 py-1 text-center text-xs font-semibold">
                                            {currentVal}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center" className="w-36 rounded-xl">
                                        {options.map((opt) => (
                                            <DropdownMenuItem key={opt} onClick={() => handleUpdateCustomValue(col.key, opt)} className="text-xs">
                                                <span>{opt}</span>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        );
                    }

                    // 9. Tags Column
                    if (col.type === 'tags') {
                        const currentTag = task.custom_values?.[col.key] || '';
                        const options = (col.config?.options as string[]) || ['Design', 'Core', 'Security', 'QA'];
                        return (
                            <div
                                key={col.id}
                                style={{ width: col.width || 140 }}
                                className="border-border/40 flex flex-shrink-0 items-center justify-center border-r px-2 py-1.5"
                            >
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="bg-primary/10 text-primary hover:bg-primary/20 max-w-[120px] truncate rounded-full px-2 py-0.5 text-[10px] font-bold">
                                            {currentTag || '+ Tag'}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center" className="w-36 rounded-xl">
                                        {options.map((opt) => (
                                            <DropdownMenuItem key={opt} onClick={() => handleUpdateCustomValue(col.key, opt)} className="text-xs">
                                                <span>{opt}</span>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        );
                    }

                    // 10. Rating Column (5 interactive stars)
                    if (col.type === 'rating') {
                        const ratingVal = Number(task.custom_values?.[col.key]) || 0;
                        return (
                            <div
                                key={col.id}
                                style={{ width: col.width || 140 }}
                                className="border-border/40 flex flex-shrink-0 items-center justify-center gap-1 border-r px-2 py-1.5"
                            >
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleUpdateCustomValue(col.key, ratingVal === star ? 0 : star)}
                                        className="text-muted-foreground transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className={`h-3.5 w-3.5 ${
                                                star <= ratingVal ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        );
                    }

                    // 11. Number Column
                    if (col.type === 'number') {
                        const numVal = task.custom_values?.[col.key] ?? '';
                        return (
                            <div
                                key={col.id}
                                style={{ width: col.width || 130 }}
                                className="border-border/40 flex flex-shrink-0 items-center justify-center border-r px-2 py-1.5 font-mono text-xs"
                            >
                                <input
                                    type="number"
                                    defaultValue={numVal}
                                    onBlur={(e) => handleUpdateCustomValue(col.key, e.target.value)}
                                    placeholder="0"
                                    className="focus:bg-muted/40 w-full rounded border-none bg-transparent px-1 py-0.5 text-center focus:outline-none"
                                />
                            </div>
                        );
                    }

                    // 12. Connect Boards Column
                    if (col.type === 'connect_boards') {
                        const connections = (task.outgoingRelationships || []).filter((r) => !r.column_key || r.column_key === col.key);
                        return (
                            <div
                                key={col.id}
                                style={{ width: col.width || 170 }}
                                className="border-border/40 flex flex-shrink-0 items-center justify-between border-r px-2 py-1.5"
                            >
                                <div className="mr-1 flex flex-1 items-center gap-1 overflow-x-auto">
                                    {connections.length === 0 ? (
                                        <span className="text-muted-foreground/60 text-[11px] italic">No links</span>
                                    ) : (
                                        connections.map((rel) => (
                                            <span
                                                key={rel.id}
                                                className="bg-primary/10 text-primary inline-flex max-w-[120px] items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                                title={`${rel.target_task?.title} (${rel.target_board?.title || 'Board'})`}
                                            >
                                                <Link2 className="h-2.5 w-2.5 shrink-0" />
                                                <span className="truncate">{rel.target_task?.title || `#${rel.target_task_id}`}</span>
                                            </span>
                                        ))
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveConnectColumn(col)}
                                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0 rounded p-1 transition"
                                    title="Connect items"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    }

                    // 13. Mirror Column (Synchronized read-only reflection)
                    if (col.type === 'mirror') {
                        const mirroredVal = mirroredValues[col.key];
                        return (
                            <div
                                key={col.id}
                                style={{ width: col.width || 150 }}
                                className="border-border/40 flex flex-shrink-0 items-center justify-center border-r bg-purple-500/[0.02] px-2 py-1.5"
                            >
                                {mirroredVal !== undefined && mirroredVal !== null ? (
                                    <span className="inline-flex max-w-full items-center gap-1 truncate rounded bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                                        <Copy className="h-2.5 w-2.5 shrink-0" />
                                        <span className="truncate">{String(mirroredVal)}</span>
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground/50 text-[11px]">-</span>
                                )}
                            </div>
                        );
                    }

                    // 14. Long Text Column
                    if (col.type === 'long_text') {
                        const longVal = task.custom_values?.[col.key] ?? '';
                        return (
                            <div
                                key={col.id}
                                style={{ width: col.width || 180 }}
                                className="border-border/40 flex flex-shrink-0 items-center justify-center border-r px-2 py-1.5"
                            >
                                <textarea
                                    defaultValue={longVal}
                                    onBlur={(e) => handleUpdateCustomValue(col.key, e.target.value)}
                                    placeholder="Add notes..."
                                    rows={1}
                                    className="focus:bg-muted/40 w-full resize-none rounded border-none bg-transparent px-1 py-0.5 text-xs focus:outline-none"
                                />
                            </div>
                        );
                    }

                    // 15. Text Column (Default)
                    const textVal = task.custom_values?.[col.key] ?? '';
                    return (
                        <div
                            key={col.id}
                            style={{ width: col.width || 140 }}
                            className="border-border/40 flex flex-shrink-0 items-center justify-center border-r px-2 py-1.5"
                        >
                            <input
                                type="text"
                                defaultValue={textVal}
                                onBlur={(e) => handleUpdateCustomValue(col.key, e.target.value)}
                                placeholder="-"
                                className="focus:bg-muted/40 w-full rounded border-none bg-transparent px-1 py-0.5 text-center text-xs focus:outline-none"
                            />
                        </div>
                    );
                })}
            </div>

            {/* Connect Boards Modal */}
            {activeConnectColumn && (
                <ConnectBoardsModal task={task} column={activeConnectColumn} isOpen={true} onClose={() => setActiveConnectColumn(null)} />
            )}

            {/* Subitems Indented Section */}
            {isSubitemsOpen && <SubitemTable parentTask={task} subitems={subitems} columns={statusColumns} users={users} />}
        </>
    );
}
