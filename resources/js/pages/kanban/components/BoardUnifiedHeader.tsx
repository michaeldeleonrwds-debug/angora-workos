import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { NotificationCenterPopover } from '@/components/NotificationCenterPopover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { showToast } from '@/components/toast';
import { router } from '@inertiajs/react';
import {
    AlertCircle,
    BarChart3,
    Calendar,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    Columns3,
    Copy,
    Download,
    FileCode,
    FileSpreadsheet,
    Filter,
    Folder,
    GanttChartSquare,
    Layers,
    Layout,
    LayoutGrid,
    ListTodo,
    MoreHorizontal,
    MoreVertical,
    Paperclip,
    Pencil,
    Plus,
    Search,
    Settings,
    SlidersHorizontal,
    Star,
    Table2,
    Trash2,
    UserPlus,
    Users,
    Workflow,
    X,
    Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { BoardPermissions, BoardView, KanbanBoard, User, Workspace } from '../types';

interface BoardUnifiedHeaderProps {
    workspaces: Workspace[];
    activeWorkspace?: Workspace;
    boards: KanbanBoard[];
    activeBoard: KanbanBoard;
    users: User[];
    activeViewId: number | null;
    onViewSelect: (viewId: number) => void;
    searchTerm: string;
    onSearchChange: (val: string) => void;
    personFilter: string;
    onPersonFilterChange: (val: string) => void;
    priorityFilter: string;
    onPriorityFilterChange: (val: string) => void;
    permissions?: BoardPermissions;
    onOpenNewTask: () => void;
    onOpenNewGroup: () => void;
    onOpenNewColumn: () => void;
    onOpenAutomate?: () => void;
    onOpenBlueprints?: () => void;
    onOpenWorkflow?: () => void;
}

export default function BoardUnifiedHeader({
    workspaces = [],
    activeWorkspace,
    boards = [],
    activeBoard,
    users = [],
    activeViewId,
    onViewSelect,
    searchTerm,
    onSearchChange,
    personFilter,
    onPersonFilterChange,
    priorityFilter,
    onPriorityFilterChange,
    permissions,
    onOpenNewTask,
    onOpenNewGroup,
    onOpenNewColumn,
    onOpenAutomate,
    onOpenBlueprints,
    onOpenWorkflow,
}: BoardUnifiedHeaderProps) {
    // Dialog States
    const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
    const [isEditWorkspaceOpen, setIsEditWorkspaceOpen] = useState(false);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
    const [isAddViewModalOpen, setIsAddViewModalOpen] = useState(false);

    // Form States
    const [workspaceName, setWorkspaceName] = useState('');
    const [workspaceDesc, setWorkspaceDesc] = useState('');
    const [workspaceColor, setWorkspaceColor] = useState('#C8AEF5');

    const [boardTitle, setBoardTitle] = useState('');
    const [boardDesc, setBoardDesc] = useState('');
    const [boardFolderName, setBoardFolderName] = useState('');
    const [boardVisibility, setBoardVisibility] = useState<'public' | 'private' | 'shareable'>('public');

    const [newMemberUserId, setNewMemberUserId] = useState<string>('');
    const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member' | 'viewer'>('member');

    const [newViewName, setNewViewName] = useState('');
    const [newViewType, setNewViewType] = useState<string>('table');
    const [selectedFolder, setSelectedFolder] = useState<string>('all');

    const [isRenameViewOpen, setIsRenameViewOpen] = useState(false);
    const [renamingView, setRenamingView] = useState<BoardView | null>(null);
    const [renameViewName, setRenameViewName] = useState('');

    // Boards belonging to active workspace
    const currentWorkspaceBoards = boards.filter((b) => !b.workspace_id || b.workspace_id === activeWorkspace?.id);
    const availableFolders = Array.from(new Set(currentWorkspaceBoards.map((b) => b.folder_name).filter(Boolean) as string[]));
    const visibleBoards = currentWorkspaceBoards.filter((b) => {
        if (selectedFolder === 'all') return true;
        return b.folder_name === selectedFolder;
    });

    // Available Views, rendered in saved position order (P2-02 — no fixed type sort)
    const views: BoardView[] =
        activeBoard.views && activeBoard.views.length > 0
            ? [...activeBoard.views].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            : [
                  { id: 1, board_id: activeBoard.id, name: 'Main Table', type: 'table', is_default: true, is_system: true, position: 0 },
                  { id: 2, board_id: activeBoard.id, name: 'Kanban', type: 'kanban', is_default: false, is_system: true, position: 1 },
                  { id: 3, board_id: activeBoard.id, name: 'Calendar', type: 'calendar', is_default: false, is_system: true, position: 2 },
                  { id: 4, board_id: activeBoard.id, name: 'Gantt', type: 'gantt', is_default: false, is_system: true, position: 3 },
                  { id: 5, board_id: activeBoard.id, name: 'Workload', type: 'workload', is_default: false, is_system: true, position: 4 },
                  { id: 6, board_id: activeBoard.id, name: 'Chart', type: 'chart', is_default: false, is_system: true, position: 5 },
                  { id: 7, board_id: activeBoard.id, name: 'Files', type: 'files', is_default: false, is_system: true, position: 6 },
                  { id: 8, board_id: activeBoard.id, name: 'Gallery', type: 'gallery', is_default: false, is_system: true, position: 7 },
              ];

    const canManageViews = permissions?.canManageColumns !== false;
    const isViewDeletable = (v: BoardView) => !v.is_system && views.length > 1;
    const isViewReorderable = (v: BoardView) => !v.is_system;

    const getFormattedViewName = (v: BoardView) => {
        if (v.type === 'kanban') {
            return v.name === 'Kanban' ? 'Production Kanban' : v.name;
        }
        if (v.type === 'table') {
            return v.name === 'Table' ? 'Main Table' : v.name;
        }
        if (v.type === 'calendar') {
            return v.name === 'Calendar' ? 'Production Calendar' : v.name;
        }
        if (v.type === 'gantt' || v.type === 'timeline') {
            return v.name === 'Gantt' || v.name === 'Timeline' ? 'Timeline Overview' : v.name;
        }
        return v.name;
    };

    const getViewIcon = (type: string, className = 'h-3.5 w-3.5') => {
        switch (type) {
            case 'table':
                return <Table2 className={className} />;
            case 'kanban':
                return <Columns3 className={className} />;
            case 'calendar':
                return <Calendar className={className} />;
            case 'timeline':
                return <Clock className={className} />;
            case 'gantt':
                return <GanttChartSquare className={className} />;
            case 'workload':
                return <Users className={className} />;
            case 'chart':
                return <BarChart3 className={className} />;
            case 'files':
                return <Paperclip className={className} />;
            case 'gallery':
                return <LayoutGrid className={className} />;
            default:
                return <Table2 className={className} />;
        }
    };

    // Calculate real-time board statistics
    const stats = useMemo(() => {
        const rawTasks = [
            ...(activeBoard.columns?.flatMap((c) => c.tasks || []) || []),
            ...(activeBoard.groups?.flatMap((g) => g.tasks || []) || []),
        ];
        // Deduplicate non-parent tasks
        const uniqueTasks = Array.from(new Map(rawTasks.filter((t) => !t.parent_id).map((t) => [t.id, t])).values());

        const total = uniqueTasks.length;
        const completed = uniqueTasks.filter((t) => t.completed_at || t.progress === 100).length;
        const overdue = uniqueTasks.filter((t) => {
            if (t.completed_at || t.progress === 100) return false;
            if (t.deadline_status === 'overdue') return true;
            if (!t.due_date) return false;
            const timeStr = t.due_time ? t.due_time : '23:59:59';
            return new Date(`${t.due_date}T${timeStr}`) < new Date();
        }).length;
        const inProgress = Math.max(0, total - completed);

        return { total, completed, overdue, inProgress };
    }, [activeBoard]);

    // Active board members
    const boardMembers: User[] = useMemo(() => {
        const direct = (activeBoard.members || []).map((m: any) => m.user || m).filter(Boolean);
        if (direct.length > 0) return direct;
        const wsMembers = (activeWorkspace?.members || []).map((m: any) => m.user || m).filter(Boolean);
        if (wsMembers.length > 0) return wsMembers;
        return users.slice(0, 4);
    }, [activeBoard, activeWorkspace, users]);

    // Navigation and Action Handlers
    const handleSelectWorkspace = (wsId: number) => {
        router.get('/kanban', { workspace: wsId }, { preserveState: false });
    };

    const handleSelectBoard = (bId: number) => {
        router.get(
            '/kanban',
            {
                workspace: activeWorkspace?.id,
                board: bId,
            },
            { preserveState: true },
        );
    };

    const handleToggleWorkspaceFavorite = (wsId: number) => {
        router.post(`/workspaces/${wsId}/favorite`);
    };

    const handleToggleBoardFavorite = (boardId: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        router.post(`/kanban/boards/${boardId}/favorite`);
    };

    const handleDuplicateBoard = (bId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        router.post(`/kanban/boards/${bId}/duplicate`);
    };

    const handleDeleteBoard = (bId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this board? All tasks will be permanently removed.')) {
            router.delete(`/kanban/boards/${bId}`);
        }
    };

    const handleCreateWorkspace = (e: React.FormEvent) => {
        e.preventDefault();
        if (!workspaceName.trim()) return;
        router.post(
            '/workspaces',
            {
                name: workspaceName.trim(),
                description: workspaceDesc.trim() || undefined,
                color: workspaceColor,
            },
            {
                onSuccess: () => {
                    setIsCreateWorkspaceOpen(false);
                    setWorkspaceName('');
                    setWorkspaceDesc('');
                },
            },
        );
    };

    const handleEditWorkspace = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeWorkspace || !workspaceName.trim()) return;
        router.patch(
            `/workspaces/${activeWorkspace.id}`,
            {
                name: workspaceName.trim(),
                description: workspaceDesc.trim() || undefined,
                color: workspaceColor,
            },
            {
                onSuccess: () => {
                    setIsEditWorkspaceOpen(false);
                },
            },
        );
    };

    const handleOpenEditWorkspace = () => {
        if (!activeWorkspace) return;
        setWorkspaceName(activeWorkspace.name);
        setWorkspaceDesc(activeWorkspace.description || '');
        setWorkspaceColor(activeWorkspace.color || '#C8AEF5');
        setIsEditWorkspaceOpen(true);
    };

    const handleAddMember = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeWorkspace || !newMemberUserId) return;
        router.post(
            `/workspaces/${activeWorkspace.id}/members`,
            {
                user_id: Number(newMemberUserId),
                role: newMemberRole,
            },
            {
                onSuccess: () => {
                    setNewMemberUserId('');
                },
            },
        );
    };

    const handleRemoveMember = (memberId: number) => {
        if (!activeWorkspace) return;
        router.delete(`/workspaces/${activeWorkspace.id}/members/${memberId}`);
    };

    const handleCreateBoard = (e: React.FormEvent) => {
        e.preventDefault();
        if (!boardTitle.trim() || !activeWorkspace) return;
        router.post(
            '/kanban/boards',
            {
                workspace_id: activeWorkspace.id,
                title: boardTitle.trim(),
                description: boardDesc.trim() || undefined,
                folder_name: boardFolderName.trim() || undefined,
                visibility: boardVisibility,
            },
            {
                onSuccess: () => {
                    setIsCreateBoardOpen(false);
                    setBoardTitle('');
                    setBoardDesc('');
                    setBoardFolderName('');
                },
            },
        );
    };

    const handleCreateView = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newViewName.trim() || !activeBoard.id) return;
        router.post(
            `/kanban/boards/${activeBoard.id}/views`,
            {
                name: newViewName.trim(),
                type: newViewType,
            },
            {
                onSuccess: () => {
                    setIsAddViewModalOpen(false);
                    setNewViewName('');
                },
                onError: () => {
                    showToast({ title: 'Could not create view', variant: 'error' });
                },
            },
        );
    };

    const handleOpenRenameView = (view: BoardView, e: React.MouseEvent) => {
        e.stopPropagation();
        setRenamingView(view);
        setRenameViewName(view.name);
        setIsRenameViewOpen(true);
    };

    const handleRenameView = (e: React.FormEvent) => {
        e.preventDefault();
        if (!renamingView || !renameViewName.trim()) return;
        router.patch(
            `/kanban/views/${renamingView.id}`,
            { name: renameViewName.trim() },
            {
                onSuccess: () => {
                    setIsRenameViewOpen(false);
                    setRenamingView(null);
                },
                onError: () => {
                    showToast({ title: 'Could not rename view', variant: 'error' });
                },
            },
        );
    };

    const handleDeleteView = (view: BoardView, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Delete view "${view.name}"? Tasks, columns, groups, comments and attachments are not affected.`)) {
            return;
        }
        router.delete(`/kanban/views/${view.id}`, {
            onError: () => {
                showToast({ title: 'Could not delete view', variant: 'error' });
            },
        });
    };

    const handleSetDefaultView = (view: BoardView, e: React.MouseEvent) => {
        e.stopPropagation();
        router.patch(
            `/kanban/views/${view.id}`,
            { is_default: true },
            {
                onError: () => {
                    showToast({ title: 'Could not set default view', variant: 'error' });
                },
            },
        );
    };

    const handleMoveView = (view: BoardView, direction: -1 | 1, e: React.MouseEvent) => {
        e.stopPropagation();
        const ordered = [...views].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        const from = ordered.findIndex((v) => v.id === view.id);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= ordered.length) return;
        const [moved] = ordered.splice(from, 1);
        ordered.splice(to, 0, moved);
        router.post(
            `/kanban/boards/${activeBoard.id}/views/reorder`,
            { view_ids: ordered.map((v) => v.id) },
            {
                onError: () => {
                    showToast({ title: 'Could not reorder views', variant: 'error' });
                },
            },
        );
    };

    const getViewMenu = (v: BoardView) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    title="View actions"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded p-0.5 text-slate-400 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44 rounded-xl p-1 text-xs shadow-lg">
                {canManageViews && (
                    <>
                        <DropdownMenuItem
                            onClick={(e) => handleOpenRenameView(v, e)}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 font-medium"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Rename
                        </DropdownMenuItem>
                        {isViewReorderable(v) && (
                            <>
                                <DropdownMenuItem
                                    disabled={views.findIndex((x) => x.id === v.id) <= 0}
                                    onClick={(e) => handleMoveView(v, -1, e)}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 font-medium"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                    Move Left
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    disabled={views.findIndex((x) => x.id === v.id) >= views.length - 1}
                                    onClick={(e) => handleMoveView(v, 1, e)}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 font-medium"
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                    Move Right
                                </DropdownMenuItem>
                            </>
                        )}
                        {!v.is_default && (
                            <DropdownMenuItem
                                onClick={(e) => handleSetDefaultView(v, e)}
                                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 font-medium"
                            >
                                <Star className="h-3.5 w-3.5" />
                                Set as Default
                            </DropdownMenuItem>
                        )}
                        {isViewDeletable(v) && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={(e) => handleDeleteView(v, e)}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 font-medium text-rose-600 focus:text-rose-600 dark:text-rose-400"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                </DropdownMenuItem>
                            </>
                        )}
                    </>
                )}
                {v.is_system && (
                    <div className="px-2 py-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                        System view — rename only
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const hasActiveFilters = personFilter !== 'all' || priorityFilter !== 'all';
    const activeFiltersCount = (personFilter !== 'all' ? 1 : 0) + (priorityFilter !== 'all' ? 1 : 0);

    return (
        <div className="flex flex-col shrink-0 select-none">
            {/* ============================================================ */}
            {/* LEVEL 1: COMPACT APPLICATION TOOLBAR (h-14 / 56px)          */}
            {/* ============================================================ */}
            <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-[#ECECF0] bg-[#F8F9F7]/95 px-4 backdrop-blur-md transition-colors sm:px-6 dark:border-[#28283E] dark:bg-[#161624]/95">
                {/* Left: Sidebar trigger, Workspace selector, Board selector, View tabs */}
                <div className="flex items-center gap-2.5 overflow-hidden">
                    <SidebarTrigger className="-ml-1 h-8 w-8 rounded-xl text-[#191927] transition-colors hover:bg-black/5 dark:text-white dark:hover:bg-white/10" />

                    {/* Workspace Selector Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1 text-xs font-bold text-foreground shadow-2xs transition-all hover:bg-muted/70">
                                <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: activeWorkspace?.color || '#C8AEF5' }}
                                />
                                <span className="max-w-[110px] truncate sm:max-w-[140px]">{activeWorkspace?.name || 'Workspace'}</span>
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64 rounded-xl p-1.5 shadow-lg">
                            <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                Workspaces
                            </div>
                            {workspaces.map((ws) => (
                                <DropdownMenuItem
                                    key={ws.id}
                                    onClick={() => handleSelectWorkspace(ws.id)}
                                    className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ws.color || '#C8AEF5' }} />
                                        <span className="truncate">{ws.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {ws.is_favorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                                        {ws.id === activeWorkspace?.id && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                                    </div>
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator className="my-1" />
                            {activeWorkspace && (
                                <>
                                    <DropdownMenuItem onClick={handleOpenEditWorkspace} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs">
                                        <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>Workspace Settings</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsMembersModalOpen(true)} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs">
                                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>Manage Members ({activeWorkspace.members?.length || 0})</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="my-1" />
                                </>
                            )}
                            <DropdownMenuItem
                                onClick={() => setIsCreateWorkspaceOpen(true)}
                                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Create Workspace</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <span className="text-muted-foreground/40 font-light select-none">/</span>

                    {/* Board Selector Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1 text-xs font-bold text-foreground shadow-2xs transition-all hover:bg-muted/70">
                                <Layout className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="max-w-[120px] truncate sm:max-w-[160px]">{activeBoard.title}</span>
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-72 rounded-xl p-1.5 shadow-lg">
                            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                <span>Boards in {activeWorkspace?.name || 'Workspace'}</span>
                                {availableFolders.length > 0 && (
                                    <select
                                        value={selectedFolder}
                                        onChange={(e) => setSelectedFolder(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-5 rounded border border-border bg-background px-1 text-[10px] text-foreground"
                                    >
                                        <option value="all">All Folders</option>
                                        {availableFolders.map((f) => (
                                            <option key={f} value={f}>
                                                {f}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                {visibleBoards.map((b) => (
                                    <div
                                        key={b.id}
                                        onClick={() => handleSelectBoard(b.id)}
                                        className={`group/b flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors ${
                                            b.id === activeBoard.id ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-muted/60 text-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Layout className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                            <span className="truncate">{b.title}</span>
                                            {b.folder_name && (
                                                <span className="rounded bg-muted px-1 py-0.2 text-[9px] text-muted-foreground">
                                                    {b.folder_name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={(e) => handleToggleBoardFavorite(b.id, e)}
                                                className={`p-0.5 transition-colors ${
                                                    b.is_favorite ? 'text-amber-400' : 'text-slate-400 opacity-0 group-hover/b:opacity-100 hover:text-amber-400'
                                                }`}
                                            >
                                                <Star className={`h-3 w-3 ${b.is_favorite ? 'fill-amber-400' : ''}`} />
                                            </button>
                                            <button
                                                type="button"
                                                title="Duplicate"
                                                onClick={(e) => handleDuplicateBoard(b.id, e)}
                                                className="p-0.5 text-slate-400 opacity-0 group-hover/b:opacity-100 hover:text-foreground"
                                            >
                                                <Copy className="h-3 w-3" />
                                            </button>
                                            {boards.length > 1 && (
                                                <button
                                                    type="button"
                                                    title="Delete"
                                                    onClick={(e) => handleDeleteBoard(b.id, e)}
                                                    className="p-0.5 text-slate-400 opacity-0 group-hover/b:opacity-100 hover:text-rose-500"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                            {b.id === activeBoard.id && <Check className="ml-1 h-3.5 w-3.5 text-emerald-500" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {permissions?.canManageBoard !== false && (
                                <>
                                    <DropdownMenuSeparator className="my-1" />
                                    <DropdownMenuItem
                                        onClick={() => setIsCreateBoardOpen(true)}
                                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Create New Board</span>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                </div>

                {/* Right: Search, Unified Filter, New Item, Appearance, Notifications */}
                <div className="flex items-center gap-2">
                    {/* Compact Search */}
                    <div className="relative hidden sm:block">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search board..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="h-8 w-32 rounded-lg border-border bg-card pr-2 pl-8 text-xs transition-all focus:w-48 lg:w-40"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => onSearchChange('')}
                                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    {/* Unified Filter Popover */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={`h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold ${
                                    hasActiveFilters
                                        ? 'border-primary/40 bg-primary/10 text-primary'
                                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Filter className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Filter</span>
                                {hasActiveFilters && (
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-xl">
                            <div className="mb-2 flex items-center justify-between border-b border-border/50 pb-1.5 text-[11px] font-bold text-foreground">
                                <span>Filter Tasks</span>
                                {hasActiveFilters && (
                                    <button
                                        onClick={() => {
                                            onPersonFilterChange('all');
                                            onPriorityFilterChange('all');
                                        }}
                                        className="text-[10px] font-semibold text-rose-500 hover:underline"
                                    >
                                        Reset All
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2 text-xs">
                                <div>
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Assignee</Label>
                                    <Select value={personFilter} onValueChange={onPersonFilterChange}>
                                        <SelectTrigger className="mt-1 h-8 rounded-lg text-xs">
                                            <SelectValue placeholder="Filter by Assignee" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl text-xs">
                                            {permissions?.canFilterPersonalTasks === true && (
                                                <SelectItem value="me">My Tasks</SelectItem>
                                            )}
                                            <SelectItem value="all">All Accessible Tasks</SelectItem>
                                            {users.map((u) => (
                                                <SelectItem key={u.id} value={String(u.id)}>
                                                    {u.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Priority</Label>
                                    <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
                                        <SelectTrigger className="mt-1 h-8 rounded-lg text-xs">
                                            <SelectValue placeholder="All Priorities" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl text-xs">
                                            <SelectItem value="all">All Priorities</SelectItem>
                                            <SelectItem value="Urgent">Urgent</SelectItem>
                                            <SelectItem value="High">High</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="Low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* "+ New Item" Primary Button */}
                    {permissions?.canCreateTask !== false && (
                        <Button
                            onClick={onOpenNewTask}
                            className="h-8 rounded-full bg-[#0073ea] px-3.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#0060c0]"
                        >
                            <Plus className="mr-1 h-3.5 w-3.5 text-white" />
                            <span>New Item</span>
                        </Button>
                    )}

                    {/* Theme Toggle */}
                    <AppearanceToggleDropdown />

                    {/* Notification Center */}
                    <NotificationCenterPopover />
                </div>
            </header>

            {/* ============================================================ */}
            {/* ROW 2: BOARD IDENTITY & TELEMETRY BAR (h-14 / ~56px)         */}
            {/* ============================================================ */}
            <div className="flex shrink-0 min-h-[52px] sm:h-14 items-center justify-between gap-3 border-b border-[#ECECF0] bg-card/60 px-4 py-2 backdrop-blur-xs transition-colors sm:px-6 dark:border-[#28283E]">
                {/* Left: Board Title, Star, Visibility badge, Subtitle */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <button
                        type="button"
                        onClick={() => handleToggleBoardFavorite(activeBoard.id)}
                        className="text-muted-foreground hover:text-amber-400 transition-colors p-0.5 shrink-0"
                        title={activeBoard.is_favorite ? 'Favorited' : 'Add to favorites'}
                    >
                        <Star className={`h-4 w-4 ${activeBoard.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="truncate text-base font-black tracking-tight text-foreground sm:text-lg">
                                {activeBoard.title}
                            </h1>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase shrink-0">
                                {activeBoard.visibility || 'Public'}
                            </span>
                        </div>
                        {activeBoard.description && (
                            <p className="hidden text-[11px] text-muted-foreground truncate max-w-md sm:block">
                                {activeBoard.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Center: Real-time Board Statistics Strip */}
                <div className="hidden lg:flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/80 px-2.5 py-1 text-xs">
                        <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Total (Board):</span>
                        <span className="font-bold text-foreground">{stats.total}</span>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-2.5 py-1 text-xs text-blue-600 dark:text-blue-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>In Progress:</span>
                        <span className="font-bold">{stats.inProgress}</span>
                    </div>

                    {stats.overdue > 0 && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Overdue:</span>
                            <span className="font-bold">{stats.overdue}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Completed:</span>
                        <span className="font-bold">{stats.completed}</span>
                    </div>
                </div>

                {/* Right: Board Member Avatars + Board Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Member Avatars Stack */}
                    <div
                        onClick={() => permissions?.canManageBoard !== false && setIsMembersModalOpen(true)}
                        className={`hidden sm:flex items-center -space-x-1.5 rounded-lg p-1 transition-colors ${
                            permissions?.canManageBoard !== false ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default'
                        }`}
                        title={permissions?.canManageBoard !== false ? 'Manage Workspace & Board Members' : 'Board Members'}
                    >
                        {boardMembers.slice(0, 4).map((m) => (
                            <div
                                key={m.id}
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-background bg-primary/20 text-[10px] font-bold text-primary ring-1 ring-border shadow-2xs"
                                title={m.name}
                            >
                                {m.name.charAt(0).toUpperCase()}
                            </div>
                        ))}
                        {boardMembers.length > 4 && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-background bg-muted text-[9px] font-bold text-muted-foreground ring-1 ring-border">
                                +{boardMembers.length - 4}
                            </div>
                        )}
                        {permissions?.canManageBoard !== false && (
                            <UserPlus className="ml-2 h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        )}
                    </div>

                    {/* Add Group */}
                    {permissions?.canManageGroups !== false && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenNewGroup}
                            className="hidden sm:flex h-8 rounded-lg border-border bg-card px-2.5 text-xs font-medium hover:bg-muted/60"
                        >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            <span>Add Group</span>
                        </Button>
                    )}

                    {/* Add Column */}
                    {permissions?.canManageColumns !== false && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenNewColumn}
                            className="hidden md:flex h-8 rounded-lg border-border bg-card px-2.5 text-xs font-medium hover:bg-muted/60"
                        >
                            <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
                            <span>Add Column</span>
                        </Button>
                    )}

                    {/* Automations Chip */}
                    {permissions?.canManageAutomations !== false && onOpenAutomate && (
                        <button
                            onClick={onOpenAutomate}
                            title="Workflow Automations"
                            className="hidden items-center gap-1.5 rounded-full bg-[#E9DDFB] px-2.5 py-1 text-xs font-semibold text-[#5B309A] transition-all hover:opacity-90 xl:flex dark:bg-[#3D2C5E] dark:text-[#D8B4FE]"
                        >
                            <Zap className="h-3.5 w-3.5 text-[#5B309A] dark:text-[#D8B4FE]" />
                            <span>Automations</span>
                            {(activeBoard.automations || []).length > 0 && (
                                <span className="rounded-full bg-white/90 px-1.5 py-0.2 text-[10px] font-bold text-[#5B309A] dark:bg-[#281D42] dark:text-[#E9DDFB]">
                                    {(activeBoard.automations || []).length}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Blueprints */}
                    {permissions?.canManageBlueprints !== false && onOpenBlueprints && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenBlueprints}
                            className="hidden xl:flex h-8 rounded-lg border-indigo-500/30 bg-indigo-500/5 text-indigo-600 hover:bg-indigo-500/10 px-2.5 text-xs font-bold dark:text-indigo-400"
                        >
                            <Layers className="mr-1 h-3.5 w-3.5" />
                            <span>Blueprints</span>
                        </Button>
                    )}

                    {/* Workflow Settings */}
                    {permissions?.canManageBoard !== false && onOpenWorkflow && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenWorkflow}
                            title="Workflow Settings"
                            className="hidden lg:flex h-8 rounded-lg border-teal-500/30 bg-teal-500/5 text-teal-700 hover:bg-teal-500/10 px-2.5 text-xs font-bold dark:text-teal-400"
                        >
                            <Workflow className="mr-1 h-3.5 w-3.5" />
                            <span>Workflow</span>
                        </Button>
                    )}

                    {/* Export Dropdown */}
                    {permissions?.canExport !== false && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1 rounded-lg border-border bg-card px-2.5 text-xs font-semibold text-foreground hover:bg-muted/60"
                                >
                                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="hidden sm:inline">Export</span>
                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 text-xs shadow-xl space-y-1">
                                <DropdownMenuItem asChild>
                                    <a
                                        href={`/kanban/boards/${activeBoard.id}/export?format=csv`}
                                        download
                                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/60"
                                    >
                                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <div>
                                            <div className="font-semibold text-foreground">Export Tasks (CSV)</div>
                                            <div className="text-[10px] text-muted-foreground">Sanitized table spreadsheet</div>
                                        </div>
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <a
                                        href={`/kanban/boards/${activeBoard.id}/export?format=json`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/60"
                                    >
                                        <FileCode className="h-4 w-4 text-blue-600 shrink-0" />
                                        <div>
                                            <div className="font-semibold text-foreground">Export Tasks (JSON)</div>
                                            <div className="text-[10px] text-muted-foreground">Full schema & metadata</div>
                                        </div>
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <a
                                        href={`/kanban/boards/${activeBoard.id}/workload-analytics/export?format=csv`}
                                        download
                                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/60"
                                    >
                                        <Users className="h-4 w-4 text-amber-600 shrink-0" />
                                        <div>
                                            <div className="font-semibold text-foreground">Workload Report (CSV)</div>
                                            <div className="text-[10px] text-muted-foreground">Capacities & allocations</div>
                                        </div>
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <a
                                        href={`/kanban/boards/${activeBoard.id}/delivery-metrics/export?format=csv`}
                                        download
                                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/60"
                                    >
                                        <BarChart3 className="h-4 w-4 text-purple-600 shrink-0" />
                                        <div>
                                            <div className="font-semibold text-foreground">Delivery Metrics (CSV)</div>
                                            <div className="text-[10px] text-muted-foreground">Cycle time & SLA</div>
                                        </div>
                                    </a>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Board Context Menu ("...") */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 text-xs shadow-lg">
                            {permissions?.canManageGroups !== false && (
                                <DropdownMenuItem onClick={onOpenNewGroup} className="sm:hidden">
                                    <Plus className="mr-2 h-3.5 w-3.5" />
                                    <span>Add Group</span>
                                </DropdownMenuItem>
                            )}
                            {permissions?.canManageColumns !== false && (
                                <DropdownMenuItem onClick={onOpenNewColumn} className="md:hidden">
                                    <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
                                    <span>Add Column</span>
                                </DropdownMenuItem>
                            )}
                            {permissions?.canManageAutomations !== false && onOpenAutomate && (
                                <DropdownMenuItem onClick={onOpenAutomate} className="xl:hidden">
                                    <Zap className="mr-2 h-3.5 w-3.5 text-purple-500" />
                                    <span>Automations</span>
                                </DropdownMenuItem>
                            )}
                            {permissions?.canManageBlueprints !== false && onOpenBlueprints && (
                                <DropdownMenuItem onClick={onOpenBlueprints} className="xl:hidden">
                                    <Layers className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                                    <span>Blueprints</span>
                                </DropdownMenuItem>
                            )}
                            {permissions?.canManageBoard !== false && onOpenWorkflow && (
                                <DropdownMenuItem onClick={onOpenWorkflow}>
                                    <Workflow className="mr-2 h-3.5 w-3.5 text-teal-600" />
                                    <span>Workflow Settings</span>
                                </DropdownMenuItem>
                            )}
                            {permissions?.canManageBoard !== false && (
                                <DropdownMenuItem onClick={() => handleDuplicateBoard(activeBoard.id, {} as any)}>
                                    <Copy className="mr-2 h-3.5 w-3.5" />
                                    <span>Duplicate Board</span>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleToggleBoardFavorite(activeBoard.id)}>
                                <Star className="mr-2 h-3.5 w-3.5 text-amber-500" />
                                <span>{activeBoard.is_favorite ? 'Remove Favorite' : 'Mark Favorite'}</span>
                            </DropdownMenuItem>
                            {permissions?.canManageBoard !== false && boards.length > 1 && (
                                <>
                                    <DropdownMenuSeparator className="my-1" />
                                    <DropdownMenuItem
                                        onClick={() => handleDeleteBoard(activeBoard.id, {} as any)}
                                        className="text-rose-600 focus:text-rose-600 font-semibold"
                                    >
                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                        <span>Delete Board</span>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* ============================================================ */}
            {/* ROW 3: BOARD VIEW NAVIGATION (h-10 / 40px)                   */}
            {/* ============================================================ */}
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#ECECF0] bg-[#F8F9F7]/95 px-4 backdrop-blur-md transition-colors sm:px-6 dark:border-[#28283E] dark:bg-[#161624]/95">
                {/* Left: View Tabs (ordered by saved position, selected by unique view ID) */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
                    {views.map((v) => {
                        const isActive = activeViewId === v.id;
                        return (
                            <div key={v.id} className="group/tab relative flex items-center">
                                <button
                                    onClick={() => onViewSelect(v.id)}
                                    className={`group relative flex items-center gap-1.5 rounded-lg py-1.5 pr-8 pl-3 text-xs font-semibold whitespace-nowrap transition-all ${
                                        isActive
                                            ? 'bg-primary/10 text-primary font-bold shadow-2xs border border-primary/25'
                                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent'
                                    }`}
                                    title={v.name}
                                >
                                    {getViewIcon(v.type, `h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`)}
                                    <span>{getFormattedViewName(v)}</span>
                                    {v.is_default && <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Default View" />}
                                </button>
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/tab:opacity-100">
                                    {getViewMenu(v)}
                                </div>
                            </div>
                        );
                    })}

                    {/* Add View */}
                    {canManageViews && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground border border-transparent"
                                    title="Add View"
                                >
                                    <Plus className="h-3 w-3" />
                                    <span>Add View</span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48 rounded-xl p-1 text-xs shadow-lg">
                                {(['table', 'kanban', 'calendar', 'timeline', 'gantt', 'workload', 'chart', 'files', 'gallery'] as const).map((t) => (
                                    <DropdownMenuItem
                                        key={t}
                                        onClick={() => {
                                            setNewViewType(t);
                                            setIsAddViewModalOpen(true);
                                        }}
                                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 font-medium capitalize"
                                    >
                                        {getViewIcon(t)}
                                        <span>{t}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Right: Quick "+ View" action if permitted */}
                {permissions?.canManageColumns !== false && (
                    <button
                        onClick={() => setIsAddViewModalOpen(true)}
                        className="hidden sm:flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors shrink-0"
                        title="Add new board view"
                    >
                        <Plus className="h-3 w-3" />
                        <span>Add View</span>
                    </button>
                )}
            </div>

            {/* ============================================================ */}
            {/* MODALS: WORKSPACE, MEMBERS, BOARD, VIEW                     */}
            {/* ============================================================ */}

            {/* Create Workspace Modal */}
            <Dialog open={isCreateWorkspaceOpen} onOpenChange={setIsCreateWorkspaceOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleCreateWorkspace}>
                        <DialogHeader>
                            <DialogTitle>Create Workspace</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4 text-xs">
                            <div>
                                <Label htmlFor="c-ws-name">Workspace Name</Label>
                                <Input
                                    id="c-ws-name"
                                    placeholder="e.g. Creative Studio, Media Team"
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                    required
                                    className="mt-1 h-9 rounded-xl"
                                />
                            </div>
                            <div>
                                <Label htmlFor="c-ws-desc">Description (Optional)</Label>
                                <Input
                                    id="c-ws-desc"
                                    placeholder="Brief summary of workspace operations"
                                    value={workspaceDesc}
                                    onChange={(e) => setWorkspaceDesc(e.target.value)}
                                    className="mt-1 h-9 rounded-xl"
                                />
                            </div>
                            <div>
                                <Label>Workspace Color</Label>
                                <div className="mt-2 flex items-center gap-2">
                                    {['#C8AEF5', '#579BFC', '#00CA72', '#FDAB3D', '#E2445C', '#A25DDC', '#784BD1'].map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setWorkspaceColor(c)}
                                            className={`h-6 w-6 rounded-md border transition-all ${
                                                workspaceColor === c ? 'scale-110 border-foreground ring-2 ring-primary/40' : 'border-transparent'
                                            }`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateWorkspaceOpen(false)} className="h-9 rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" className="h-9 rounded-xl">
                                Create Workspace
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Workspace Modal */}
            <Dialog open={isEditWorkspaceOpen} onOpenChange={setIsEditWorkspaceOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleEditWorkspace}>
                        <DialogHeader>
                            <DialogTitle>Workspace Settings</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4 text-xs">
                            <div>
                                <Label htmlFor="e-ws-name">Workspace Name</Label>
                                <Input
                                    id="e-ws-name"
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                    required
                                    className="mt-1 h-9 rounded-xl"
                                />
                            </div>
                            <div>
                                <Label htmlFor="e-ws-desc">Description</Label>
                                <Input
                                    id="e-ws-desc"
                                    value={workspaceDesc}
                                    onChange={(e) => setWorkspaceDesc(e.target.value)}
                                    className="mt-1 h-9 rounded-xl"
                                />
                            </div>
                            <div>
                                <Label>Theme Color</Label>
                                <div className="mt-2 flex items-center gap-2">
                                    {['#C8AEF5', '#579BFC', '#00CA72', '#FDAB3D', '#E2445C', '#A25DDC', '#784BD1'].map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setWorkspaceColor(c)}
                                            className={`h-6 w-6 rounded-md border transition-all ${
                                                workspaceColor === c ? 'scale-110 border-foreground ring-2 ring-primary/40' : 'border-transparent'
                                            }`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditWorkspaceOpen(false)} className="h-9 rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" className="h-9 rounded-xl">
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Manage Members Modal */}
            <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
                <DialogContent className="rounded-2xl sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Workspace Members — {activeWorkspace?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 text-xs">
                        {/* Add Member Form */}
                        <form onSubmit={handleAddMember} className="flex items-end gap-2 border-b border-border/60 pb-4">
                            <div className="flex-1">
                                <Label>Select User</Label>
                                <Select value={newMemberUserId} onValueChange={setNewMemberUserId}>
                                    <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                                        <SelectValue placeholder="Choose a user to invite" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl text-xs">
                                        {users.map((u) => (
                                            <SelectItem key={u.id} value={String(u.id)}>
                                                {u.name} ({u.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-28">
                                <Label>Role</Label>
                                <Select value={newMemberRole} onValueChange={(v: any) => setNewMemberRole(v)}>
                                    <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl text-xs">
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="member">Member</SelectItem>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" disabled={!newMemberUserId} className="h-9 rounded-xl px-3 text-xs">
                                Add
                            </Button>
                        </form>

                        {/* Members List */}
                        <div className="max-h-60 space-y-2 overflow-y-auto">
                            {(activeWorkspace?.members || []).map((m: any) => (
                                <div key={m.id} className="flex items-center justify-between rounded-xl border border-border/60 p-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                                            {m.user?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-foreground">{m.user?.name || 'User'}</div>
                                            <div className="text-[10px] text-muted-foreground">{m.user?.email}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                            {m.role}
                                        </Badge>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMember(m.id)}
                                            className="text-slate-400 hover:text-rose-500 p-1"
                                            title="Remove Member"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {(activeWorkspace?.members || []).length === 0 && (
                                <div className="py-6 text-center text-xs text-muted-foreground">
                                    No direct workspace members assigned yet.
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={() => setIsMembersModalOpen(false)} className="h-9 rounded-xl">
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Board Modal */}
            <Dialog open={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleCreateBoard}>
                        <DialogHeader>
                            <DialogTitle>Create New Board</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4 text-xs">
                            <div>
                                <Label htmlFor="c-board-title">Board Title</Label>
                                <Input
                                    id="c-board-title"
                                    placeholder="e.g. Sprint 24, Content Pipeline"
                                    value={boardTitle}
                                    onChange={(e) => setBoardTitle(e.target.value)}
                                    required
                                    className="mt-1 h-9 rounded-xl"
                                />
                            </div>
                            <div>
                                <Label htmlFor="c-board-folder">Folder (Optional)</Label>
                                <Input
                                    id="c-board-folder"
                                    placeholder="e.g. Q4 Campaigns, Client Work"
                                    value={boardFolderName}
                                    onChange={(e) => setBoardFolderName(e.target.value)}
                                    className="mt-1 h-9 rounded-xl"
                                />
                            </div>
                            <div>
                                <Label htmlFor="c-board-desc">Description (Optional)</Label>
                                <Input
                                    id="c-board-desc"
                                    placeholder="Brief purpose of this board"
                                    value={boardDesc}
                                    onChange={(e) => setBoardDesc(e.target.value)}
                                    className="mt-1 h-9 rounded-xl"
                                />
                            </div>
                            <div>
                                <Label>Visibility</Label>
                                <Select value={boardVisibility} onValueChange={(v: any) => setBoardVisibility(v)}>
                                    <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl text-xs">
                                        <SelectItem value="public">Public (All workspace members)</SelectItem>
                                        <SelectItem value="private">Private (Only invited members)</SelectItem>
                                        <SelectItem value="shareable">Shareable (Link accessible)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateBoardOpen(false)} className="h-9 rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!boardTitle.trim()} className="h-9 rounded-xl">
                                Create Board
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Board View Modal */}
            <Dialog open={isAddViewModalOpen} onOpenChange={setIsAddViewModalOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleCreateView}>
                        <DialogHeader>
                            <DialogTitle>Add Board View</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4 text-xs">
                            <div>
                                <Label>View Name</Label>
                                <Input
                                    placeholder="e.g. Delivery Tracking, Media Vault"
                                    value={newViewName}
                                    onChange={(e) => setNewViewName(e.target.value)}
                                    required
                                    className="mt-1 h-9 rounded-xl"
                                />
                            </div>
                            <div>
                                <Label>View Type</Label>
                                <div className="mt-2 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1">
                                    {[
                                        { type: 'table', label: 'Main Table', desc: 'Custom columns, inline cell editing' },
                                        { type: 'kanban', label: 'Kanban Board', desc: 'Cards across workflow stages' },
                                        { type: 'calendar', label: 'Calendar View', desc: 'Month and week reschedule' },
                                        { type: 'gantt', label: 'Gantt Chart', desc: 'Dependencies and timeline' },
                                        { type: 'workload', label: 'Workload', desc: 'Capacity & allocation' },
                                        { type: 'chart', label: 'Dashboard & Charts', desc: 'Delivery analytics' },
                                        { type: 'files', label: 'Files Vault', desc: 'Asset gallery' },
                                        { type: 'gallery', label: 'Visual Gallery', desc: 'Visual task showcase' },
                                    ].map((opt) => (
                                        <div
                                            key={opt.type}
                                            onClick={() => setNewViewType(opt.type)}
                                            className={`cursor-pointer rounded-xl border p-2.5 transition-all ${
                                                newViewType === opt.type
                                                    ? 'border-primary bg-primary/10 shadow-xs'
                                                    : 'border-border/70 hover:border-primary/40 bg-card'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 font-bold text-foreground">
                                                {getViewIcon(opt.type)}
                                                <span>{opt.label}</span>
                                            </div>
                                            <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{opt.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddViewModalOpen(false)} className="h-9 rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!newViewName.trim()} className="h-9 rounded-xl">
                                Add View
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Rename Board View Modal */}
            <Dialog open={isRenameViewOpen} onOpenChange={setIsRenameViewOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleRenameView}>
                        <DialogHeader>
                            <DialogTitle>Rename View</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4 text-xs">
                            <div>
                                <Label>View Name</Label>
                                <Input
                                    value={renameViewName}
                                    onChange={(e) => setRenameViewName(e.target.value)}
                                    required
                                    className="mt-1 h-9 rounded-xl"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsRenameViewOpen(false)} className="h-9 rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!renameViewName.trim()} className="h-9 rounded-xl">
                                Rename
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
