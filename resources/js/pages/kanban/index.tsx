import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import React, { useEffect, useState } from 'react';
import AddColumnModal from './components/AddColumnModal';
import AutomationCenterModal from './components/AutomationCenterModal';
import BoardHeader from './components/BoardHeader';
import CalendarView from './components/CalendarView';
import ChartView from './components/ChartView';
import FilesView from './components/FilesView';
import GalleryView from './components/GalleryView';
import GanttView from './components/GanttView';
import ItemDetailDrawer from './components/ItemDetailDrawer';
import KanbanBoardView from './components/KanbanBoardView';
import TableView from './components/TableView';
import WorkflowBlueprintModal from './components/WorkflowBlueprintModal';
import WorkloadView from './components/WorkloadView';
import WorkspaceBoardNav from './components/WorkspaceBoardNav';
import { KanbanBoard, KanbanPageProps, Task } from './types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Workspaces', href: '/dashboard' },
    { title: 'Board Management', href: '/kanban' },
];

export default function KanbanPage({
    workspaces = [],
    activeWorkspace,
    boards = [],
    activeBoard,
    users = [],
    selectedTask = null,
    mirroredValues = {},
}: KanbanPageProps) {
    const board: KanbanBoard = activeBoard ||
        boards[0] || {
            id: 0,
            title: 'Board',
            department: 'Operations',
            visibility: 'public',
            is_favorite: false,
            is_template: false,
            created_by: 1,
            columns: [],
            groups: [],
        };

    // View & Filter states: detect default view from board or fallback
    const defaultViewType = board.views?.find((v) => v.is_default)?.type || 'table';
    const [activeTab, setActiveTab] = useState<string>(defaultViewType);
    const [searchTerm, setSearchTerm] = useState('');
    const [personFilter, setPersonFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');

    // Deep-linking: Initialize drawer if selectedTask was passed or from URL
    const [selectedTaskForDrawer, setSelectedTaskForDrawer] = useState<Task | null>(selectedTask);

    useEffect(() => {
        if (selectedTask) {
            setSelectedTaskForDrawer(selectedTask);
        }
    }, [selectedTask]);

    const handleOpenTask = (task: Task) => {
        setSelectedTaskForDrawer(task);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('item', String(task.id));
            window.history.pushState({}, '', url.toString());
        }
    };

    const handleCloseDrawer = () => {
        setSelectedTaskForDrawer(null);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('item');
            window.history.pushState({}, '', url.toString());
        }
    };

    // Polling Synchronization (Phase 3.5)
    // Runs incrementally without re-rendering or disrupting user typing
    useEffect(() => {
        if (!board.id) return;

        let cursor: string | null = null;
        let isPolling = false;
        let currentIntervalMs = 15000;
        let timerId: ReturnType<typeof setTimeout> | null = null;
        let isMounted = true;

        const scheduleNext = (delayMs: number) => {
            if (!isMounted) return;
            if (timerId) clearTimeout(timerId);
            timerId = setTimeout(runPoll, delayMs);
        };

        const runPoll = async () => {
            // Pause polling when browser tab is hidden to conserve resources
            if (document.hidden || isPolling || !isMounted) {
                scheduleNext(currentIntervalMs);
                return;
            }

            try {
                isPolling = true;
                const url = new URL('/kanban/sync', window.location.origin);
                url.searchParams.set('board_id', String(board.id));
                if (cursor) {
                    url.searchParams.set('since', cursor);
                }

                const res = await fetch(url.toString(), {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.cursor) {
                        cursor = data.cursor;
                    }

                    // Reset backoff to base 15s on success
                    currentIntervalMs = 15000;

                    // If changes detected on current active board, trigger lightweight Inertia reload for board only
                    if (data.tasks && data.tasks.length > 0) {
                        router.reload({
                            only: ['activeBoard', 'boards'],
                        });
                    }
                } else {
                    // Backoff on non-OK response (up to 60s)
                    currentIntervalMs = Math.min(currentIntervalMs * 1.5, 60000);
                }
            } catch (err) {
                // Backoff on network drop (up to 60s)
                currentIntervalMs = Math.min(currentIntervalMs * 1.5, 60000);
            } finally {
                isPolling = false;
                scheduleNext(currentIntervalMs);
            }
        };

        // Start polling cycle
        scheduleNext(15000);

        // Resume immediately when returning to tab
        const handleVisibilityChange = () => {
            if (!document.hidden && isMounted) {
                runPoll();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isMounted = false;
            if (timerId) clearTimeout(timerId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [board.id]);

    // Modals
    const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
    const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
    const [isNewColumnModalOpen, setIsNewColumnModalOpen] = useState(false);
    const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
    const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);

    // New Task Form
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
    const [newTaskStartDate, setNewTaskStartDate] = useState('');
    const [newTaskStartTime, setNewTaskStartTime] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskDueTime, setNewTaskDueTime] = useState('');
    const [newTaskIsMilestone, setNewTaskIsMilestone] = useState(false);
    const [newTaskReminderLead, setNewTaskReminderLead] = useState<string>('');
    const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
    const [newTaskGroupId, setNewTaskGroupId] = useState<number | ''>(board.groups?.[0]?.id || '');
    const [newTaskColumnId, setNewTaskColumnId] = useState<number | ''>(board.columns?.[0]?.id || '');

    // New Group Form
    const [newGroupTitle, setNewGroupTitle] = useState('');
    const [newGroupColor, setNewGroupColor] = useState('#579BFC');

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !board.id) return;

        router.post(
            '/kanban/tasks',
            {
                board_id: board.id,
                group_id: newTaskGroupId || undefined,
                column_id: newTaskColumnId || undefined,
                title: newTaskTitle.trim(),
                description: newTaskDesc.trim() || undefined,
                priority: newTaskPriority,
                start_date: newTaskStartDate || undefined,
                start_time: newTaskStartTime || undefined,
                due_date: newTaskDueDate || undefined,
                due_time: newTaskDueTime || undefined,
                is_milestone: newTaskIsMilestone,
                reminder_lead_minutes: newTaskReminderLead ? Number(newTaskReminderLead) : undefined,
                assigned_to: newTaskAssignee ? Number(newTaskAssignee) : undefined,
            },
            {
                onSuccess: () => {
                    setIsNewTaskModalOpen(false);
                    setNewTaskTitle('');
                    setNewTaskDesc('');
                    setNewTaskStartDate('');
                    setNewTaskStartTime('');
                    setNewTaskDueDate('');
                    setNewTaskDueTime('');
                    setNewTaskIsMilestone(false);
                    setNewTaskReminderLead('');
                },
            },
        );
    };

    const handleCreateGroup = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupTitle.trim() || !board.id) return;

        router.post(
            `/kanban/boards/${board.id}/groups`,
            {
                title: newGroupTitle.trim(),
                color: newGroupColor,
            },
            {
                onSuccess: () => {
                    setIsNewGroupModalOpen(false);
                    setNewGroupTitle('');
                },
            },
        );
    };

    const handleQuickAddKanban = (columnId: number) => {
        setNewTaskColumnId(columnId);
        setIsNewTaskModalOpen(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${board.title || 'Work OS'} — Angora Work OS`} />

            <div className={`max-w-full space-y-4 p-4 md:p-6 ${activeTab === 'kanban' ? 'h-[calc(100vh-64px)] flex flex-col min-h-0 overflow-hidden' : 'overflow-hidden'}`}>
                {/* 1. Workspace & Board Navigator */}
                <div className="shrink-0">
                    <WorkspaceBoardNav workspaces={workspaces} activeWorkspace={activeWorkspace} boards={boards} activeBoard={board} users={users} />
                </div>

                {/* 2. Board Header Toolbar */}
                <div className="shrink-0">
                    <BoardHeader
                        board={board}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        personFilter={personFilter}
                        onPersonFilterChange={setPersonFilter}
                        priorityFilter={priorityFilter}
                        onPriorityFilterChange={setPriorityFilter}
                        users={users}
                        onOpenNewTask={() => setIsNewTaskModalOpen(true)}
                        onOpenNewGroup={() => setIsNewGroupModalOpen(true)}
                        onOpenNewColumn={() => setIsNewColumnModalOpen(true)}
                        onOpenAutomate={() => setIsAutomationModalOpen(true)}
                        onOpenBlueprints={() => setIsBlueprintModalOpen(true)}
                    />
                </div>

                {/* 3. Main Views */}
                {activeTab === 'table' && (
                    <TableView
                        board={board}
                        searchTerm={searchTerm}
                        personFilter={personFilter}
                        priorityFilter={priorityFilter}
                        users={users}
                        mirroredValues={mirroredValues}
                        onSelectTask={handleOpenTask}
                        onOpenNewColumn={() => setIsNewColumnModalOpen(true)}
                    />
                )}

                {activeTab === 'kanban' && (
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <KanbanBoardView
                            board={board}
                            searchTerm={searchTerm}
                            personFilter={personFilter}
                            priorityFilter={priorityFilter}
                            users={users}
                            onSelectTask={handleOpenTask}
                            onQuickAddTask={handleQuickAddKanban}
                        />
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <CalendarView
                        board={board}
                        searchTerm={searchTerm}
                        personFilter={personFilter}
                        priorityFilter={priorityFilter}
                        users={users}
                        onSelectTask={handleOpenTask}
                        onQuickAddTask={(dateStr) => {
                            setNewTaskDueDate(dateStr);
                            setIsNewTaskModalOpen(true);
                        }}
                        onRescheduleTask={(taskId, newDate) => {
                            router.patch(`/kanban/tasks/${taskId}/schedule`, {
                                due_date: newDate,
                            });
                        }}
                    />
                )}

                {(activeTab === 'gantt' || activeTab === 'timeline') && (
                    <GanttView
                        board={board}
                        searchTerm={searchTerm}
                        personFilter={personFilter}
                        priorityFilter={priorityFilter}
                        users={users}
                        onSelectTask={handleOpenTask}
                    />
                )}

                {activeTab === 'workload' && (
                    <WorkloadView
                        board={board}
                        searchTerm={searchTerm}
                        personFilter={personFilter}
                        priorityFilter={priorityFilter}
                        users={users}
                        onSelectTask={handleOpenTask}
                    />
                )}

                {activeTab === 'chart' && (
                    <ChartView
                        board={board}
                        searchTerm={searchTerm}
                        personFilter={personFilter}
                        priorityFilter={priorityFilter}
                        users={users}
                        onSelectTask={handleOpenTask}
                    />
                )}

                {activeTab === 'files' && (
                    <FilesView
                        board={board}
                        searchTerm={searchTerm}
                        personFilter={personFilter}
                        priorityFilter={priorityFilter}
                        users={users}
                        onSelectTask={handleOpenTask}
                    />
                )}

                {activeTab === 'gallery' && (
                    <GalleryView
                        board={board}
                        searchTerm={searchTerm}
                        personFilter={personFilter}
                        priorityFilter={priorityFilter}
                        users={users}
                        onSelectTask={handleOpenTask}
                    />
                )}
            </div>

            {/* Slide-out / Centered Item Details & Collaboration Overlay */}
            {selectedTaskForDrawer && (
                <ItemDetailDrawer
                    task={selectedTaskForDrawer}
                    board={board}
                    users={users}
                    onClose={handleCloseDrawer}
                    onSelectTask={handleOpenTask}
                />
            )}

            {/* Dynamic Column Modal */}
            <AddColumnModal board={board} isOpen={isNewColumnModalOpen} onClose={() => setIsNewColumnModalOpen(false)} />

            {/* Automation Center Modal */}
            <AutomationCenterModal board={board} isOpen={isAutomationModalOpen} onClose={() => setIsAutomationModalOpen(false)} users={users} />

            {/* Workflow Blueprints Modal */}
            <WorkflowBlueprintModal
                isOpen={isBlueprintModalOpen}
                onClose={() => setIsBlueprintModalOpen(false)}
                board={board}
                groups={board.groups || []}
                users={users}
            />

            {/* New Group Modal */}
            <Dialog open={isNewGroupModalOpen} onOpenChange={setIsNewGroupModalOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleCreateGroup}>
                        <DialogHeader>
                            <DialogTitle>Add New Group to {board.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="group-title">Group Title</Label>
                                <Input
                                    id="group-title"
                                    placeholder="e.g. Q4 Sprints, Production Batches, Research"
                                    value={newGroupTitle}
                                    onChange={(e) => setNewGroupTitle(e.target.value)}
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Group Color</Label>
                                <div className="mt-2 flex items-center gap-2">
                                    {['#579BFC', '#A25DDC', '#00C875', '#FDAB3D', '#E2445C', '#0086C0', '#FF642E', '#784BD1'].map((hex) => (
                                        <button
                                            type="button"
                                            key={hex}
                                            onClick={() => setNewGroupColor(hex)}
                                            className={`h-6 w-6 rounded-full border-2 transition-all ${
                                                newGroupColor === hex ? 'border-foreground scale-110' : 'border-transparent'
                                            }`}
                                            style={{ backgroundColor: hex }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsNewGroupModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Create Group</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* New Task / Item Modal */}
            <Dialog open={isNewTaskModalOpen} onOpenChange={setIsNewTaskModalOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleCreateTask}>
                        <DialogHeader>
                            <DialogTitle>Create New Item</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3.5 py-4">
                            <div>
                                <Label htmlFor="task-title">Item Title</Label>
                                <Input
                                    id="task-title"
                                    placeholder="What needs to be done?"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    required
                                    className="mt-1"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Group</Label>
                                    <Select value={String(newTaskGroupId)} onValueChange={(val) => setNewTaskGroupId(Number(val))}>
                                        <SelectTrigger className="mt-1 text-xs">
                                            <SelectValue placeholder="Select Group" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {board.groups?.map((g) => (
                                                <SelectItem key={g.id} value={String(g.id)}>
                                                    {g.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Stage / Column</Label>
                                    <Select value={String(newTaskColumnId)} onValueChange={(val) => setNewTaskColumnId(Number(val))}>
                                        <SelectTrigger className="mt-1 text-xs">
                                            <SelectValue placeholder="Select Column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {board.columns?.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>
                                                    {c.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Assignee</Label>
                                    <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                                        <SelectTrigger className="mt-1 text-xs">
                                            <SelectValue placeholder="Unassigned" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map((u) => (
                                                <SelectItem key={u.id} value={String(u.id)}>
                                                    {u.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Priority</Label>
                                    <Select value={newTaskPriority} onValueChange={(val: any) => setNewTaskPriority(val)}>
                                        <SelectTrigger className="mt-1 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Low">Low</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="High">High</SelectItem>
                                            <SelectItem value="Urgent">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="task-start">Start Date</Label>
                                    <Input
                                        id="task-start"
                                        type="date"
                                        value={newTaskStartDate}
                                        onChange={(e) => setNewTaskStartDate(e.target.value)}
                                        className="mt-1 text-xs"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="task-start-time">Start Time</Label>
                                    <Input
                                        id="task-start-time"
                                        type="time"
                                        value={newTaskStartTime}
                                        onChange={(e) => setNewTaskStartTime(e.target.value)}
                                        className="mt-1 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="task-due">Due Date</Label>
                                    <Input
                                        id="task-due"
                                        type="date"
                                        value={newTaskDueDate}
                                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                                        className="mt-1 text-xs"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="task-due-time">Due Time</Label>
                                    <Input
                                        id="task-due-time"
                                        type="time"
                                        value={newTaskDueTime}
                                        onChange={(e) => setNewTaskDueTime(e.target.value)}
                                        className="mt-1 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-1">
                                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newTaskIsMilestone}
                                        onChange={(e) => setNewTaskIsMilestone(e.target.checked)}
                                        className="rounded border-border text-primary focus:ring-primary"
                                    />
                                    <span>Milestone Item</span>
                                </label>

                                <div className="flex items-center gap-2">
                                    <Label htmlFor="task-reminder" className="text-xs">Alert:</Label>
                                    <select
                                        id="task-reminder"
                                        value={newTaskReminderLead}
                                        onChange={(e) => setNewTaskReminderLead(e.target.value)}
                                        className="border-border bg-background h-8 rounded-xl border px-2 text-xs"
                                    >
                                        <option value="">No reminder</option>
                                        <option value="0">At deadline</option>
                                        <option value="5">5 mins before</option>
                                        <option value="15">15 mins before</option>
                                        <option value="30">30 mins before</option>
                                        <option value="60">1 hour before</option>
                                        <option value="1440">1 day before</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="task-desc">Description</Label>
                                <textarea
                                    id="task-desc"
                                    rows={2}
                                    placeholder="Optional details..."
                                    value={newTaskDesc}
                                    onChange={(e) => setNewTaskDesc(e.target.value)}
                                    className="bg-background border-border focus:ring-primary mt-1 w-full rounded-xl border p-2 text-xs focus:ring-1 focus:outline-none"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsNewTaskModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Create Item</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
