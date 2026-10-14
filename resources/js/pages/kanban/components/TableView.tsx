import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Columns3, Copy, Edit3, Eye, EyeOff, Layers, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { BoardColumn, BoardPermissions, getTableGridTemplate, isUserAssignedToTask, KanbanBoard, Task, User } from '../types';
import AddColumnModal from './AddColumnModal';
import TableRow from './TableRow';

interface TableViewProps {
    board: KanbanBoard;
    searchTerm: string;
    personFilter: string;
    priorityFilter: string;
    users: User[];
    currentUser?: User;
    mirroredValues?: Record<number, Record<string, any>>;
    permissions?: BoardPermissions;
    onSelectTask: (task: Task) => void;
    onOpenNewColumn: () => void;
}

export default function TableView({
    board,
    searchTerm,
    personFilter,
    priorityFilter,
    users = [],
    currentUser,
    mirroredValues = {},
    permissions,
    onSelectTask,
    onOpenNewColumn,
}: TableViewProps) {
    const { auth } = usePage<any>().props;
    const effectiveCurrentUser = currentUser || auth?.user;
    const [collapsedGroups, setCollapsedGroups] = useState<Record<number, boolean>>({});
    const [quickAddTitles, setQuickAddTitles] = useState<Record<number, string>>({});
    const [editingGroupTitle, setEditingGroupTitle] = useState<number | null>(null);
    const [groupTitleInputs, setGroupTitleInputs] = useState<Record<number, string>>({});

    // Column Management Modal States
    const [renameColumn, setRenameColumn] = useState<BoardColumn | null>(null);
    const [renameTitleInput, setRenameTitleInput] = useState('');
    const [isAddSubtaskColumnOpen, setIsAddSubtaskColumnOpen] = useState(false);

    // Save Group as Blueprint States
    const [blueprintGroup, setBlueprintGroup] = useState<any | null>(null);
    const [blueprintTitle, setBlueprintTitle] = useState('');
    const [blueprintCategory, setBlueprintCategory] = useState('production');
    const [blueprintDesc, setBlueprintDesc] = useState('');
    const [isSavingBlueprint, setIsSavingBlueprint] = useState(false);

    const handleSaveGroupAsBlueprint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!blueprintGroup || !blueprintTitle.trim()) return;
        setIsSavingBlueprint(true);
        try {
            await axios.post(`/kanban/groups/${blueprintGroup.id}/save-as-blueprint`, {
                title: blueprintTitle.trim(),
                description: blueprintDesc.trim(),
                category: blueprintCategory,
            });
            setBlueprintGroup(null);
            alert('Group workflow saved as blueprint successfully!');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to save blueprint');
        } finally {
            setIsSavingBlueprint(false);
        }
    };

    const toggleCollapse = (groupId: number) => {
        setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const handleQuickAdd = (groupId: number, e: React.FormEvent) => {
        e.preventDefault();
        const title = quickAddTitles[groupId]?.trim();
        if (!title) return;

        router.post(
            '/kanban/tasks',
            {
                board_id: board.id,
                group_id: groupId,
                title,
                priority: 'Medium',
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setQuickAddTitles((prev) => ({ ...prev, [groupId]: '' }));
                },
            },
        );
    };

    const handleUpdateGroupTitle = (groupId: number) => {
        setEditingGroupTitle(null);
        const title = groupTitleInputs[groupId]?.trim();
        if (title) {
            router.patch(`/kanban/groups/${groupId}`, { title });
        }
    };

    const handleUpdateGroupColor = (groupId: number, color: string) => {
        router.patch(`/kanban/groups/${groupId}`, { color });
    };

    const handleDeleteGroup = (groupId: number) => {
        if (confirm('Delete this group? Any remaining items will be moved to another group.')) {
            router.delete(`/kanban/groups/${groupId}`);
        }
    };

    // Dynamic Columns Management
    const handleRenameColumnSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!renameColumn || !renameTitleInput.trim()) return;

        router.patch(
            `/kanban/board-columns/${renameColumn.id}`,
            {
                title: renameTitleInput.trim(),
            },
            {
                onSuccess: () => {
                    setRenameColumn(null);
                    setRenameTitleInput('');
                },
            },
        );
    };

    const handleToggleColumnVisibility = (col: BoardColumn) => {
        router.patch(`/kanban/board-columns/${col.id}`, {
            is_visible: !col.is_visible,
        });
    };

    const handleResizeColumn = (col: BoardColumn, width: number) => {
        router.patch(`/kanban/board-columns/${col.id}`, { width });
    };

    const handleReorderColumn = (colIndex: number, direction: 'left' | 'right') => {
        const targetIndex = direction === 'left' ? colIndex - 1 : colIndex + 1;
        if (targetIndex < 0 || targetIndex >= boardColumns.length) return;

        const newCols = [...boardColumns];
        const temp = newCols[colIndex];
        newCols[colIndex] = newCols[targetIndex];
        newCols[targetIndex] = temp;

        router.post(`/kanban/boards/${board.id}/columns/reorder`, {
            column_ids: newCols.map((c) => c.id),
        });
    };

    const handleDeleteColumn = (colId: number) => {
        if (confirm('Remove this column and its associated data from the board?')) {
            router.delete(`/kanban/board-columns/${colId}`);
        }
    };

    const groups = board.groups || [];
    const rawBoardColumns = board.board_columns || board.boardColumns || [];
    const boardColumns = rawBoardColumns.filter((c) => c.type !== 'progress' && c.key !== 'progress');
    const rawSubitemColumns = board.subitem_columns || board.subitemColumns || [];
    const subitemColumns = rawSubitemColumns.filter((c) => c.type !== 'progress' && c.key !== 'progress');
    const statusColumns = board.columns || [];
    const visibleColumns = boardColumns.filter((c) => c.is_visible);
    const gridTemplateColumns = getTableGridTemplate(visibleColumns);

    // Filter tasks
    const filterTask = (task: Task) => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchesTitle = task.title.toLowerCase().includes(term);
            const matchesDesc = (task.description || '').toLowerCase().includes(term);
            if (!matchesTitle && !matchesDesc) return false;
        }
        if (personFilter !== 'all' && !isUserAssignedToTask(task, personFilter, effectiveCurrentUser?.id)) {
            return false;
        }
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
            return false;
        }
        return true;
    };

    return (
        <div className="space-y-6">
            {/* Top Toolbar for Columns Visibility Switcher */}
            <div className="text-muted-foreground flex items-center justify-between px-1 text-xs">
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="bg-card border-border hover:bg-muted text-foreground flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all">
                                <Columns3 className="text-primary h-3.5 w-3.5" />
                                <span>
                                    Columns ({visibleColumns.length}/{boardColumns.length})
                                </span>
                                <ChevronDown className="text-muted-foreground h-3 w-3" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 rounded-xl p-1.5">
                            <div className="text-muted-foreground px-2 py-1 text-[10px] font-bold tracking-wider uppercase">Show / Hide Columns</div>
                            {boardColumns.map((col) => (
                                <DropdownMenuItem
                                    key={col.id}
                                    onClick={() => handleToggleColumnVisibility(col)}
                                    className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs"
                                >
                                    <span className="truncate">{col.title}</span>
                                    {col.is_visible ? (
                                        <Eye className="h-3.5 w-3.5 text-emerald-500" />
                                    ) : (
                                        <EyeOff className="text-muted-foreground h-3.5 w-3.5" />
                                    )}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Groups Loop */}
            {groups.map((group) => {
                const isCollapsed = collapsedGroups[group.id] || false;
                const groupTasks = (group.tasks || []).filter(filterTask);

                const totalTasks = groupTasks.length;
                const doneTasks = groupTasks.filter(
                    (t) => t.completed_at || t.column?.title?.toLowerCase().includes('done') || t.column?.title?.toLowerCase().includes('complete'),
                ).length;
                const donePercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

                return (
                    <div key={group.id} className="border-border/70 bg-card overflow-hidden rounded-2xl border shadow-xs">
                        {/* Group Header */}
                        <div className="bg-muted/20 border-border/40 flex items-center justify-between border-b px-3 py-2.5 select-none">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleCollapse(group.id)}
                                    className="hover:bg-muted text-muted-foreground rounded p-1 transition-transform"
                                >
                                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>

                                {/* Group Color Tag */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="h-4 w-4 rounded-md shadow-2xs transition-transform hover:scale-110"
                                            style={{ backgroundColor: group.color || '#579BFC' }}
                                            title="Change group color"
                                        />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="grid w-36 grid-cols-4 gap-1.5 p-2">
                                        {['#579BFC', '#A25DDC', '#00C875', '#FDAB3D', '#E2445C', '#0086C0', '#FF642E', '#784BD1'].map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => handleUpdateGroupColor(group.id, c)}
                                                className="h-6 w-6 rounded-md border border-black/10 transition-all hover:scale-110"
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Group Title */}
                                {editingGroupTitle === group.id ? (
                                    <input
                                        type="text"
                                        defaultValue={group.title}
                                        onBlur={(e) => {
                                            setGroupTitleInputs((prev) => ({
                                                ...prev,
                                                [group.id]: e.target.value,
                                            }));
                                            handleUpdateGroupTitle(group.id);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setGroupTitleInputs((prev) => ({
                                                    ...prev,
                                                    [group.id]: (e.target as HTMLInputElement).value,
                                                }));
                                                handleUpdateGroupTitle(group.id);
                                            }
                                        }}
                                        autoFocus
                                        className="bg-background border-primary rounded border px-1.5 py-0.5 text-sm font-black focus:outline-none"
                                    />
                                ) : (
                                    <h2
                                        onClick={() => {
                                            setEditingGroupTitle(group.id);
                                            setGroupTitleInputs((prev) => ({
                                                ...prev,
                                                [group.id]: group.title,
                                            }));
                                        }}
                                        className="cursor-pointer text-sm font-black transition-opacity hover:opacity-80"
                                        style={{ color: group.color || '#579BFC' }}
                                        title="Click to rename group"
                                    >
                                        {group.title}
                                    </h2>
                                )}

                                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-bold">
                                    {totalTasks} items
                                </span>
                            </div>

                            {/* Group Options Menu */}
                            {permissions?.canManageGroups !== false && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="hover:bg-muted text-muted-foreground rounded p-1">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                        <DropdownMenuItem onClick={() => setEditingGroupTitle(group.id)}>
                                            <Edit3 className="mr-2 h-3.5 w-3.5" />
                                            <span>Rename Group</span>
                                        </DropdownMenuItem>
                                        {permissions?.canManageBlueprints !== false && (
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setBlueprintGroup(group);
                                                    setBlueprintTitle(`${group.title} Blueprint`);
                                                    setBlueprintDesc(`Standard workflow for ${group.title}`);
                                                    setBlueprintCategory('production');
                                                }}
                                            >
                                                <Layers className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                                                <span>Save as Blueprint</span>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleDeleteGroup(group.id)} className="text-red-500">
                                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                                            <span>Delete Group</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>

                        {/* Collapsible Table Body */}
                        {!isCollapsed && (
                            <div className="overflow-x-auto">
                                <div className="w-max min-w-full">
                                    {/* Table Column Header Row */}
                                    <div
                                        className="bg-muted/40 border-border/40 text-muted-foreground grid w-full items-stretch border-b text-[11px] font-bold tracking-wider uppercase select-none"
                                        style={{ gridTemplateColumns }}
                                    >
                                        <div className="h-full" style={{ backgroundColor: group.color }} />
                                        <div className="border-border/40 border-r flex items-center justify-center h-full" />
                                        <div className="border-border/40 border-r px-3 py-2 flex items-center min-w-0">Item</div>

                                        {/* Dynamic Columns Headers */}
                                        {visibleColumns.map((col, colIdx) => (
                                            <div
                                                key={col.id}
                                                className="border-border/40 group/col border-r px-2 py-2 flex items-center justify-between min-w-0 h-full text-center"
                                            >
                                                <span className="w-full truncate">{col.title}</span>

                                                {/* Column Options Menu */}
                                                {permissions?.canManageColumns !== false && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="hover:bg-muted rounded p-0.5 opacity-0 transition-opacity group-hover/col:opacity-100">
                                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
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

                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    router.post(`/kanban/board-columns/${col.id}/duplicate`, {}, { preserveScroll: true });
                                                                }}
                                                                className="text-xs"
                                                            >
                                                                <Copy className="mr-2 h-3.5 w-3.5" />
                                                                <span>Duplicate Column</span>
                                                            </DropdownMenuItem>

                                                            <DropdownMenuSeparator />

                                                            {/* Width submenu */}
                                                            <div className="text-muted-foreground px-2 py-1 text-[10px] font-bold uppercase">
                                                                Column Width
                                                            </div>
                                                            <div className="flex items-center gap-1 px-2 py-1">
                                                                {[110, 140, 180, 240].map((w) => (
                                                                    <button
                                                                        key={w}
                                                                        onClick={() => handleResizeColumn(col, w)}
                                                                        className={`flex-1 rounded border py-1 text-[10px] font-bold ${
                                                                            (col.width || 140) === w
                                                                                ? 'bg-primary/10 border-primary text-primary'
                                                                                : 'border-border hover:bg-muted'
                                                                        }`}
                                                                    >
                                                                        {w}px
                                                                    </button>
                                                                ))}
                                                            </div>

                                                            <DropdownMenuSeparator />

                                                            {/* Reorder */}
                                                            <DropdownMenuItem
                                                                onClick={() => handleReorderColumn(colIdx, 'left')}
                                                                disabled={colIdx === 0}
                                                                className="text-xs"
                                                            >
                                                                <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                                                                <span>Move Left</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleReorderColumn(colIdx, 'right')}
                                                                disabled={colIdx === visibleColumns.length - 1}
                                                                className="text-xs"
                                                            >
                                                                <ArrowRight className="mr-2 h-3.5 w-3.5" />
                                                                <span>Move Right</span>
                                                            </DropdownMenuItem>

                                                            <DropdownMenuSeparator />

                                                            {/* Hide */}
                                                            <DropdownMenuItem onClick={() => handleToggleColumnVisibility(col)} className="text-xs">
                                                                <EyeOff className="mr-2 h-3.5 w-3.5" />
                                                                <span>Hide Column</span>
                                                            </DropdownMenuItem>

                                                            {/* Delete */}
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteColumn(col.id)}
                                                                className="text-xs text-red-500"
                                                            >
                                                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                                <span>Delete Column</span>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        ))}

                                        {/* + Column Button on Header */}
                                        <div className="flex items-center justify-center h-full">
                                            {permissions?.canManageColumns !== false && (
                                                <button
                                                    onClick={onOpenNewColumn}
                                                    className="hover:bg-muted text-muted-foreground hover:text-foreground flex h-full w-full items-center justify-center transition-colors"
                                                    title="Add Dynamic Column"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Item Rows */}
                                    {groupTasks.map((task) => (
                                        <TableRow
                                            key={task.id}
                                            task={task}
                                            group={group}
                                            boardColumns={visibleColumns}
                                            subitemColumns={subitemColumns}
                                            statusColumns={statusColumns}
                                            groups={groups}
                                            users={users}
                                            mirroredValues={mirroredValues[task.id] || {}}
                                            gridTemplateColumns={gridTemplateColumns}
                                            permissions={permissions}
                                            onSelectTask={onSelectTask}
                                            onAddSubtaskColumn={() => setIsAddSubtaskColumnOpen(true)}
                                        />
                                    ))}

                                    {groupTasks.length === 0 && (
                                        <div className="border-border/40 bg-card/40 flex items-center justify-center p-4 text-xs text-muted-foreground/60 border-b select-none">
                                            {personFilter === 'me' ? 'No tasks assigned to you in this group' : 'No tasks in this group'}
                                        </div>
                                    )}
                                    {permissions?.canCreateTask !== false && (
                                        <div
                                            className="border-border/40 bg-card hover:bg-muted/10 grid w-full items-stretch border-b transition-colors"
                                            style={{ gridTemplateColumns }}
                                        >
                                            <div className="h-full" style={{ backgroundColor: group.color }} />
                                            <div className="border-border/40 border-r text-muted-foreground flex items-center justify-center h-full">
                                                <Plus className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="border-border/40 border-r px-2 py-1.5 flex items-center min-w-0 h-full">
                                                <form onSubmit={(e) => handleQuickAdd(group.id, e)} className="w-full">
                                                    <input
                                                        type="text"
                                                        placeholder="+ Add item"
                                                        value={quickAddTitles[group.id] || ''}
                                                        onChange={(e) =>
                                                            setQuickAddTitles((prev) => ({
                                                                ...prev,
                                                                [group.id]: e.target.value,
                                                            }))
                                                        }
                                                        className="placeholder:text-muted-foreground/60 w-full border-none bg-transparent px-1 py-1 text-xs focus:outline-none"
                                                    />
                                                </form>
                                            </div>

                                            {/* Matching cells for dynamic columns */}
                                            {visibleColumns.map((col) => (
                                                <div
                                                    key={`add_spacer_${col.id}`}
                                                    className="border-border/40 border-r px-1.5 py-1 flex items-center justify-center min-w-0 h-full bg-muted/5"
                                                />
                                            ))}
                                            <div className="h-full bg-muted/5" />
                                        </div>
                                    )}

                                    {/* Group Footer Summary */}
                                    <div
                                        className="bg-muted/10 text-muted-foreground border-border/30 grid w-full items-stretch border-t text-[11px] font-bold select-none"
                                        style={{ gridTemplateColumns }}
                                    >
                                        <div className="h-full" style={{ backgroundColor: group.color }} />
                                        <div className="border-border/40 border-r flex items-center justify-center h-full" />
                                        <div className="border-border/40 border-r px-3 py-1.5 flex items-center min-w-0 h-full">
                                            <span className="font-semibold text-emerald-500">
                                                {doneTasks}/{totalTasks} Completed ({donePercent}%)
                                            </span>
                                        </div>

                                        {/* Dynamic Column Footers */}
                                        {visibleColumns.map((col) => {
                                            // Number Column: calculate group sum
                                            if (col.type === 'number') {
                                                const sum = groupTasks.reduce((acc, t) => {
                                                    const val = Number((t.custom_values as Record<string, any>)?.[col.key]);
                                                    return acc + (isNaN(val) ? 0 : val);
                                                }, 0);

                                                return (
                                                    <div
                                                        key={`footer_${col.id}`}
                                                        className="border-border/40 border-r px-2 py-1.5 flex items-center justify-center font-mono text-xs font-bold min-w-0 h-full truncate"
                                                        title={`Sum: ${sum}`}
                                                    >
                                                        <span>∑ {sum}</span>
                                                    </div>
                                                );
                                            }

                                            // Progress Column: show average progress
                                            if (col.type === 'progress') {
                                                const avg =
                                                    totalTasks > 0
                                                        ? Math.round(groupTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / totalTasks)
                                                        : 0;
                                                return (
                                                    <div
                                                        key={`footer_${col.id}`}
                                                        className="border-border/40 border-r px-2 py-1.5 flex items-center justify-center text-[10px] font-bold min-w-0 h-full truncate"
                                                    >
                                                        <span>Avg {avg}%</span>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={`footer_${col.id}`}
                                                    className="border-border/40 border-r px-2 py-1.5 flex items-center justify-center text-[10px] text-muted-foreground/40 min-w-0 h-full"
                                                >
                                                    -
                                                </div>
                                            );
                                        })}
                                        <div className="h-full" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Rename Column Modal */}
            <Dialog open={!!renameColumn} onOpenChange={() => setRenameColumn(null)}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleRenameColumnSubmit}>
                        <DialogHeader>
                            <DialogTitle>Rename Column</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="rename-col">New Column Title</Label>
                            <Input
                                id="rename-col"
                                value={renameTitleInput}
                                onChange={(e) => setRenameTitleInput(e.target.value)}
                                required
                                className="mt-1"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRenameColumn(null)}>
                                Cancel
                            </Button>
                            <Button type="submit">Rename</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Subtask Dynamic Column Modal */}
            <AddColumnModal
                board={board}
                isOpen={isAddSubtaskColumnOpen}
                onClose={() => setIsAddSubtaskColumnOpen(false)}
                scope="subtask"
            />

            {/* Save Group as Blueprint Modal */}
            <Dialog open={!!blueprintGroup} onOpenChange={(open) => !open && setBlueprintGroup(null)}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleSaveGroupAsBlueprint}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Layers className="h-5 w-5 text-indigo-500" />
                                Save Group as Workflow Blueprint
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-3">
                            <div>
                                <Label htmlFor="bp-title">Blueprint Title</Label>
                                <Input
                                    id="bp-title"
                                    value={blueprintTitle}
                                    onChange={(e) => setBlueprintTitle(e.target.value)}
                                    placeholder="e.g. Video Production Batch"
                                    required
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="bp-category">Category</Label>
                                <select
                                    id="bp-category"
                                    value={blueprintCategory}
                                    onChange={(e) => setBlueprintCategory(e.target.value)}
                                    className="border-border bg-background mt-1 w-full rounded-xl border p-2 text-xs"
                                >
                                    <option value="production">Production & Video</option>
                                    <option value="design">Design & Creative</option>
                                    <option value="marketing">Marketing Campaign</option>
                                    <option value="development">Engineering & Sprints</option>
                                    <option value="operations">Operations & General</option>
                                </select>
                            </div>

                            <div>
                                <Label htmlFor="bp-desc">Description</Label>
                                <textarea
                                    id="bp-desc"
                                    rows={2}
                                    value={blueprintDesc}
                                    onChange={(e) => setBlueprintDesc(e.target.value)}
                                    placeholder="Brief summary of workflow stages and tasks in this blueprint..."
                                    className="border-border bg-background mt-1 w-full rounded-xl border p-2 text-xs"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setBlueprintGroup(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSavingBlueprint} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {isSavingBlueprint ? 'Saving...' : 'Save Blueprint'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
