import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import React, { useEffect, useState } from 'react';
import AddColumnModal from './components/AddColumnModal';
import AutomationCenterModal from './components/AutomationCenterModal';
import BoardHeader from './components/BoardHeader';
import BoardUnifiedHeader from './components/BoardUnifiedHeader';
import CalendarView from './components/CalendarView';
import ChartView from './components/ChartView';
import FilesView from './components/FilesView';
import GalleryView from './components/GalleryView';
import GanttView from './components/GanttView';
import ItemDetailDrawer from './components/ItemDetailDrawer';
import KanbanBoardView from './components/KanbanBoardView';
import TableView from './components/TableView';
import WorkflowBlueprintModal from './components/WorkflowBlueprintModal';
import WorkflowSettingsModal from './components/WorkflowSettingsModal';
import WorkloadView from './components/WorkloadView';
import { AlertCircle, X } from 'lucide-react';
import { KanbanBoard, KanbanPageProps, Task } from './types';
import { getEcho } from '@/echo';

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
    selectedTaskNotFound = false,
    mirroredValues = {},
    permissions,
}: KanbanPageProps) {
    const userPermissions = permissions || {
        canView: true,
        canCreateTask: true,
        canEditTask: true,
        canEditProgress: true,
        canChangeStatus: true,
        canAssignUsers: true,
        canChangeDeadlines: true,
        canChangePriority: true,
        canDeleteTask: true,
        canViewAllTasks: true,
        canFilterPersonalTasks: true,
        canManageBoard: true,
        canManageColumns: true,
        canManageViews: true,
        canManageGroups: true,
        canManageAutomations: true,
        canManageBlueprints: true,
        canManageDependencies: true,
        canManageRecurrence: true,
        canApproveReview: true,
        canExport: true,
    };

    const initialBoard: KanbanBoard = activeBoard ||
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

    const [currentBoard, setCurrentBoard] = useState<KanbanBoard>(initialBoard);

    useEffect(() => {
        if (activeBoard) {
            setCurrentBoard(activeBoard);
        } else if (boards && boards.length > 0) {
            setCurrentBoard(boards[0]);
        }
    }, [activeBoard, boards]);

    const board = currentBoard;

    const { auth } = usePage<any>().props;
    const currentUser = auth?.user;

    // View & Filter states: select by unique view ID (P1-02), persisted in ?view= (P2-03)
    const boardViews = board.views ?? [];
    const resolveInitialViewId = (): number | null => {
        if (typeof window !== 'undefined') {
            const fromUrl = Number(new URLSearchParams(window.location.search).get('view'));
            if (fromUrl && boardViews.some((v) => v.id === fromUrl)) return fromUrl;
        }
        const fallback = boardViews.find((v) => v.is_default) ?? boardViews[0];
        return fallback?.id ?? null;
    };
    const [activeViewId, setActiveViewId] = useState<number | null>(() => resolveInitialViewId());
    const activeView = boardViews.find((v) => v.id === activeViewId) ?? boardViews[0] ?? null;
    const activeTab = activeView?.type ?? 'table';

    const handleViewSelect = (viewId: number) => {
        setActiveViewId(viewId);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('view', String(viewId));
            window.history.replaceState({}, '', url.toString());
        }
    };

    // Re-sync selection when the board changes or the active view disappears (deleted)
    useEffect(() => {
        if (boardViews.length === 0) return;
        if (activeViewId != null && boardViews.some((v) => v.id === activeViewId)) return;
        const next = boardViews.find((v) => v.is_default) ?? boardViews[0];
        if (next) handleViewSelect(next.id);
         
    }, [board.id, activeViewId, boardViews]);

    const [searchTerm, setSearchTerm] = useState('');

    // Role-based default person filter (Section 5)
    // Priority: URL query param (?person=...) -> localStorage -> permission default.
    // Management roles (workos.tasks.filter.any) default to 'all'; contributors
    // default to their own assigned tasks. Explicit selections always win.
    const defaultPersonFilter = userPermissions?.canViewAllTasks ? 'all' : 'me';

    const getInitialPersonFilter = (boardId?: number) => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const personParam = urlParams.get('person');
            if (personParam) return personParam;

            if (boardId) {
                const stored = localStorage.getItem(`angora_board_${boardId}_person_filter`);
                if (stored) return stored;
            }
        }
        return defaultPersonFilter;
    };

    const [personFilter, setPersonFilter] = useState<string>(() => getInitialPersonFilter(board.id));
    const [priorityFilter, setPriorityFilter] = useState('all');

    const handlePersonFilterChange = (val: string) => {
        setPersonFilter(val);
        if (typeof window !== 'undefined') {
            if (board.id) {
                localStorage.setItem(`angora_board_${board.id}_person_filter`, val);
            }
            const url = new URL(window.location.href);
            url.searchParams.set('person', val);
            window.history.replaceState({}, '', url.toString());
        }
    };

    // Keep URL parameter synchronized on initial mount without clobbering existing parameters like ?item=
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (!url.searchParams.has('person')) {
                url.searchParams.set('person', personFilter);
                window.history.replaceState({}, '', url.toString());
            }
        }
    }, [board.id, personFilter]);

    // Deep-linking: Initialize drawer if selectedTask was passed or from URL
    const [selectedTaskForDrawer, setSelectedTaskForDrawer] = useState<Task | null>(selectedTask);

    useEffect(() => {
        if (selectedTask) {
            setSelectedTaskForDrawer(selectedTask);
        }
    }, [selectedTask]);

    const initialDrawerTab = typeof window !== 'undefined'
        ? (new URLSearchParams(window.location.search).get('tab') as any) || undefined
        : undefined;

    const initialHighlightId = typeof window !== 'undefined'
        ? Number(new URLSearchParams(window.location.search).get('target_id') || new URLSearchParams(window.location.search).get('comment_id')) || null
        : null;

    const [taskNotFoundMessage, setTaskNotFoundMessage] = useState<string | null>(
        selectedTaskNotFound ? 'The requested task could not be found or you do not have permission to view it.' : null
    );

    useEffect(() => {
        if (selectedTaskNotFound) {
            setTaskNotFoundMessage('The requested task could not be found or you do not have permission to view it.');
            if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.delete('item');
                url.searchParams.delete('task_id');
                url.searchParams.delete('tab');
                url.searchParams.delete('target_id');
                url.searchParams.delete('comment_id');
                window.history.replaceState({}, '', url.toString());
            }
        }
    }, [selectedTaskNotFound]);

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
            url.searchParams.delete('task_id');
            url.searchParams.delete('tab');
            url.searchParams.delete('target_id');
            url.searchParams.delete('comment_id');
            window.history.pushState({}, '', url.toString());
        }
    };

    // Real-Time WebSockets Collaboration via Laravel Reverb (Phase 3)
    const [liveCollaborators, setLiveCollaborators] = useState<Array<{ id: number; name: string; avatar_url?: string | null; role?: string }>>([]);
    const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

    // Track recent client mutations to suppress duplicate echoes
    const recentLocalMutationsRef = React.useRef<Map<number, number>>(new Map());

    const isRecentLocalMutation = (taskId: number): boolean => {
        const timestamp = recentLocalMutationsRef.current.get(taskId);
        if (!timestamp) return false;
        return Date.now() - timestamp < 8000;
    };

    // Direct in-memory board state updater for 0ms multi-user synchronization
    const applyTaskUpdateToBoard = (prev: KanbanBoard, event: any): KanbanBoard => {
        const taskId = Number(event.task_id);
        const targetColumnId = event.column_id != null ? Number(event.column_id) : null;
        const targetGroupId = event.group_id != null ? Number(event.group_id) : null;

        // 1. Locate existing task across columns and groups
        let existingTask: Task | null = null;
        for (const col of prev.columns || []) {
            const found = (col.tasks || []).find((t) => t.id === taskId);
            if (found) {
                existingTask = found;
                break;
            }
        }
        if (!existingTask) {
            for (const grp of prev.groups || []) {
                const found = (grp.tasks || []).find((t) => t.id === taskId);
                if (found) {
                    existingTask = found;
                    break;
                }
            }
        }

        const destCol = targetColumnId != null ? (prev.columns || []).find((c) => c.id === targetColumnId) : null;
        const destColTitle = destCol?.title || event.status || existingTask?.status || '';

        const updatedTask: Task = {
            ...(existingTask || {
                id: taskId,
                board_id: Number(event.board_id || prev.id),
                title: event.title || 'Untitled task',
                priority: event.priority || 'Medium',
                created_at: event.timestamp || new Date().toISOString(),
                updated_at: event.timestamp || new Date().toISOString(),
                comments_count: 0,
                attachments_count: 0,
                subitems: [],
                comments: [],
                attachments: [],
                assignee: null,
                progress: 0,
                created_by: Number(event.created_by || event.updated_by || 1),
                position: 0,
            }),
            title: event.title ?? existingTask?.title ?? 'Untitled task',
            column_id: targetColumnId != null ? targetColumnId : (existingTask?.column_id ?? 0),
            group_id: targetGroupId != null ? targetGroupId : (existingTask?.group_id !== undefined ? existingTask.group_id : undefined),
            parent_id: event.parent_id !== undefined ? event.parent_id : existingTask?.parent_id ?? null,
            status: destColTitle,
            priority: event.priority ?? existingTask?.priority ?? 'Medium',
            due_date: event.due_date !== undefined ? event.due_date : existingTask?.due_date ?? null,
            completed_at: event.completed_at !== undefined ? event.completed_at : existingTask?.completed_at ?? null,
            position: event.position !== undefined ? event.position : existingTask?.position ?? 0,
            column: destCol ? destCol : existingTask?.column,
        };

        const updatedColumns = (prev.columns || []).map((col) => {
            const filteredTasks = (col.tasks || []).filter((t) => t.id !== taskId);
            if (targetColumnId != null && col.id === targetColumnId) {
                const newTasks = [...filteredTasks];
                if (typeof event.position === 'number' && event.position >= 0 && event.position < newTasks.length) {
                    newTasks.splice(event.position, 0, updatedTask);
                } else {
                    newTasks.push(updatedTask);
                }
                return { ...col, tasks: newTasks };
            }
            return { ...col, tasks: filteredTasks };
        });

        const updatedGroups = (prev.groups || []).map((grp) => {
            const filteredTasks = (grp.tasks || []).filter((t) => t.id !== taskId);
            if (targetGroupId != null && grp.id === targetGroupId) {
                return { ...grp, tasks: [...filteredTasks, updatedTask] };
            }
            if (targetGroupId == null && existingTask && existingTask.group_id === grp.id) {
                return { ...grp, tasks: [...filteredTasks, updatedTask] };
            }
            return { ...grp, tasks: filteredTasks };
        });

        return {
            ...prev,
            columns: updatedColumns,
            groups: updatedGroups,
        };
    };

    const applyTaskDeletionToBoard = (prev: KanbanBoard, taskId: number): KanbanBoard => {
        return {
            ...prev,
            columns: (prev.columns || []).map((col) => ({
                ...col,
                tasks: (col.tasks || []).filter((t) => t.id !== taskId),
            })),
            groups: (prev.groups || []).map((grp) => ({
                ...grp,
                tasks: (grp.tasks || []).filter((t) => t.id !== taskId),
            })),
        };
    };

    const handleLocalTaskMove = (taskId: number, targetColumnId: number) => {
        recentLocalMutationsRef.current.set(taskId, Date.now());
        setTimeout(() => {
            recentLocalMutationsRef.current.delete(taskId);
        }, 10000);
        setCurrentBoard((prev) => applyTaskUpdateToBoard(prev, { task_id: taskId, column_id: targetColumnId }));
    };

    const reconcileSync = async () => {
        if (!board.id) return;
        try {
            const url = new URL('/kanban/sync', window.location.origin);
            url.searchParams.set('board_id', String(board.id));
            const res = await fetch(url.toString(), {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.tasks && data.tasks.length > 0) {
                    router.reload({ only: ['activeBoard', 'boards'] });
                }
            }
        } catch {
            // ignore network errors
        }
    };

    useEffect(() => {
        if (!board.id) return;
        const echo = getEcho();
        if (!echo) return;

        // Monitor connection state
        let pusherConn: any = null;
        let onStateChange: any = null;
        if ((echo as any).connector?.pusher?.connection) {
            pusherConn = (echo as any).connector.pusher.connection;
            setIsWsConnected(pusherConn.state === 'connected');

            onStateChange = (states: { previous: string; current: string }) => {
                const connected = states.current === 'connected';
                setIsWsConnected(connected);
                if (connected && states.previous !== 'connected') {
                    // Reconnected after drop: reconcile missed changes without flashing
                    reconcileSync();
                }
            };
            pusherConn.bind('state_change', onStateChange);
        }

        // 1. Private board channel for direct mutation handling
        const boardChannel = echo.private(`boards.${board.id}`);

        const handleTaskUpdated = (event: any) => {
            if (Number(event?.board_id) !== Number(board.id)) return;
            // Suppress duplicate echo if initiated by this user
            if (event?.updated_by && currentUser?.id && Number(event.updated_by) === Number(currentUser.id)) {
                return;
            }
            if (event?.task_id && isRecentLocalMutation(Number(event.task_id))) {
                return;
            }

            // Direct in-memory board update for other connected clients
            setCurrentBoard((prev) => applyTaskUpdateToBoard(prev, event));

            // Sync drawer if currently open on this task
            if (selectedTaskForDrawer && Number(selectedTaskForDrawer.id) === Number(event.task_id)) {
                const destCol = (board.columns || []).find((c) => c.id === Number(event.column_id));
                setSelectedTaskForDrawer((prevDrawer) => {
                    if (!prevDrawer) return null;
                    return {
                        ...prevDrawer,
                        column_id: event.column_id != null ? Number(event.column_id) : prevDrawer.column_id,
                        group_id: event.group_id != null ? Number(event.group_id) : prevDrawer.group_id,
                        title: event.title ?? prevDrawer.title,
                        status: destCol?.title ?? event.status ?? prevDrawer.status,
                        priority: event.priority ?? prevDrawer.priority,
                        due_date: event.due_date !== undefined ? event.due_date : prevDrawer.due_date,
                        completed_at: event.completed_at !== undefined ? event.completed_at : prevDrawer.completed_at,
                    };
                });
            }
        };

        const handleTaskCreated = (event: any) => {
            if (Number(event?.board_id) !== Number(board.id)) return;
            if (event?.created_by && currentUser?.id && Number(event.created_by) === Number(currentUser.id)) {
                return;
            }
            setCurrentBoard((prev) => applyTaskUpdateToBoard(prev, event));
        };

        const handleTaskDeleted = (event: any) => {
            if (Number(event?.board_id) !== Number(board.id)) return;
            const taskId = Number(event?.task_id);
            setCurrentBoard((prev) => applyTaskDeletionToBoard(prev, taskId));
            if (selectedTaskForDrawer && Number(selectedTaskForDrawer.id) === taskId) {
                setSelectedTaskForDrawer(null);
            }
        };

        const handleColumnUpdated = (event: any) => {
            if (Number(event?.board_id) !== Number(board.id)) return;
            router.reload({
                only: ['activeBoard', 'boards'],
            });
        };

        boardChannel
            .listen('.task.created', handleTaskCreated)
            .listen('.task.updated', handleTaskUpdated)
            .listen('.task.deleted', handleTaskDeleted)
            .listen('.column.updated', handleColumnUpdated);

        // 2. Presence channel for live collaborator presence
        const presenceChannel = echo.join(`boards.${board.id}`);
        presenceChannel
            .here((collaborators: any[]) => {
                setLiveCollaborators(collaborators || []);
            })
            .joining((user: any) => {
                setLiveCollaborators((prev) => [...prev.filter((u) => u.id !== user.id), user]);
            })
            .leaving((user: any) => {
                setLiveCollaborators((prev) => prev.filter((u) => u.id !== user.id));
            });

        return () => {
            if (pusherConn && onStateChange) {
                pusherConn.unbind('state_change', onStateChange);
            }
            boardChannel.stopListening('.task.created');
            boardChannel.stopListening('.task.updated');
            boardChannel.stopListening('.task.deleted');
            boardChannel.stopListening('.column.updated');
            echo.leave(`boards.${board.id}`);
        };
    }, [board.id]);

    // Polling Synchronization (Graceful HTTP fallback ONLY when WebSockets disconnect)
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
            // When WebSocket is actively connected, pause fallback polling entirely!
            if (isWsConnected || document.hidden || isPolling || !isMounted) {
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

                    // If changes detected on current active board, reconcile board state
                    if (data.tasks && data.tasks.length > 0) {
                        router.reload({
                            only: ['activeBoard', 'boards'],
                        });
                    }
                } else {
                    currentIntervalMs = Math.min(currentIntervalMs * 1.5, 60000);
                }
            } catch (err) {
                currentIntervalMs = Math.min(currentIntervalMs * 1.5, 60000);
            } finally {
                isPolling = false;
                scheduleNext(currentIntervalMs);
            }
        };

        scheduleNext(15000);

        const handleVisibilityChange = () => {
            if (!document.hidden && isMounted && !isWsConnected) {
                runPoll();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isMounted = false;
            if (timerId) clearTimeout(timerId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [board.id, isWsConnected]);

    // Modals
    const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
    const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
    const [isNewColumnModalOpen, setIsNewColumnModalOpen] = useState(false);
    const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
    const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
    const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);

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
        <AppLayout breadcrumbs={breadcrumbs} hideHeader={true}>
            <Head title={`${board.title || 'Work OS'} — Angora Work OS`} />

            <div className={`flex flex-col min-h-0 w-full ${activeTab === 'kanban' ? 'h-svh md:h-[calc(100svh-1.5rem)] max-h-svh md:max-h-[calc(100svh-1.5rem)] overflow-hidden' : 'min-h-full'}`}>
                {/* 1. Consolidated Two-Level Compact Header (Level 1 + Level 2) */}
                <BoardUnifiedHeader
                    workspaces={workspaces}
                    activeWorkspace={activeWorkspace}
                    boards={boards}
                    activeBoard={board}
                    users={users}
                    activeViewId={activeView?.id ?? null}
                    onViewSelect={handleViewSelect}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    personFilter={personFilter}
                    onPersonFilterChange={handlePersonFilterChange}
                    priorityFilter={priorityFilter}
                    onPriorityFilterChange={setPriorityFilter}
                    permissions={userPermissions}
                    onOpenNewTask={() => setIsNewTaskModalOpen(true)}
                    onOpenNewGroup={() => setIsNewGroupModalOpen(true)}
                    onOpenNewColumn={() => setIsNewColumnModalOpen(true)}
                    onOpenAutomate={() => setIsAutomationModalOpen(true)}
                    onOpenBlueprints={() => setIsBlueprintModalOpen(true)}
                    onOpenWorkflow={() => setIsWorkflowModalOpen(true)}
                />

                {/* Alert when requested deep-linked task is unavailable/denied */}
                {taskNotFoundMessage && (
                    <div className="mx-4 mt-3 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                            <span>{taskNotFoundMessage}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTaskNotFoundMessage(null)}
                            className="rounded p-1 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 cursor-pointer"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                {/* 2. Main Views Container */}
                <div className={`flex-1 min-h-0 w-full ${activeTab === 'kanban' ? 'overflow-hidden p-3 sm:p-4 flex flex-col' : 'p-4 md:p-6 overflow-auto'}`}>
                    {activeTab === 'table' && (
                    <TableView
                        key={`view-${activeView?.id ?? 'table'}`}
                        board={board}
                        viewId={activeView?.id ?? null}
                        viewSettings={activeView?.settings ?? null}
                        searchTerm={searchTerm}
                        personFilter={personFilter}
                        priorityFilter={priorityFilter}
                        users={users}
                        currentUser={currentUser}
                        mirroredValues={mirroredValues}
                        permissions={userPermissions}
                        onSelectTask={handleOpenTask}
                        onOpenNewColumn={() => setIsNewColumnModalOpen(true)}
                    />
                )}

                {activeTab === 'kanban' && (
                    <div key={`view-${activeView?.id ?? 'kanban'}`} className="flex-1 min-h-0 overflow-hidden">
                        <KanbanBoardView
                            board={board}
                            viewSettings={activeView?.settings ?? null}
                            searchTerm={searchTerm}
                            personFilter={personFilter}
                            priorityFilter={priorityFilter}
                            users={users}
                            currentUser={currentUser}
                            permissions={userPermissions}
                            onSelectTask={handleOpenTask}
                            onQuickAddTask={handleQuickAddKanban}
                            onTaskMoveOptimistic={handleLocalTaskMove}
                        />
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <CalendarView
                        key={`view-${activeView?.id ?? 'calendar'}`}
                        board={board}
                        viewSettings={activeView?.settings ?? null}
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
                        key={`view-${activeView?.id ?? 'gantt'}`}
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
                        key={`view-${activeView?.id ?? 'workload'}`}
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
                        key={`view-${activeView?.id ?? 'chart'}`}
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
                        key={`view-${activeView?.id ?? 'files'}`}
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
                        key={`view-${activeView?.id ?? 'gallery'}`}
                        board={board}
                        searchTerm={searchTerm}
                        personFilter={personFilter}
                        priorityFilter={priorityFilter}
                        users={users}
                        onSelectTask={handleOpenTask}
                    />
                )}
                </div>
            </div>

            {/* Slide-out / Centered Item Details & Collaboration Overlay */}
            {selectedTaskForDrawer && (
                <ItemDetailDrawer
                    task={selectedTaskForDrawer}
                    board={board}
                    users={users}
                    permissions={userPermissions}
                    onClose={handleCloseDrawer}
                    onSelectTask={handleOpenTask}
                    initialTab={initialDrawerTab}
                    targetHighlightId={initialHighlightId}
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

            {/* Workflow Settings Modal */}
            <WorkflowSettingsModal board={board} isOpen={isWorkflowModalOpen} onClose={() => setIsWorkflowModalOpen(false)} />

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
