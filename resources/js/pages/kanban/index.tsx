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

    // Modals
    const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
    const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
    const [isNewColumnModalOpen, setIsNewColumnModalOpen] = useState(false);
    const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);

    // New Task Form
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskDueTime, setNewTaskDueTime] = useState('');
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
                due_date: newTaskDueDate || undefined,
                due_time: newTaskDueTime || undefined,
                assigned_to: newTaskAssignee ? Number(newTaskAssignee) : undefined,
            },
            {
                onSuccess: () => {
                    setIsNewTaskModalOpen(false);
                    setNewTaskTitle('');
                    setNewTaskDesc('');
                    setNewTaskDueDate('');
                    setNewTaskDueTime('');
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

            <div className="max-w-full space-y-4 overflow-hidden p-4 md:p-6">
                {/* 1. Workspace & Board Navigator */}
                <WorkspaceBoardNav workspaces={workspaces} activeWorkspace={activeWorkspace} boards={boards} activeBoard={board} users={users} />

                {/* 2. Board Header Toolbar */}
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
                />

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
                    <KanbanBoardView
                        board={board}
                        searchTerm={searchTerm}
                        personFilter={personFilter}
                        priorityFilter={priorityFilter}
                        users={users}
                        onSelectTask={handleOpenTask}
                        onQuickAddTask={handleQuickAddKanban}
                    />
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
