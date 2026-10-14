import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate, formatTime } from '@/lib/utils';
import { router } from '@inertiajs/react';
import {
    Calendar,
    Check,
    ChevronDown,
    Copy,
    CornerDownRight,
    Edit2,
    Edit3,
    EyeOff,
    MessageCircle,
    MoreHorizontal,
    Plus,
    Trash2,
    User as UserIcon,
    X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { BoardColumn, DEFAULT_TASK_TYPES, KanbanColumn, Task, User } from '../types';
import DatePickerCell from './DatePickerCell';
import EditableDropdownCell from './EditableDropdownCell';
import MultiPeoplePicker from './MultiPeoplePicker';

interface SubitemTableProps {
    parentTask: Task;
    subitems: Task[];
    columns: KanbanColumn[];
    subitemColumns?: BoardColumn[];
    users: User[];
    groupColor?: string;
    onSelectTask: (task: Task) => void;
    onAddSubtaskColumn?: () => void;
}

export default function SubitemTable({
    parentTask,
    subitems = [],
    columns = [],
    subitemColumns = [],
    users = [],
    groupColor = '#579BFC',
    onSelectTask,
    onAddSubtaskColumn,
}: SubitemTableProps) {
    const [newTitle, setNewTitle] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
    const [editingTitleVal, setEditingTitleVal] = useState('');

    // Column Management Modal States
    const [renameColumn, setRenameColumn] = useState<BoardColumn | null>(null);
    const [renameTitleInput, setRenameTitleInput] = useState('');

    // Active subtask columns: use subitemColumns if provided; fallback to standard defaults if empty
    const effectiveColumns: BoardColumn[] = useMemo(() => {
        if (subitemColumns && subitemColumns.length > 0) {
            return subitemColumns.filter((c) => c.is_visible);
        }
        return [
            { id: 9001, board_id: parentTask.board_id, key: 'sub_designer', title: 'Designer', type: 'people', position: 0, is_visible: true, width: 150 },
            { id: 9002, board_id: parentTask.board_id, key: 'sub_deadline', title: 'Deadline', type: 'date', position: 1, is_visible: true, width: 130 },
            {
                id: 9003,
                board_id: parentTask.board_id,
                key: 'sub_status',
                title: 'Status',
                type: 'status',
                position: 2,
                is_visible: true,
                width: 140,
                config: {
                    status_options: [
                        { label: 'New Task', color: '#0086C0' },
                        { label: 'Working on it', color: '#FDAB3D' },
                        { label: 'For Review', color: '#A25DDC' },
                        { label: 'Needs Revision', color: '#FF642E' },
                        { label: 'Done', color: '#00C875' },
                    ],
                },
            },
            {
                id: 9004,
                board_id: parentTask.board_id,
                key: 'sub_task_type',
                title: 'Task Type',
                type: 'dropdown',
                position: 3,
                is_visible: true,
                width: 170,
                config: {
                    options: DEFAULT_TASK_TYPES,
                },
            },
            { id: 9005, board_id: parentTask.board_id, key: 'sub_internal_revision', title: 'Internal Revision', type: 'text', position: 4, is_visible: true, width: 140 },
            { id: 9006, board_id: parentTask.board_id, key: 'sub_client_revision', title: 'Client Revision', type: 'text', position: 5, is_visible: true, width: 140 },
            { id: 9007, board_id: parentTask.board_id, key: 'sub_client_requests', title: 'Client Requests', type: 'text', position: 6, is_visible: true, width: 180 },
        ];
    }, [subitemColumns, parentTask.board_id]);

    const handleAddSubitem = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newTitle.trim();
        if (!trimmed) return;

        router.post(
            `/kanban/tasks/${parentTask.id}/subitems`,
            {
                title: trimmed,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNewTitle('');
                    setIsAdding(false);
                },
            },
        );
    };

    const handleSaveTitle = (sub: Task) => {
        setEditingSubtaskId(null);
        const trimmed = editingTitleVal.trim();
        if (trimmed && trimmed !== sub.title) {
            router.patch(
                `/kanban/tasks/${sub.id}`,
                { title: trimmed },
                { preserveScroll: true },
            );
        }
    };

    const handleUpdateStatus = (sub: Task, columnIdOrLabel: number | string, colKey: string) => {
        if (typeof columnIdOrLabel === 'number') {
            router.patch(
                `/kanban/tasks/${sub.id}/column`,
                { column_id: columnIdOrLabel },
                { preserveScroll: true },
            );
        } else {
            // Check if matches a board column title
            const matchedCol = columns.find((c) => c.title.toLowerCase() === columnIdOrLabel.toLowerCase());
            if (matchedCol) {
                router.patch(
                    `/kanban/tasks/${sub.id}/column`,
                    { column_id: matchedCol.id },
                    { preserveScroll: true },
                );
            } else {
                router.patch(
                    `/kanban/tasks/${sub.id}`,
                    {
                        custom_values: { [colKey]: columnIdOrLabel },
                    },
                    { preserveScroll: true },
                );
            }
        }
    };

    const handleUpdateSubtaskPeople = (sub: Task, colKey: string, userIds: number[]) => {
        router.patch(
            `/kanban/tasks/${sub.id}`,
            {
                assigned_to: userIds[0] ?? null,
                custom_values: {
                    [colKey]: userIds,
                    designer_ids: userIds,
                    person: userIds,
                    sub_designer: userIds,
                },
            },
            { preserveScroll: true },
        );
    };

    const handleUpdateDate = (sub: Task, colKey: string, date: string) => {
        router.patch(
            `/kanban/tasks/${sub.id}`,
            {
                due_date: date || null,
                custom_values: { [colKey]: date || null },
            },
            { preserveScroll: true },
        );
    };

    const handleUpdateCustomValue = (sub: Task, key: string, val: any) => {
        router.patch(
            `/kanban/tasks/${sub.id}`,
            {
                custom_values: { [key]: val },
            },
            { preserveScroll: true },
        );
    };

    const handleDelete = (subtaskId: number) => {
        if (confirm('Delete this subtask?')) {
            router.delete(`/kanban/tasks/${subtaskId}`, { preserveScroll: true });
        }
    };

    const handleResizeColumn = (col: BoardColumn, width: number) => {
        if (col.id < 9000) {
            router.patch(`/kanban/board-columns/${col.id}`, { width }, { preserveScroll: true });
        }
    };

    const handleRenameColumnSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!renameColumn || !renameTitleInput.trim()) return;

        if (renameColumn.id < 9000) {
            router.patch(
                `/kanban/board-columns/${renameColumn.id}`,
                { title: renameTitleInput.trim() },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setRenameColumn(null);
                        setRenameTitleInput('');
                    },
                },
            );
        } else {
            setRenameColumn(null);
        }
    };

    const handleDeleteColumn = (colId: number) => {
        if (colId < 9000 && confirm('Delete this subtask column?')) {
            router.delete(`/kanban/board-columns/${colId}`, { preserveScroll: true });
        }
    };

    const getStatusStyle = (title: string = '') => {
        const lower = title.toLowerCase();
        if (lower.includes('done') || lower.includes('complete')) {
            return { bg: '#00C875', label: title || 'Done' };
        }
        if (lower.includes('progress') || lower.includes('working')) {
            return { bg: '#FDAB3D', label: title || 'Working on it' };
        }
        if (lower.includes('review') || lower.includes('qa')) {
            return { bg: '#A25DDC', label: title || 'For Review' };
        }
        if (lower.includes('revision') || lower.includes('needs revision')) {
            return { bg: '#FF642E', label: title || 'Needs Revision' };
        }
        if (lower.includes('hold') || lower.includes('blocked') || lower.includes('stuck')) {
            return { bg: '#E2445C', label: title || 'Hold' };
        }
        if (lower.includes('new') || lower.includes('resource') || lower.includes('backlog')) {
            return { bg: '#0086C0', label: title || 'New Task' };
        }
        return { bg: '#94A3B8', label: title || 'Not Started' };
    };

    return (
        <div className="bg-muted/15 dark:bg-muted/5 border-border/30 border-b py-2.5 pr-4 pl-3 select-none">
            {/* Visual connector from parent row to nested table */}
            <div className="flex items-start gap-2.5">
                {/* Branch line tree connector */}
                <div className="flex w-7 flex-shrink-0 flex-col items-center pt-2">
                    <div
                        className="h-6 w-3.5 rounded-bl-xl border-b-2 border-l-2 opacity-80"
                        style={{ borderColor: groupColor }}
                    />
                </div>

                {/* Nested Subtask Table Card */}
                <div className="bg-card border-border/70 min-w-0 flex-1 overflow-hidden rounded-xl border shadow-xs">
                    {/* Inner horizontal scroll container */}
                    <div className="overflow-x-auto overflow-y-visible">
                        <div className="w-max min-w-full">
                            {/* Subtask Table Header Row */}
                            <div className="bg-muted/40 border-border/50 text-muted-foreground flex items-center border-b text-[10px] font-bold tracking-wider uppercase">
                                {/* Left checkbox/icon spacer */}
                                <div className="flex w-9 flex-shrink-0 items-center justify-center py-2">
                                    <CornerDownRight className="h-3 w-3 text-muted-foreground/70" />
                                </div>

                                {/* Primary Subtask Title Column */}
                                <div className="border-border/30 min-w-[220px] flex-1 border-r px-3 py-2">
                                    Subitem
                                </div>

                                {/* Independent Subtask Columns */}
                                {effectiveColumns.map((col) => (
                                    <div
                                        key={col.id}
                                        style={{ width: col.width || 140 }}
                                        className="border-border/30 group/scol flex flex-shrink-0 items-center justify-between border-r px-2 py-2 text-center"
                                    >
                                        <span className="w-full truncate">{col.title}</span>

                                        {/* Column Options Menu */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="hover:bg-muted rounded p-0.5 opacity-0 transition-opacity group-hover/scol:opacity-100">
                                                    <MoreHorizontal className="h-3 w-3" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setRenameColumn(col);
                                                        setRenameTitleInput(col.title);
                                                    }}
                                                    className="text-xs"
                                                >
                                                    <Edit3 className="mr-2 h-3.5 w-3.5" />
                                                    <span>Rename Column</span>
                                                </DropdownMenuItem>

                                                <DropdownMenuSeparator />

                                                <div className="text-muted-foreground px-2 py-1 text-[10px] font-bold uppercase">
                                                    Width
                                                </div>
                                                <div className="flex items-center gap-1 px-2 py-1">
                                                    {[110, 140, 180, 240].map((w) => (
                                                        <button
                                                            key={w}
                                                            onClick={() => handleResizeColumn(col, w)}
                                                            className={`flex-1 rounded border py-0.5 text-[10px] font-bold ${
                                                                (col.width || 140) === w
                                                                    ? 'bg-primary/10 border-primary text-primary'
                                                                    : 'border-border hover:bg-muted'
                                                            }`}
                                                        >
                                                            {w}px
                                                        </button>
                                                    ))}
                                                </div>

                                                {col.id < 9000 && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeleteColumn(col.id)}
                                                            className="text-xs text-red-500"
                                                        >
                                                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                            <span>Delete Column</span>
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                ))}

                                {/* + Add Subtask Column Button */}
                                <div className="flex w-9 flex-shrink-0 items-center justify-center">
                                    <button
                                        onClick={onAddSubtaskColumn}
                                        className="hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center p-1.5 transition-colors"
                                        title="Add Subtask Column"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Subtask Rows */}
                            {subitems.map((sub) => {
                                const subCommentsCount = sub.comments?.length || 0;
                                const isEditing = editingSubtaskId === sub.id;

                                return (
                                    <div
                                        key={sub.id}
                                        className="group/subrow border-border/30 hover:bg-muted/20 flex items-center border-b text-xs transition-colors"
                                    >
                                        {/* Row Left Handle / Indicator */}
                                        <div className="flex w-9 flex-shrink-0 items-center justify-center py-1.5">
                                            <div
                                                className="h-2 w-2 rounded-full opacity-70 group-hover/subrow:opacity-100"
                                                style={{ backgroundColor: groupColor }}
                                            />
                                        </div>

                                        {/* Subtask Title Cell */}
                                        <div className="border-border/30 flex min-w-[220px] flex-1 items-center justify-between border-r px-3 py-1.5">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editingTitleVal}
                                                    onChange={(e) => setEditingTitleVal(e.target.value)}
                                                    onBlur={() => handleSaveTitle(sub)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveTitle(sub);
                                                        if (e.key === 'Escape') setEditingSubtaskId(null);
                                                    }}
                                                    autoFocus
                                                    className="bg-background border-primary focus:ring-primary/20 w-full rounded border px-2 py-0.5 text-xs font-medium focus:outline-none focus:ring-1"
                                                />
                                            ) : (
                                                <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
                                                    <span
                                                        onClick={() => {
                                                            setEditingSubtaskId(sub.id);
                                                            setEditingTitleVal(sub.title);
                                                        }}
                                                        className="text-foreground hover:text-primary cursor-pointer truncate font-medium transition-colors"
                                                        title="Click to edit subtask title"
                                                    >
                                                        {sub.title}
                                                    </span>

                                                    {/* Comments Drawer Button */}
                                                    <button
                                                        onClick={() => onSelectTask(sub)}
                                                        className={`hover:bg-muted rounded p-1 transition-colors ${
                                                            subCommentsCount > 0
                                                                ? 'text-primary'
                                                                : 'text-muted-foreground opacity-0 group-hover/subrow:opacity-100'
                                                        }`}
                                                        title="Open Subtask Details & Discussion"
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <MessageCircle className="h-3 w-3" />
                                                            {subCommentsCount > 0 && (
                                                                <span className="text-[10px] font-bold">{subCommentsCount}</span>
                                                            )}
                                                        </div>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Subtask Dynamic Columns */}
                                        {effectiveColumns.map((col) => {
                                            // 1. People / Designer
                                            if (col.type === 'people' || col.key.includes('designer') || col.key.includes('person')) {
                                                const rawPeople =
                                                    sub.custom_values?.[col.key] ||
                                                    sub.custom_values?.designer_ids ||
                                                    sub.custom_values?.person ||
                                                    sub.custom_values?.sub_designer ||
                                                    (sub.assigned_to ? [sub.assigned_to] : []);
                                                const userIds: number[] = Array.isArray(rawPeople)
                                                    ? rawPeople.map(Number).filter((n) => !isNaN(n) && n > 0)
                                                    : rawPeople
                                                      ? [Number(rawPeople)]
                                                      : [];

                                                return (
                                                    <div
                                                        key={col.id}
                                                        style={{ width: col.width || 140 }}
                                                        className="border-border/30 flex flex-shrink-0 items-center justify-center border-r px-2 py-1"
                                                    >
                                                        <MultiPeoplePicker
                                                            selectedUserIds={userIds}
                                                            users={users}
                                                            onChange={(newIds) => handleUpdateSubtaskPeople(sub, col.key, newIds)}
                                                            placeholder="Add person"
                                                            maxDisplay={2}
                                                            compact={true}
                                                            showNames={false}
                                                        />
                                                    </div>
                                                );
                                            }

                                            // 2. Date / Deadline
                                            if (col.type === 'date' || col.key.includes('date') || col.key.includes('deadline')) {
                                                const dateVal =
                                                    sub.custom_values?.[col.key] || sub.due_date || '';
                                                return (
                                                    <div
                                                        key={col.id}
                                                        style={{ width: col.width || 140 }}
                                                        className="border-border/30 flex flex-shrink-0 items-center justify-center border-r px-1 py-1 text-center min-w-0 overflow-hidden"
                                                    >
                                                        <DatePickerCell
                                                            value={dateVal ? String(dateVal).split('T')[0] : ''}
                                                            onChange={(newDate) => handleUpdateDate(sub, col.key, newDate || '')}
                                                            placeholder="Set date"
                                                        />
                                                    </div>
                                                );
                                            }

                                            // 3. Status
                                            if (col.type === 'status' || col.key.includes('status')) {
                                                const currentLabel =
                                                    sub.custom_values?.[col.key] || sub.column?.title || 'New Task';
                                                const meta = getStatusStyle(currentLabel);

                                                // Options from config or board columns
                                                const options =
                                                    col.config?.status_options || [
                                                        { label: 'New Task', color: '#0086C0' },
                                                        { label: 'Working on it', color: '#FDAB3D' },
                                                        { label: 'For Review', color: '#A25DDC' },
                                                        { label: 'Needs Revision', color: '#FF642E' },
                                                        { label: 'Done', color: '#00C875' },
                                                    ];

                                                return (
                                                    <div
                                                        key={col.id}
                                                        style={{ width: col.width || 140 }}
                                                        className="border-border/30 flex flex-shrink-0 items-center justify-center border-r px-2 py-1"
                                                    >
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button
                                                                    className="w-full truncate rounded py-1 px-1.5 text-center text-[11px] font-bold tracking-tight text-white shadow-2xs transition-all hover:brightness-105 active:scale-95"
                                                                    style={{ backgroundColor: meta.bg }}
                                                                >
                                                                    {meta.label}
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="center" className="w-40 space-y-1 rounded-xl p-1.5">
                                                                {options.map((opt: any) => {
                                                                    const optLabel = typeof opt === 'string' ? opt : opt.label;
                                                                    const optColor = typeof opt === 'string' ? getStatusStyle(opt).bg : opt.color;
                                                                    return (
                                                                        <button
                                                                            key={optLabel}
                                                                            type="button"
                                                                            onClick={() => handleUpdateStatus(sub, optLabel, col.key)}
                                                                            className="w-full rounded py-1 text-center text-[11px] font-bold text-white transition-opacity hover:opacity-90"
                                                                            style={{ backgroundColor: optColor }}
                                                                        >
                                                                            {optLabel}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                );
                                            }

                                            // 4. Dropdown (e.g. Task Type — Editable with 8 standard types + custom types)
                                            if (col.type === 'dropdown' || col.key.includes('task_type')) {
                                                const currentVal =
                                                    (sub.custom_values?.[col.key] as string) ||
                                                    (sub.custom_values?.task_type as string) ||
                                                    '';
                                                const configOptions = (col.config?.options as string[]) || [];
                                                const allOptions = Array.from(new Set([...DEFAULT_TASK_TYPES, ...configOptions]));

                                                return (
                                                    <div
                                                        key={col.id}
                                                        style={{ width: col.width || 170 }}
                                                        className="border-border/30 flex flex-shrink-0 items-center justify-center border-r px-1.5 py-1 min-w-0 overflow-hidden"
                                                    >
                                                        <EditableDropdownCell
                                                            value={currentVal}
                                                            options={allOptions}
                                                            onSelect={(opt) => handleUpdateCustomValue(sub, col.key, opt)}
                                                            placeholder="Select"
                                                        />
                                                    </div>
                                                );
                                            }

                                            // 5. Short Text or Long Text (Revisions, Requests)
                                            const val = sub.custom_values?.[col.key] ?? '';
                                            return (
                                                <div
                                                    key={col.id}
                                                    style={{ width: col.width || 140 }}
                                                    className="border-border/30 flex flex-shrink-0 items-center justify-center border-r px-2 py-1"
                                                >
                                                    <input
                                                        type="text"
                                                        defaultValue={val}
                                                        placeholder="-"
                                                        onBlur={(e) => handleUpdateCustomValue(sub, col.key, e.target.value)}
                                                        className="hover:bg-muted/40 focus:bg-background focus:ring-primary/20 w-full truncate rounded border-none bg-transparent px-1.5 py-0.5 text-center text-xs text-foreground focus:outline-none focus:ring-1"
                                                    />
                                                </div>
                                            );
                                        })}

                                        {/* Subtask Delete Action */}
                                        <div className="flex w-9 flex-shrink-0 items-center justify-center">
                                            <button
                                                onClick={() => handleDelete(sub.id)}
                                                className="text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded p-1 opacity-0 transition-all group-hover/subrow:opacity-100"
                                                title="Delete Subtask"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Inline Add Subitem Row */}
                            <form
                                onSubmit={handleAddSubitem}
                                className="bg-card/50 hover:bg-muted/10 flex items-center transition-colors"
                            >
                                <div className="flex w-9 flex-shrink-0 items-center justify-center py-2">
                                    <Plus className="h-3.5 w-3.5 text-muted-foreground/60" />
                                </div>
                                <div className="flex-1 py-1 pr-3">
                                    <input
                                        type="text"
                                        placeholder="+ Add Subitem"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        className="placeholder:text-muted-foreground/60 w-full border-none bg-transparent text-xs font-medium focus:outline-none"
                                    />
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rename Subtask Column Dialog */}
            <Dialog open={Boolean(renameColumn)} onOpenChange={() => setRenameColumn(null)}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleRenameColumnSubmit}>
                        <DialogHeader>
                            <DialogTitle>Rename Subtask Column</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="rename-sub-col">Column Title</Label>
                            <Input
                                id="rename-sub-col"
                                value={renameTitleInput}
                                onChange={(e) => setRenameTitleInput(e.target.value)}
                                autoFocus
                                required
                                className="mt-1"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRenameColumn(null)}>
                                Cancel
                            </Button>
                            <Button type="submit">Save Title</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
