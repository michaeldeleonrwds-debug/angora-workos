import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDate, formatTime } from '@/lib/utils';
import { router, usePage } from '@inertiajs/react';
import { Check, ChevronDown, ChevronRight, Copy, Edit2, Link2, MessageCircle, MoreHorizontal, Plus, Repeat, ShieldAlert, Star, Trash2, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { BoardColumn, BoardGroup, BoardPermissions, DEFAULT_TASK_TYPES, KanbanColumn, Task, User } from '../types';
import ConnectBoardsModal from './ConnectBoardsModal';
import DatePickerCell from './DatePickerCell';
import EditableDropdownCell from './EditableDropdownCell';
import MultiPeoplePicker from './MultiPeoplePicker';
import SubitemTable from './SubitemTable';
import ImageCell from './ImageCell';

interface TableRowProps {
    task: Task;
    group: BoardGroup;
    boardColumns: BoardColumn[];
    subitemColumns?: BoardColumn[];
    statusColumns: KanbanColumn[];
    groups: BoardGroup[];
    users: User[];
    mirroredValues?: Record<string, any>;
    gridTemplateColumns?: string;
    permissions?: BoardPermissions;
    onSelectTask: (task: Task) => void;
    onAddSubtaskColumn?: () => void;
}

export default function TableRow({
    task,
    group,
    boardColumns = [],
    subitemColumns = [],
    statusColumns = [],
    groups = [],
    users = [],
    mirroredValues = {},
    gridTemplateColumns,
    permissions,
    onSelectTask,
    onAddSubtaskColumn,
}: TableRowProps) {
    const { auth } = usePage().props as any;
    const currentUserId = auth?.user?.id;
    const isAssigned = Boolean(
        currentUserId && (
            task.assigned_to === currentUserId ||
            (Array.isArray(task.custom_values?.designer_ids) && task.custom_values.designer_ids.map(Number).includes(currentUserId)) ||
            (Array.isArray(task.custom_values?.person) && task.custom_values.person.map(Number).includes(currentUserId))
        )
    );

    const canEditTask = permissions?.canEditTask ?? true;
    const canChangeStatus = permissions?.canChangeStatus ?? true;
    const canChangePriority = permissions?.canChangePriority ?? true;
    const canAssignUsers = permissions?.canAssignUsers ?? true;
    const canChangeDeadlines = permissions?.canChangeDeadlines ?? true;
    const canDeleteTask = permissions?.canDeleteTask ?? true;
    const canManageGroups = permissions?.canManageGroups ?? true;
    const canManageSubtasks = canEditTask || isAssigned;

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
            <div
                className="group border-border/40 hover:bg-muted/30 grid w-full items-stretch border-b text-xs transition-colors select-none"
                style={{ gridTemplateColumns }}
            >
                {/* Left group color indicator (Track 0) */}
                <div className="h-full" style={{ backgroundColor: group.color || '#579bfc' }} />

                {/* Subitems Toggle & Row Actions (Track 1 - 44px fixed) */}
                <div className="border-border/40 border-r flex items-center justify-center gap-0.5 px-1 py-1.5 min-w-0 overflow-hidden">
                    <button
                        onClick={() => setIsSubitemsOpen(!isSubitemsOpen)}
                        className={`hover:bg-muted text-muted-foreground rounded p-0.5 transition-transform ${
                            subitems.length > 0 ? 'visible' : 'invisible group-hover:visible'
                        }`}
                        title="Subtasks"
                    >
                        {isSubitemsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>

                    {subitems.length > 0 && (
                        <span className="bg-primary/10 text-primary rounded-full px-1 py-0.2 text-[9px] font-bold">{subitems.length}</span>
                    )}
                </div>

                {/* Item Name (Track 2 - minmax(280px, 1fr)) */}
                <div className="border-border/40 border-r px-3 py-1.5 flex items-center justify-between min-w-0 h-full">
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
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                            {task.is_blocked && (
                                <span
                                    title="Blocked by unfinished predecessor"
                                    className="inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                >
                                    <ShieldAlert className="h-2.5 w-2.5" />
                                    Blocked
                                </span>
                            )}
                            {(task.recurrence_rule || task.recurrenceRule || task.recurrence_rule_id) && (
                                <span
                                    title="Recurring task schedule active"
                                    className="inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25"
                                >
                                    <Repeat className="h-2.5 w-2.5" />
                                    Repeats
                                </span>
                            )}
                            <span
                                onClick={() => onSelectTask(task)}
                                className="text-foreground hover:text-primary max-w-sm cursor-pointer truncate font-semibold"
                                title="Click to open item details"
                            >
                                {task.title}
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {canEditTask && (
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
                        )}
                        <button
                            onClick={() => onSelectTask(task)}
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded p-1"
                            title="Open Updates & Details"
                        >
                            <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Dynamic Columns Rendering */}
                {boardColumns.map((col) => {
                    if (!col.is_visible) return null;

                    // 1. People / Assignee Column (Multi-person support for Designer, AM, etc.)
                    if (col.type === 'people') {
                        const isMainAssigneeCol = col.key === 'person' || col.key === 'assigned_to';
                        let currentIds: number[] = [];
                        const customVal = task.custom_values?.[col.key];

                        if (Array.isArray(customVal)) {
                            currentIds = customVal.map(Number).filter(Boolean);
                        } else if (typeof customVal === 'number' && customVal > 0) {
                            currentIds = [customVal];
                        } else if (isMainAssigneeCol) {
                            if (Array.isArray(task.custom_values?.['designer_ids'])) {
                                currentIds = task.custom_values['designer_ids'].map(Number).filter(Boolean);
                            } else if (task.assigned_to) {
                                currentIds = [task.assigned_to];
                            }
                        }

                        const handlePeopleChange = (newIds: number[]) => {
                            if (isMainAssigneeCol) {
                                router.patch(`/kanban/tasks/${task.id}`, {
                                    assigned_to: newIds[0] ?? null,
                                    custom_values: {
                                        [col.key]: newIds,
                                        designer_ids: newIds,
                                    },
                                });
                            } else {
                                handleUpdateCustomValue(col.key, newIds);
                            }
                        };

                        return (
                            <div
                                key={col.id}
                                className="border-border/40 border-r px-1.5 py-1 flex items-center justify-center min-w-0 h-full overflow-hidden"
                            >
                                <MultiPeoplePicker
                                    selectedUserIds={currentIds}
                                    users={users}
                                    onChange={handlePeopleChange}
                                    placeholder="Assign..."
                                    align="center"
                                    disabled={!canAssignUsers}
                                />
                            </div>
                        );
                    }

                    // 2. Status Column (Dynamic board-configured colored cell)
                    if (col.type === 'status') {
                        const statusOptions = (col.config?.status_options as string[]) || [];

                        return (
                            <div
                                key={col.id}
                                className="border-border/40 border-r px-1.5 py-1 flex items-center justify-center min-w-0 h-full overflow-hidden"
                            >
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild disabled={!canChangeStatus}>
                                        <button
                                            disabled={!canChangeStatus}
                                            className={`h-7 w-full truncate rounded px-2 text-center text-xs font-bold text-white shadow-2xs transition-all ${
                                                canChangeStatus ? 'hover:brightness-105 cursor-pointer' : 'cursor-default opacity-90'
                                            }`}
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
                                className="border-border/40 border-r px-1.5 py-1 flex items-center justify-center min-w-0 h-full overflow-hidden"
                            >
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild disabled={!canChangePriority}>
                                        <button
                                            disabled={!canChangePriority}
                                            className={`h-7 w-full truncate rounded px-2 text-center text-xs font-bold text-white shadow-2xs transition-all ${
                                                canChangePriority ? 'hover:brightness-105 cursor-pointer' : 'cursor-default opacity-90'
                                            }`}
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
                        let dateVal: string | null = null;
                        let timeVal: string | null = null;

                        if (isMainDueDateCol) {
                            dateVal = task.due_date || null;
                            timeVal = task.due_time || null;
                        } else {
                            const raw = task.custom_values?.[col.key];
                            if (typeof raw === 'object' && raw !== null) {
                                dateVal = raw.date || null;
                                timeVal = raw.time || null;
                            } else if (typeof raw === 'string') {
                                if (raw.includes(' ') || raw.includes('T')) {
                                    const parts = raw.replace('T', ' ').split(' ');
                                    dateVal = parts[0] || null;
                                    timeVal = parts[1]?.slice(0, 5) || null;
                                } else {
                                    dateVal = raw || null;
                                }
                            }
                        }

                        const isOverdue = isMainDueDateCol && task.deadline_status === 'overdue';
                        const isDueToday = isMainDueDateCol && task.deadline_status === 'due_today';

                        const onDateTimeChange = (newDate: string | null, newTime: string | null) => {
                            if (isMainDueDateCol) {
                                router.patch(
                                    `/kanban/tasks/${task.id}`,
                                    {
                                        due_date: newDate,
                                        due_time: newTime,
                                    },
                                    { preserveScroll: true },
                                );
                            } else {
                                const valToSave = newDate && newTime ? { date: newDate, time: newTime } : newDate;
                                handleUpdateCustomValue(col.key, valToSave);
                            }
                        };

                        return (
                            <div
                                key={col.id}
                                className={`border-border/40 text-foreground border-r px-1 py-1 flex items-center justify-center min-w-0 h-full overflow-hidden ${
                                    isOverdue ? 'bg-red-500/10' : isDueToday ? 'bg-amber-500/10' : ''
                                }`}
                            >
                                <div className="flex items-center w-full min-w-0">
                                    <div className="flex-1 min-w-0">
                                        <DatePickerCell
                                            date={dateVal}
                                            time={timeVal}
                                            onChange={onDateTimeChange}
                                            isOverdue={isOverdue}
                                            isDueToday={isDueToday}
                                            placeholder="Set date"
                                            dateOnly={Boolean(col.config?.date_only)}
                                            disabled={!canChangeDeadlines}
                                        />
                                    </div>
                                    {isMainDueDateCol && task.is_milestone && (
                                        <span title="Milestone" className="mr-1.5 shrink-0">
                                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    // 5. Timeline Column
                    if (col.type === 'timeline') {
                        return (
                            <div
                                key={col.id}
                                className="border-border/40 border-r px-1.5 py-1 flex items-center justify-center min-w-0 h-full overflow-hidden"
                            >
                                <div
                                    onClick={() => onSelectTask(task)}
                                    className="flex h-6 w-full cursor-pointer items-center justify-center gap-1 rounded-full px-2 text-[10px] font-bold text-white shadow-2xs hover:brightness-105"
                                    style={{ backgroundColor: statusMeta.bg }}
                                    title="Click to edit schedule in Item Details"
                                >
                                    <span className="truncate">
                                        {task.start_date ? formatDate(task.start_date) : 'Start'}
                                        {task.start_time ? ` ${formatTime(task.start_time)}` : ''} –{' '}
                                        {task.due_date ? formatDate(task.due_date) : 'End'}
                                        {task.due_time ? ` ${formatTime(task.due_time)}` : ''}
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
                                className="border-border/40 border-r px-2 py-1 flex items-center gap-1.5 min-w-0 h-full overflow-hidden"
                            >
                                <div className="bg-muted h-2.5 flex-1 overflow-hidden rounded-full">
                                    <div
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{
                                            width: `${prog}%`,
                                            backgroundColor: prog === 100 ? '#00c875' : '#579bfc',
                                        }}
                                    />
                                </div>
                                <span className="text-muted-foreground w-7 text-right text-[10px] font-bold">{prog}%</span>
                            </div>
                        );
                    }

                    // 7. Checkbox Column
                    if (col.type === 'checkbox') {
                        const isChecked = Boolean(task.custom_values?.[col.key]);
                        return (
                            <div
                                key={col.id}
                                className="border-border/40 border-r px-1.5 py-1 flex items-center justify-center min-w-0 h-full overflow-hidden"
                            >
                                <button
                                    type="button"
                                    disabled={!canEditTask}
                                    onClick={() => canEditTask && handleUpdateCustomValue(col.key, !isChecked)}
                                    className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                                        !canEditTask ? 'cursor-default opacity-75' : ''
                                    } ${
                                        isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-card hover:bg-muted'
                                    }`}
                                >
                                    {isChecked && <Check className="h-3 w-3" />}
                                </button>
                            </div>
                        );
                    }

                    // 8. Dropdown Column (e.g. Service Type / Task Type — Editable with 8 standard types + custom types)
                    if (col.type === 'dropdown') {
                        const currentVal = (task.custom_values?.[col.key] as string) || '';
                        const configOptions = (col.config?.options as string[]) || [];
                        const allOptions = Array.from(new Set([...DEFAULT_TASK_TYPES, ...configOptions]));
                        return (
                            <div
                                key={col.id}
                                className="border-border/40 border-r px-1.5 py-1 flex items-center justify-center min-w-0 h-full overflow-hidden"
                            >
                                <EditableDropdownCell
                                    value={currentVal}
                                    options={allOptions}
                                    onSelect={(opt) => handleUpdateCustomValue(col.key, opt)}
                                    placeholder="Select"
                                    disabled={!canEditTask}
                                />
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
                                className="border-border/40 border-r px-1.5 py-1 flex items-center justify-center min-w-0 h-full overflow-hidden"
                            >
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild disabled={!canEditTask}>
                                        <button
                                            disabled={!canEditTask}
                                            className={`max-w-[120px] truncate rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                !canEditTask ? 'bg-muted text-muted-foreground cursor-default' : 'bg-primary/10 text-primary hover:bg-primary/20'
                                            }`}
                                        >
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
                                className="border-border/40 border-r px-1.5 py-1 flex items-center justify-center gap-1 min-w-0 h-full overflow-hidden"
                            >
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        disabled={!canEditTask}
                                        onClick={() => canEditTask && handleUpdateCustomValue(col.key, ratingVal === star ? 0 : star)}
                                        className={`transition-transform ${!canEditTask ? 'cursor-default' : 'text-muted-foreground hover:scale-110'}`}
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
                                className="border-border/40 border-r px-1.5 py-1 flex items-center justify-center min-w-0 h-full overflow-hidden font-mono text-xs"
                            >
                                <input
                                    type="number"
                                    defaultValue={numVal}
                                    readOnly={!canEditTask}
                                    onBlur={(e) => canEditTask && handleUpdateCustomValue(col.key, e.target.value)}
                                    placeholder="0"
                                    className={`w-full rounded border-none bg-transparent px-1 py-0.5 text-center text-xs focus:outline-none ${
                                        !canEditTask ? 'cursor-default' : 'focus:bg-muted/40'
                                    }`}
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
                                className="border-border/40 border-r px-1.5 py-1 flex items-center justify-between min-w-0 h-full overflow-hidden"
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
                                {canEditTask && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveConnectColumn(col)}
                                        className="text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0 rounded p-1 transition"
                                        title="Connect items"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        );
                    }

                    // 13. Mirror Column (Synchronized read-only reflection)
                    if (col.type === 'mirror') {
                        const mirroredVal = mirroredValues[col.key];
                        return (
                            <div
                                key={col.id}
                                className="border-border/40 border-r bg-purple-500/[0.02] px-1.5 py-1 flex items-center justify-center min-w-0 h-full overflow-hidden"
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
                                className="border-border/40 border-r px-1.5 py-1 flex items-center justify-center min-w-0 h-full overflow-hidden"
                            >
                                <textarea
                                    defaultValue={longVal}
                                    readOnly={!canEditTask}
                                    onBlur={(e) => canEditTask && handleUpdateCustomValue(col.key, e.target.value)}
                                    placeholder={canEditTask ? 'Add notes...' : '-'}
                                    rows={1}
                                    className={`w-full resize-none rounded border-none bg-transparent px-1 py-0.5 text-xs focus:outline-none ${
                                        !canEditTask ? 'cursor-default' : 'focus:bg-muted/40'
                                    }`}
                                />
                            </div>
                        );
                    }

                    // Image Column
                    if (col.type === 'image') {
                        return (
                            <div
                                key={col.id}
                                className="border-border/40 border-r px-1 py-1 flex items-center justify-center min-w-0 h-full overflow-hidden"
                            >
                                <ImageCell task={task} column={col} />
                            </div>
                        );
                    }

                    // 15. Text Column (Default)
                    const textVal = task.custom_values?.[col.key] ?? '';
                    return (
                        <div
                            key={col.id}
                            className="border-border/40 border-r px-1.5 py-1 flex items-center justify-center min-w-0 h-full overflow-hidden"
                        >
                            <input
                                type="text"
                                defaultValue={textVal}
                                readOnly={!canEditTask}
                                onBlur={(e) => canEditTask && handleUpdateCustomValue(col.key, e.target.value)}
                                placeholder="-"
                                className={`w-full rounded border-none bg-transparent px-1 py-0.5 text-center text-xs focus:outline-none ${
                                    !canEditTask ? 'cursor-default' : 'focus:bg-muted/40'
                                }`}
                            />
                        </div>
                    );
                })}

                {/* End Row Actions (Track N+1 - 40px fixed) */}
                <div className="flex items-center justify-center h-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <DropdownMenuItem onClick={() => onSelectTask(task)}>
                                <span>Open Item Card</span>
                            </DropdownMenuItem>
                            {canManageSubtasks && (
                                <DropdownMenuItem onClick={() => setIsSubitemsOpen(true)}>
                                    <Plus className="mr-2 h-3.5 w-3.5" />
                                    <span>Add Subtask</span>
                                </DropdownMenuItem>
                            )}
                            {canManageGroups && (
                                <>
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
                                </>
                            )}
                            {canDeleteTask && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDelete} className="text-red-500">
                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                        <span>Delete Item</span>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Connect Boards Modal */}
            {activeConnectColumn && (
                <ConnectBoardsModal task={task} column={activeConnectColumn} isOpen={true} onClose={() => setActiveConnectColumn(null)} />
            )}

            {/* Subitems Nested Section */}
            {isSubitemsOpen && (
                <SubitemTable
                    parentTask={task}
                    subitems={subitems}
                    columns={statusColumns}
                    subitemColumns={subitemColumns}
                    users={users}
                    groupColor={group.color}
                    onSelectTask={onSelectTask}
                    onAddSubtaskColumn={onAddSubtaskColumn}
                />
            )}
        </>
    );
}
