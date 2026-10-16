import React, { useMemo, useState } from 'react';
import {
    Activity,
    AlertCircle,
    Briefcase,
    Calendar,
    Check,
    CheckCircle2,
    ChevronDown,
    Clock,
    CornerDownRight,
    FileText,
    Layers,
    ShieldAlert,
    ShieldCheck,
    Star,
    User as UserIcon,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate, formatTime } from '@/lib/utils';
import { usePage } from '@inertiajs/react';
import { BoardColumn, BoardPermissions, getTaskAssignedUsers, KanbanBoard, KanbanColumn, Task, User } from '../types';

interface EmployeeTaskPanelProps {
    task: Task;
    board: KanbanBoard;
    users: User[];
    permissions?: BoardPermissions;
    isAssigned: boolean;
    canChangeStatus: boolean;
    canManageSubtasks: boolean;
    exactRemaining: {
        hours: number;
        formattedRemaining: string;
        isOverdue: boolean;
    } | null;
    dependencySummary: {
        is_blocked: boolean;
        blocked_by: any[];
        blocks: any[];
        related: any[];
    };
    onUpdateField: (field: string, val: any) => void;
    onToggleSubtask: (sub: Task, e: React.MouseEvent) => void;
    onAddSubtask: (title: string) => void;
    onSelectTask?: (task: Task) => void;
    onJumpToTab?: (tab: 'updates' | 'files' | 'activity' | 'reviews' | 'dependencies') => void;
}

export default function EmployeeTaskPanel({
    task,
    board,
    users = [],
    permissions,
    isAssigned,
    canChangeStatus,
    canManageSubtasks,
    exactRemaining,
    dependencySummary,
    onUpdateField,
    onToggleSubtask,
    onAddSubtask,
    onSelectTask,
    onJumpToTab,
}: EmployeeTaskPanelProps) {
    const [isDescExpanded, setIsDescExpanded] = useState(false);
    const [subtaskTitle, setSubtaskTitle] = useState('');

    const boardColumns = board.board_columns || [];
    const statusColumns = board.columns || [];
    const subitems = task.subitems || [];

    // Client Deadline is management-only (mirrors the server-side
    // KanbanTask::CLIENT_DEADLINE_ROLES gate): hide the whole field from
    // Employee, Designer and Developer instead of rendering an empty value.
    const { auth } = usePage().props as any;
    const viewerRole = auth?.user?.role;
    const canViewClientDeadline = ['super_admin', 'admin', 'project_manager', 'account_manager'].includes(viewerRole);

    // Helper to resolve user list from IDs
    const resolveUserIds = (raw: any): number[] => {
        if (!raw) return [];
        if (Array.isArray(raw)) {
            return raw.map(Number).filter((id) => !isNaN(id) && id > 0);
        }
        const num = Number(raw);
        return !isNaN(num) && num > 0 ? [num] : [];
    };

    const resolveUsersList = (ids: number[]): User[] => {
        const uniqueIds = Array.from(new Set(ids));
        return uniqueIds
            .map((id) => users.find((u) => u.id === id))
            .filter((u): u is User => Boolean(u));
    };

    // 1. Resolve Project Manager(s)
    const projectManagerUsers = useMemo(() => {
        let ids: number[] = [];
        if (task.custom_values?.['project_manager']) {
            ids = resolveUserIds(task.custom_values['project_manager']);
        } else if (task.custom_values?.['pm']) {
            ids = resolveUserIds(task.custom_values['pm']);
        } else if (task.custom_values?.['pm_id']) {
            ids = resolveUserIds(task.custom_values['pm_id']);
        } else if (task.custom_values?.['project_manager_id']) {
            ids = resolveUserIds(task.custom_values['project_manager_id']);
        }

        // Also check if any board column specifies PM
        if (ids.length === 0 && boardColumns.length > 0) {
            const pmCol = boardColumns.find(
                (c) =>
                    c.type === 'people' &&
                    (c.key === 'pm' ||
                        c.key.includes('project_manager') ||
                        c.title.toLowerCase() === 'pm' ||
                        c.title.toLowerCase().includes('project manager')),
            );
            if (pmCol && task.custom_values?.[pmCol.key]) {
                ids = resolveUserIds(task.custom_values[pmCol.key]);
            }
        }

        return resolveUsersList(ids);
    }, [task.custom_values, users, boardColumns]);

    // 2. Resolve Account Manager(s)
    const accountManagerUsers = useMemo(() => {
        let ids: number[] = [];
        if (task.custom_values?.['account_manager']) {
            ids = resolveUserIds(task.custom_values['account_manager']);
        } else if (task.custom_values?.['am']) {
            ids = resolveUserIds(task.custom_values['am']);
        } else if (task.custom_values?.['account_manager_id']) {
            ids = resolveUserIds(task.custom_values['account_manager_id']);
        } else if (task.custom_values?.['am_id']) {
            ids = resolveUserIds(task.custom_values['am_id']);
        }

        if (ids.length === 0 && boardColumns.length > 0) {
            const amCol = boardColumns.find(
                (c) =>
                    c.type === 'people' &&
                    (c.key === 'am' ||
                        c.key.includes('account_manager') ||
                        c.title.toLowerCase() === 'am' ||
                        c.title.toLowerCase().includes('account manager')),
            );
            if (amCol && task.custom_values?.[amCol.key]) {
                ids = resolveUserIds(task.custom_values[amCol.key]);
            }
        }

        return resolveUsersList(ids);
    }, [task.custom_values, users, boardColumns]);

    // 3. Resolve Assigned Designers
    const designerUsers = useMemo(() => {
        let ids: number[] = [];
        if (Array.isArray(task.custom_values?.['designer_ids'])) {
            ids = resolveUserIds(task.custom_values['designer_ids']);
        } else if (Array.isArray(task.custom_values?.['person'])) {
            ids = resolveUserIds(task.custom_values['person']);
        } else if (task.assigned_to) {
            ids = [task.assigned_to];
        }

        if (ids.length === 0 && boardColumns.length > 0) {
            const desCol = boardColumns.find(
                (c) =>
                    c.type === 'people' &&
                    (c.key.includes('designer') || c.title.toLowerCase().includes('designer')),
            );
            if (desCol && task.custom_values?.[desCol.key]) {
                ids = resolveUserIds(task.custom_values[desCol.key]);
            }
        }

        return resolveUsersList(ids);
    }, [task.custom_values, task.assigned_to, users, boardColumns]);

    // 4. Resolve Service Type
    const serviceTypeValue = useMemo(() => {
        if (task.custom_values?.['service_type']) return String(task.custom_values['service_type']);
        if (task.custom_values?.['task_type']) return String(task.custom_values['task_type']);
        if (task.custom_values?.['type']) return String(task.custom_values['type']);

        const stCol = boardColumns.find(
            (c) => c.key === 'service_type' || c.title.toLowerCase().includes('service'),
        );
        if (stCol && task.custom_values?.[stCol.key]) {
            return String(task.custom_values[stCol.key]);
        }
        return null;
    }, [task.custom_values, boardColumns]);

    // 5. Permitted Workflow Status choices for Employees
    const permittedEmployeeStatuses = useMemo(() => {
        return statusColumns.filter((sc) => {
            const cat = (sc.category || sc.semantic_category || sc.title).toLowerCase();
            return !['completed', 'done', 'cancelled', 'archive', 'closed'].includes(cat);
        });
    }, [statusColumns]);

    // 6. Remaining Board Custom Columns (strictly deduplicated from above fields)
    const nonDuplicatedCustomColumns = useMemo(() => {
        return boardColumns.filter((col) => {
            const key = col.key.toLowerCase();
            const title = col.title.toLowerCase();

            if (col.type === 'status' || key === 'status' || title === 'status') return false;
            if (key === 'due_date' || title === 'deadline' || title === 'due date') return false;
            if (key === 'service_type' || title.includes('service')) return false;
            if (col.type === 'priority' || key === 'priority' || title === 'priority') return false;
            if (col.type === 'progress' || key === 'progress' || title === 'progress') return false;
            if (col.type === 'timeline' || key === 'timeline' || title === 'timeline') return false;
            if (key === 'person' || key === 'designer_ids' || key === 'designer' || title.includes('designer')) return false;
            if (key === 'account_manager' || key === 'am' || title === 'am' || title.includes('account manager')) return false;
            if (key === 'project_manager' || key === 'pm' || title === 'pm' || title.includes('project manager')) return false;
            if (!canViewClientDeadline && (key === 'client_deadline' || title === 'client deadline')) return false;

            return true;
        });
    }, [boardColumns, canViewClientDeadline]);

    const descriptionText = task.description?.trim() || '';
    const isLongDescription = descriptionText.length > 200;
    const displayedDescription = isLongDescription && !isDescExpanded
        ? `${descriptionText.slice(0, 200)}...`
        : descriptionText;

    const renderUserAvatar = (user: User, size = 'sm') => {
        const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-xs';
        const avatarSrc = (user.avatar || user.avatar_url) || undefined;
        if (avatarSrc) {
            return (
                <img
                    src={avatarSrc}
                    alt={user.name}
                    className={`${dim} rounded-full object-cover border border-border/80 shrink-0`}
                />
            );
        }
        const initials = user.name
            .split(' ')
            .map((p) => p[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'U';

        return (
            <div
                className={`${dim} rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/30`}
                title={user.name}
            >
                {initials}
            </div>
        );
    };

    const renderUserBadge = (user: User) => (
        <div
            key={user.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 pl-0.5 pr-2 py-0.5 border border-border/60 shadow-2xs"
        >
            {renderUserAvatar(user, 'sm')}
            <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">{user.name}</span>
        </div>
    );

    const renderCustomFieldValue = (col: BoardColumn, val: any) => {
        if (val === null || val === undefined || val === '') {
            return <span className="text-muted-foreground italic font-normal">—</span>;
        }

        if (col.type === 'checkbox') {
            return val ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                    <Check className="h-3 w-3" /> Yes
                </span>
            ) : (
                <span className="text-muted-foreground font-normal">No</span>
            );
        }

        if (col.type === 'date') {
            let datePart = '';
            let timePart = '';
            if (typeof val === 'object' && val !== null) {
                datePart = val.date || '';
                timePart = val.time || '';
            } else if (typeof val === 'string') {
                if (val.includes(' ') || val.includes('T')) {
                    const parts = val.replace('T', ' ').split(' ');
                    datePart = parts[0] || '';
                    timePart = parts[1]?.slice(0, 5) || '';
                } else {
                    datePart = val;
                }
            }
            return (
                <span>
                    {formatDate(datePart)}
                    {timePart ? `, ${formatTime(timePart)}` : ''}
                </span>
            );
        }

        if (col.type === 'people') {
            const ids = resolveUserIds(val);
            const resolved = resolveUsersList(ids);
            if (resolved.length === 0) {
                return <span className="text-muted-foreground italic font-normal">Unassigned</span>;
            }
            return (
                <div className="flex flex-wrap items-center gap-1.5">
                    {resolved.map(renderUserBadge)}
                </div>
            );
        }

        if (col.type === 'number') {
            return <span className="font-mono">{Number(val).toLocaleString()}</span>;
        }

        return <span>{String(val)}</span>;
    };

    const handleSubtaskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!subtaskTitle.trim()) return;
        onAddSubtask(subtaskTitle.trim());
        setSubtaskTitle('');
    };

    return (
        <div className="space-y-4">
            {/* 1. TASK HEADING (Read-Only) */}
            <div className="space-y-1.5 pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: task.group?.color || task.column?.color || '#579BFC' }}
                    />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {task.group?.title || 'Production Task'}
                    </span>
                    {task.is_blocked && (
                        <button
                            type="button"
                            onClick={() => onJumpToTab?.('dependencies')}
                            className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/25 px-2 py-0.2 text-[10px] font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                            <ShieldAlert className="h-3 w-3" />
                            <span>Blocked</span>
                        </button>
                    )}
                </div>
                <h2 className="text-xl font-black text-foreground tracking-tight leading-snug break-words">
                    {task.title}
                </h2>
            </div>

            {/* 2-COLUMN STRUCTURED TASK DETAILS (Monday.com inspired) */}
            <div className="space-y-0.5 text-xs divide-y divide-border/40">
                {/* 2. PROJECT MANAGER */}
                <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-start gap-2 py-2.5">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 pt-0.5">
                        <Briefcase className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        Project Manager
                    </span>
                    <div className="min-w-0">
                        {projectManagerUsers.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                                {projectManagerUsers.map(renderUserBadge)}
                            </div>
                        ) : (
                            <span className="text-xs text-muted-foreground italic flex items-center gap-1.5 py-0.5">
                                <UserIcon className="h-3.5 w-3.5 opacity-40 shrink-0" />
                                Not assigned
                            </span>
                        )}
                    </div>
                </div>

                {/* 3. ACCOUNT MANAGER */}
                <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-start gap-2 py-2.5">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 pt-0.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        Account Manager
                    </span>
                    <div className="min-w-0">
                        {accountManagerUsers.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                                {accountManagerUsers.map(renderUserBadge)}
                            </div>
                        ) : (
                            <span className="text-xs text-muted-foreground italic flex items-center gap-1.5 py-0.5">
                                <UserIcon className="h-3.5 w-3.5 opacity-40 shrink-0" />
                                Not assigned
                            </span>
                        )}
                    </div>
                </div>

                {/* 4. ASSIGNED DESIGNERS (Multi-Assignee Support) */}
                <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-start gap-2 py-2.5">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 pt-0.5">
                        <UserIcon className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        Assigned Designers
                    </span>
                    <div className="min-w-0">
                        {designerUsers.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                                {designerUsers.map(renderUserBadge)}
                            </div>
                        ) : (
                            <span className="text-xs text-muted-foreground italic flex items-center gap-1.5 py-0.5">
                                <UserIcon className="h-3.5 w-3.5 opacity-40 shrink-0" />
                                Not assigned
                            </span>
                        )}
                    </div>
                </div>

                {/* 5. WORKFLOW STATUS (Interactive for permitted employee moves, read-only otherwise) */}
                <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2 py-2.5">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        Status
                    </span>
                    <div className="min-w-0">
                        {canChangeStatus ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold text-white shadow-2xs hover:brightness-105 transition-all cursor-pointer"
                                        style={{ backgroundColor: task.column?.color || '#64748b' }}
                                    >
                                        <span>{task.column?.title || 'Not Started'}</span>
                                        <ChevronDown className="h-3 w-3 opacity-80" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-44 space-y-1 rounded-xl p-1.5">
                                    {permittedEmployeeStatuses.map((sc) => (
                                        <button
                                            key={sc.id}
                                            type="button"
                                            onClick={() => onUpdateField('column_id', sc.id)}
                                            className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                                            style={{ backgroundColor: sc.color }}
                                        >
                                            <span className="truncate">{sc.title}</span>
                                            {sc.id === task.column_id && <Check className="h-3 w-3 shrink-0" />}
                                        </button>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <span
                                className="inline-block rounded-lg px-3 py-1 text-xs font-bold text-white shadow-2xs"
                                style={{ backgroundColor: task.column?.color || '#64748b' }}
                            >
                                {task.column?.title || 'Not Started'}
                            </span>
                        )}
                    </div>
                </div>

                {/* 6. SERVICE TYPE */}
                <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2 py-2.5">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        Service Type
                    </span>
                    <div className="min-w-0">
                        {serviceTypeValue ? (
                            <span className="inline-flex items-center rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                                {serviceTypeValue}
                            </span>
                        ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                    </div>
                </div>

                {/* 7. DEADLINE (12-hour AM/PM formatting + exact countdown badge) */}
                <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-start gap-2 py-2.5">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 pt-0.5">
                        <Clock className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        Deadline
                    </span>
                    <div className="min-w-0 space-y-1">
                        {task.due_date ? (
                            <>
                                <div className="text-xs font-bold text-foreground">
                                    {formatDate(task.due_date)}
                                    {task.due_time ? `, ${formatTime(task.due_time)}` : ''}
                                </div>
                                {exactRemaining && (
                                    <div>
                                        {exactRemaining.isOverdue ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400 border border-red-500/20">
                                                <AlertCircle className="h-3 w-3" />
                                                {exactRemaining.formattedRemaining}
                                            </span>
                                        ) : exactRemaining.hours < 24 ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                <Clock className="h-3 w-3" />
                                                {exactRemaining.formattedRemaining}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                <Calendar className="h-3 w-3" />
                                                {exactRemaining.formattedRemaining}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <span className="text-xs text-muted-foreground italic">No deadline set</span>
                        )}
                    </div>
                </div>

                {/* 8. DESCRIPTION / BRIEF (Expandable) */}
                <div className="py-2.5 space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        Task Description / Brief
                    </span>
                    {descriptionText ? (
                        <div className="rounded-xl bg-muted/25 border border-border/50 p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                            <p>{displayedDescription}</p>
                            {isLongDescription && (
                                <button
                                    type="button"
                                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                                    className="mt-1.5 text-[11px] font-bold text-primary hover:underline block"
                                >
                                    {isDescExpanded ? 'Show less' : 'Show full description'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">No description provided.</p>
                    )}
                </div>

                {/* 9. PRIORITY */}
                <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2 py-2.5">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        Priority
                    </span>
                    <div className="min-w-0">
                        <span
                            className="inline-block rounded-lg px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs"
                            style={{
                                backgroundColor:
                                    task.priority === 'Urgent'
                                        ? '#e2445c'
                                        : task.priority === 'High'
                                        ? '#579bfc'
                                        : task.priority === 'Low'
                                        ? '#64748b'
                                        : '#a25ddc',
                            }}
                        >
                            {task.priority || 'Medium'}
                        </span>
                    </div>
                </div>

                {/* 10. WORK CATEGORIES */}
                <div className="py-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-foreground">
                            <CornerDownRight className="h-3.5 w-3.5 text-primary" />
                            <span>
                                Work Categories ({subitems.length})
                            </span>
                        </span>
                    </div>

                    <div className="max-h-48 space-y-1.5 overflow-y-auto">
                        {subitems.map((sub) => {
                            const subAssignees = getTaskAssignedUsers(sub, users);
                            return (
                                <div
                                    key={sub.id}
                                    onClick={() => onSelectTask?.(sub)}
                                    className="bg-muted/20 border-border/60 flex items-center justify-between rounded-xl border p-2 text-xs transition-colors hover:border-primary/40 cursor-pointer"
                                >
                                    <div className="flex flex-1 items-center gap-2 min-w-0 pr-2">
                                        <span className="font-semibold text-foreground truncate hover:underline">
                                            {sub.title}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {subAssignees.length > 0 && (
                                            <div
                                                className="flex items-center -space-x-1"
                                                title={`Assigned: ${subAssignees.map((u) => u.name).join(', ')}`}
                                            >
                                                {subAssignees.slice(0, 2).map((u) => (
                                                    <div
                                                        key={u.id}
                                                        className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary/20 text-[8px] font-bold text-primary ring-1 ring-border"
                                                    >
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                ))}
                                                {subAssignees.length > 2 && (
                                                    <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground ring-1 ring-border">
                                                        +{subAssignees.length - 2}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {sub.column?.title && (
                                            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0">
                                                {sub.column.title}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {canManageSubtasks && (
                            <form onSubmit={handleSubtaskSubmit} className="flex items-center gap-1.5 pt-1">
                                <Input
                                    placeholder="Add category (e.g. Design, Video Editing, QA)..."
                                    value={subtaskTitle}
                                    onChange={(e) => setSubtaskTitle(e.target.value)}
                                    className="h-7.5 flex-1 text-xs"
                                />
                                <Button type="submit" size="sm" className="h-7.5 text-xs font-bold px-3">
                                    Add
                                </Button>
                            </form>
                        )}
                    </div>
                </div>


                {/* 12. DEDUPLICATED CUSTOM BOARD FIELDS */}
                {nonDuplicatedCustomColumns.length > 0 && (
                    <div className="py-2.5 space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Additional Details
                        </div>
                        <div className="space-y-1.5">
                            {nonDuplicatedCustomColumns.map((col) => {
                                const val = task.custom_values?.[col.key];
                                return (
                                    <div
                                        key={col.id}
                                        className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2 py-1 border-b border-border/20 last:border-b-0 text-xs"
                                    >
                                        <span className="text-muted-foreground font-medium truncate" title={col.title}>
                                            {col.title}
                                        </span>
                                        <div className="font-semibold text-foreground truncate">
                                            {renderCustomFieldValue(col, val)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
