import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Archive,
    Check,
    ChevronDown,
    ChevronUp,
    Columns3,
    Eye,
    EyeOff,
    Folder,
    Layers,
    Layout,
    Lock,
    Pencil,
    Plus,
    RotateCcw,
    Settings,
    Shield,
    SlidersHorizontal,
    Star,
    Trash2,
    UserPlus,
    Users,
    Workflow,
    X,
    Zap,
    AlertTriangle,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/components/toast';
import { UserAvatar } from '@/components/UserAvatar';
import { BoardPermissions, KanbanBoard, KanbanColumn, User, Workspace } from '../types';

interface BoardSettingsModalProps {
    board: KanbanBoard;
    workspaces: Workspace[];
    users: User[];
    isOpen: boolean;
    onClose: () => void;
    onOpenWorkflow?: () => void;
    onOpenAutomate?: () => void;
    permissions?: BoardPermissions;
    initialTab?: 'general' | 'workflow' | 'columns' | 'permissions' | 'automation' | 'danger';
}

const BOARD_COLORS = [
    '#579BFC',
    '#A25DDC',
    '#00C875',
    '#FDAB3D',
    '#E2445C',
    '#FF642E',
    '#784BD1',
    '#0073EA',
    '#676879',
];

const BOARD_ICONS = ['Layout', 'Kanban', 'Table', 'Folder', 'Star', 'Zap', 'Layers', 'Workflow'];

export default function BoardSettingsModal({
    board,
    workspaces = [],
    users = [],
    isOpen,
    onClose,
    onOpenWorkflow,
    onOpenAutomate,
    permissions,
    initialTab = 'general',
}: BoardSettingsModalProps) {
    const [activeSection, setActiveSection] = useState<'general' | 'workflow' | 'columns' | 'permissions' | 'automation' | 'danger'>(initialTab);

    // General tab form
    const [title, setTitle] = useState(board.title);
    const [description, setDescription] = useState(board.description || '');
    const [workspaceId, setWorkspaceId] = useState(String(board.workspace_id || workspaces[0]?.id || ''));
    const [visibility, setVisibility] = useState<'public' | 'private' | 'shareable'>(
        (board.visibility as any) || 'public'
    );
    const [boardColor, setBoardColor] = useState(board.settings?.color || '#579BFC');
    const [boardIcon, setBoardIcon] = useState(board.settings?.icon || 'Layout');
    const [defaultStageId, setDefaultStageId] = useState(
        String(board.settings?.default_stage_id || board.columns?.[0]?.id || '')
    );
    const [isSavingGeneral, setIsSavingGeneral] = useState(false);

    // Permissions tab form
    const [newMemberId, setNewMemberId] = useState('');
    const [newMemberRole, setNewMemberRole] = useState<'owner' | 'admin' | 'editor' | 'viewer'>('editor');
    const [isAddingMember, setIsAddingMember] = useState(false);

    // Danger zone confirmations
    const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    const isSuperAdmin = permissions?.canDeleteBoard || false;
    const canManage = permissions?.canManageBoard !== false;

    // Reset when modal opens with new board
    React.useEffect(() => {
        if (isOpen) {
            setTitle(board.title);
            setDescription(board.description || '');
            setWorkspaceId(String(board.workspace_id || workspaces[0]?.id || ''));
            setVisibility((board.visibility as any) || 'public');
            setBoardColor(board.settings?.color || '#579BFC');
            setBoardIcon(board.settings?.icon || 'Layout');
            setDefaultStageId(String(board.settings?.default_stage_id || board.columns?.[0]?.id || ''));
        }
    }, [isOpen, board]);

    const handleSaveGeneral = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingGeneral(true);

        router.patch(
            route('kanban.boards.update', board.id),
            {
                title,
                description,
                workspace_id: workspaceId ? Number(workspaceId) : undefined,
                visibility,
                settings: {
                    color: boardColor,
                    icon: boardIcon,
                    default_stage_id: defaultStageId ? Number(defaultStageId) : undefined,
                },
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSavingGeneral(false);
                    showToast({ title: 'Board settings updated', variant: 'success' });
                },
                onError: () => {
                    setIsSavingGeneral(false);
                    showToast({ title: 'Failed to update board', variant: 'error' });
                },
            }
        );
    };

    // Columns reorder & toggle visibility
    const handleToggleColumnVisibility = (colId: number, currentVisible: boolean) => {
        router.patch(
            `/kanban/board-columns/${colId}`,
            { is_visible: !currentVisible },
            {
                preserveScroll: true,
                onSuccess: () => showToast({ title: 'Column visibility updated', variant: 'success' }),
            }
        );
    };

    // Workflow stages quick management
    const handleMoveStage = (stage: KanbanColumn, direction: number) => {
        const columns = [...(board.columns || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        const index = columns.findIndex((c) => c.id === stage.id);
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= columns.length) return;

        const [moved] = columns.splice(index, 1);
        columns.splice(targetIndex, 0, moved);

        const orderedIds = columns.map((c) => c.id);
        router.post(
            `/kanban/boards/${board.id}/stages/reorder`,
            { stages: orderedIds },
            {
                preserveScroll: true,
                onSuccess: () => showToast({ title: 'Stage reordered', variant: 'success' }),
            }
        );
    };

    // Members management
    const handleAddMember = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMemberId) return;

        setIsAddingMember(true);
        router.post(
            `/kanban/boards/${board.id}/members`,
            { user_id: Number(newMemberId), role: newMemberRole },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNewMemberId('');
                    setIsAddingMember(false);
                    showToast({ title: 'Member added to board', variant: 'success' });
                },
                onError: () => setIsAddingMember(false),
            }
        );
    };

    const handleRemoveMember = (memberId: number) => {
        router.delete(`/kanban/boards/${board.id}/members/${memberId}`, {
            preserveScroll: true,
            onSuccess: () => showToast({ title: 'Member removed', variant: 'success' }),
        });
    };

    // Archival and Deletion
    const handleArchiveBoard = () => {
        setIsArchiving(true);
        router.post(
            route('kanban.boards.archive', board.id),
            {},
            {
                onSuccess: () => {
                    setIsArchiving(false);
                    setIsArchiveConfirmOpen(false);
                    onClose();
                    showToast({ title: 'Board archived', variant: 'success' });
                },
                onError: () => setIsArchiving(false),
            }
        );
    };

    const handleRestoreBoard = () => {
        setIsArchiving(true);
        router.post(
            route('kanban.boards.restore', board.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsArchiving(false);
                    showToast({ title: 'Board restored', variant: 'success' });
                },
                onError: () => setIsArchiving(false),
            }
        );
    };

    const handleDeleteBoard = () => {
        setIsDeleting(true);
        router.delete(route('kanban.boards.delete', board.id), {
            onSuccess: () => {
                setIsDeleting(false);
                setIsDeleteConfirmOpen(false);
                onClose();
                showToast({ title: 'Board deleted', variant: 'success' });
            },
            onError: () => setIsDeleting(false),
        });
    };

    const isArchived = Boolean(board.archived_at || (board as any).is_archived);
    const boardColumns = (board as any).allBoardColumns || board.boardColumns || board.board_columns || [];
    const members = board.members || [];
    const automations = board.automations || [];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden border-white/10 bg-[#1A1A27] text-white">
                <div className="flex h-full min-h-[520px]">
                    {/* Left Navigation Sidebar */}
                    <div className="w-56 shrink-0 border-r border-white/10 bg-[#161622] p-4 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="px-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Board Settings
                                </h3>
                                <p className="truncate text-xs font-semibold text-white mt-1">
                                    {board.title}
                                </p>
                            </div>

                            <nav className="space-y-1 text-xs font-medium">
                                <button
                                    type="button"
                                    onClick={() => setActiveSection('general')}
                                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${
                                        activeSection === 'general'
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <Settings className="h-4 w-4 text-[#579BFC]" />
                                    <span>General</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveSection('workflow')}
                                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${
                                        activeSection === 'workflow'
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <Workflow className="h-4 w-4 text-[#00C875]" />
                                    <span>Workflow</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveSection('columns')}
                                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${
                                        activeSection === 'columns'
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <Columns3 className="h-4 w-4 text-[#A25DDC]" />
                                    <span>Columns</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveSection('permissions')}
                                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${
                                        activeSection === 'permissions'
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <Users className="h-4 w-4 text-[#FDAB3D]" />
                                    <span>Permissions</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveSection('automation')}
                                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${
                                        activeSection === 'automation'
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <Zap className="h-4 w-4 text-purple-400" />
                                    <span>Automation</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveSection('danger')}
                                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${
                                        activeSection === 'danger'
                                            ? 'bg-rose-500/10 text-rose-400 font-bold'
                                            : 'text-rose-400/80 hover:bg-rose-500/5 hover:text-rose-400'
                                    }`}
                                >
                                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                                    <span>Danger Zone</span>
                                </button>
                            </nav>
                        </div>

                        {isArchived && (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-300 flex items-center gap-2">
                                <Archive className="h-4 w-4 shrink-0" />
                                <span>Board is archived</span>
                            </div>
                        )}
                    </div>

                    {/* Right Content Area */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* 1. GENERAL SECTION */}
                        {activeSection === 'general' && (
                            <form onSubmit={handleSaveGeneral} className="space-y-5">
                                <div>
                                    <h4 className="text-sm font-bold text-white">General Information</h4>
                                    <p className="text-xs text-slate-400">
                                        Configure the board's identity, color branding, and workspace placement.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-300">Board Name</Label>
                                        <Input
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            required
                                            className="h-9 border-white/10 bg-[#28283E] text-xs text-white"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-300">Description</Label>
                                        <Textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={2}
                                            placeholder="Add details about what this board is used for..."
                                            className="border-white/10 bg-[#28283E] text-xs text-white resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-300">Workspace</Label>
                                            <Select value={workspaceId} onValueChange={setWorkspaceId}>
                                                <SelectTrigger className="h-9 border-white/10 bg-[#28283E] text-xs text-white">
                                                    <SelectValue placeholder="Select workspace" />
                                                </SelectTrigger>
                                                <SelectContent className="border-white/10 bg-[#1E1E30] text-white">
                                                    {workspaces.map((ws) => (
                                                        <SelectItem key={ws.id} value={String(ws.id)} className="text-xs">
                                                            {ws.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-300">Visibility</Label>
                                            <Select value={visibility} onValueChange={(val: any) => setVisibility(val)}>
                                                <SelectTrigger className="h-9 border-white/10 bg-[#28283E] text-xs text-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="border-white/10 bg-[#1E1E30] text-white">
                                                    <SelectItem value="public" className="text-xs">
                                                        Main (Public to workspace)
                                                    </SelectItem>
                                                    <SelectItem value="private" className="text-xs">
                                                        Private (Members only)
                                                    </SelectItem>
                                                    <SelectItem value="shareable" className="text-xs">
                                                        Shareable (Guests & Clients)
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Color Swatches */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-300">Board Color</Label>
                                        <div className="flex items-center gap-2">
                                            {BOARD_COLORS.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setBoardColor(c)}
                                                    className={`h-6 w-6 rounded-full border transition-all ${
                                                        boardColor === c
                                                            ? 'border-white scale-110 ring-2 ring-white/30'
                                                            : 'border-white/10 hover:scale-105'
                                                    }`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Default Stage */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-300">
                                            Default New-Task Stage
                                        </Label>
                                        <Select value={defaultStageId} onValueChange={setDefaultStageId}>
                                            <SelectTrigger className="h-9 border-white/10 bg-[#28283E] text-xs text-white">
                                                <SelectValue placeholder="Select default workflow stage" />
                                            </SelectTrigger>
                                            <SelectContent className="border-white/10 bg-[#1E1E30] text-white">
                                                {board.columns?.map((col) => (
                                                    <SelectItem key={col.id} value={String(col.id)} className="text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="h-2 w-2 rounded-full"
                                                                style={{ backgroundColor: col.color || '#64748b' }}
                                                            />
                                                            <span>{col.title}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={isSavingGeneral || !canManage}
                                        className="h-8 gap-1.5 text-xs font-bold bg-[#579BFC] hover:bg-[#488be6] text-white"
                                    >
                                        {isSavingGeneral ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Check className="h-3.5 w-3.5" />
                                        )}
                                        <span>Save Changes</span>
                                    </Button>
                                </div>
                            </form>
                        )}

                        {/* 2. WORKFLOW SECTION */}
                        {activeSection === 'workflow' && (
                            <div className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Workflow Stages</h4>
                                        <p className="text-xs text-slate-400">
                                            Ordered progression of production stages and semantic rules.
                                        </p>
                                    </div>
                                    {onOpenWorkflow && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            onClick={onOpenWorkflow}
                                            className="h-8 gap-1.5 text-xs font-semibold bg-[#28283E] text-white hover:bg-[#353550] border border-white/10"
                                        >
                                            <Workflow className="h-3.5 w-3.5 text-[#00C875]" />
                                            <span>Transition Matrix</span>
                                        </Button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {board.columns?.map((col, idx) => (
                                        <div
                                            key={col.id}
                                            className="flex items-center justify-between rounded-xl border border-white/10 bg-[#28283E]/50 p-2.5 text-xs"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span
                                                    className="h-3.5 w-3.5 rounded-full shrink-0 border border-white/20"
                                                    style={{ backgroundColor: col.color || '#64748b' }}
                                                />
                                                <div>
                                                    <span className="font-bold text-white">{col.title}</span>
                                                    <span className="ml-2 rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-white/10 text-slate-300">
                                                        {(col as any).status_semantic || col.semantic_category || 'Active'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    disabled={idx === 0}
                                                    onClick={() => handleMoveStage(col, -1)}
                                                    className="rounded p-1 text-slate-400 hover:text-white disabled:opacity-30"
                                                >
                                                    <ChevronUp className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={idx === (board.columns?.length || 0) - 1}
                                                    onClick={() => handleMoveStage(col, 1)}
                                                    className="rounded p-1 text-slate-400 hover:text-white disabled:opacity-30"
                                                >
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. COLUMNS SECTION */}
                        {activeSection === 'columns' && (
                            <div className="space-y-5">
                                <div>
                                    <h4 className="text-sm font-bold text-white">Board Custom Fields & Columns</h4>
                                    <p className="text-xs text-slate-400">
                                        Toggle column visibility and view dynamic custom fields configured for this board.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    {boardColumns.map((col: any) => (
                                        <div
                                            key={col.id}
                                            className="flex items-center justify-between rounded-xl border border-white/10 bg-[#28283E]/50 p-2.5 text-xs"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="rounded px-1.5 py-0.5 text-[10px] font-mono uppercase bg-white/10 text-[#A25DDC]">
                                                    {col.type || 'text'}
                                                </span>
                                                <span className="font-semibold text-white">{col.title}</span>
                                                {col.scope === 'subtask' && (
                                                    <span className="text-[10px] text-slate-400">(Subitems)</span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleColumnVisibility(col.id, col.is_visible !== false)}
                                                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                                                        col.is_visible !== false
                                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                            : 'bg-white/5 text-slate-400 border border-white/10'
                                                    }`}
                                                >
                                                    {col.is_visible !== false ? (
                                                        <>
                                                            <Eye className="h-3 w-3" />
                                                            <span>Visible</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <EyeOff className="h-3 w-3" />
                                                            <span>Hidden</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. PERMISSIONS SECTION */}
                        {activeSection === 'permissions' && (
                            <div className="space-y-5">
                                <div>
                                    <h4 className="text-sm font-bold text-white">Board Members & Access</h4>
                                    <p className="text-xs text-slate-400">
                                        Manage role-based board editors and collaborate securely.
                                    </p>
                                </div>

                                {/* Add Member Form */}
                                {canManage && (
                                    <form onSubmit={handleAddMember} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#28283E]/30 p-3">
                                        <Select value={newMemberId} onValueChange={setNewMemberId}>
                                            <SelectTrigger className="h-8 flex-1 border-white/10 bg-[#28283E] text-xs text-white">
                                                <SelectValue placeholder="Select user to add..." />
                                            </SelectTrigger>
                                            <SelectContent className="border-white/10 bg-[#1E1E30] text-white">
                                                {users.map((u) => (
                                                    <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                                                        {u.name} ({u.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select value={newMemberRole} onValueChange={(r: any) => setNewMemberRole(r)}>
                                            <SelectTrigger className="h-8 w-28 border-white/10 bg-[#28283E] text-xs text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="border-white/10 bg-[#1E1E30] text-white">
                                                <SelectItem value="owner" className="text-xs">Owner</SelectItem>
                                                <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                                                <SelectItem value="editor" className="text-xs">Editor</SelectItem>
                                                <SelectItem value="viewer" className="text-xs">Viewer</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={!newMemberId || isAddingMember}
                                            className="h-8 gap-1.5 text-xs font-bold bg-[#FDAB3D] hover:bg-[#e6982b] text-black"
                                        >
                                            <UserPlus className="h-3.5 w-3.5" />
                                            <span>Add</span>
                                        </Button>
                                    </form>
                                )}

                                {/* Members List */}
                                <div className="space-y-2">
                                    {members.length === 0 && (
                                        <div className="rounded-xl border border-white/5 bg-[#28283E]/20 p-4 text-center text-xs text-slate-400">
                                            No explicit board members assigned. Workspace members have default visibility.
                                        </div>
                                    )}
                                    {members.map((m) => (
                                        <div
                                            key={m.id}
                                            className="flex items-center justify-between rounded-xl border border-white/10 bg-[#28283E]/50 p-2.5 text-xs"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <UserAvatar user={m.user} size="xs" />
                                                <div>
                                                    <span className="font-bold text-white">{m.user?.name || 'User'}</span>
                                                    <span className="ml-2 text-[10px] text-slate-400">{m.user?.email}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-300">
                                                    {m.role}
                                                </span>
                                                {canManage && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveMember(m.id)}
                                                        className="text-slate-400 hover:text-red-400 p-1"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 5. AUTOMATION SECTION */}
                        {activeSection === 'automation' && (
                            <div className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Board Automations</h4>
                                        <p className="text-xs text-slate-400">
                                            Configured event-driven triggers and actions for this board.
                                        </p>
                                    </div>
                                    {onOpenAutomate && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={onOpenAutomate}
                                            className="h-8 gap-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                                        >
                                            <Zap className="h-3.5 w-3.5" />
                                            <span>Automation Center</span>
                                        </Button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {automations.length === 0 ? (
                                        <div className="rounded-xl border border-white/5 bg-[#28283E]/20 p-6 text-center text-xs text-slate-400">
                                            No custom automations configured for this board yet.
                                        </div>
                                    ) : (
                                        automations.map((auto) => (
                                            <div
                                                key={auto.id}
                                                className="flex items-center justify-between rounded-xl border border-white/10 bg-[#28283E]/50 p-3 text-xs"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                                                        <Zap className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-white">{auto.name}</h5>
                                                        <p className="text-[11px] text-slate-400">{auto.description}</p>
                                                    </div>
                                                </div>

                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                        auto.is_active
                                                            ? 'bg-emerald-500/20 text-emerald-300'
                                                            : 'bg-white/10 text-slate-400'
                                                    }`}
                                                >
                                                    {auto.is_active ? 'Active' : 'Paused'}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 6. DANGER ZONE SECTION */}
                        {activeSection === 'danger' && (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-bold text-rose-400">Danger Zone</h4>
                                    <p className="text-xs text-slate-400">
                                        Destructive or high-impact actions. Board archival is reversible; permanent deletion is Super Admin only.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {/* Archive / Restore Card */}
                                    <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs">
                                        <div>
                                            <h5 className="font-bold text-amber-300">
                                                {isArchived ? 'Restore Board' : 'Archive Board'}
                                            </h5>
                                            <p className="text-slate-400 mt-0.5">
                                                {isArchived
                                                    ? 'Restore this board to active status in the workspace.'
                                                    : 'Hide this board from active navigation while preserving all tasks and history.'}
                                            </p>
                                        </div>

                                        {isArchived ? (
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={handleRestoreBoard}
                                                disabled={isArchiving || !canManage}
                                                className="h-8 gap-1.5 text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40"
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                                <span>Restore</span>
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => setIsArchiveConfirmOpen(true)}
                                                disabled={!canManage}
                                                className="h-8 gap-1.5 text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40"
                                            >
                                                <Archive className="h-3.5 w-3.5" />
                                                <span>Archive</span>
                                            </Button>
                                        )}
                                    </div>

                                    {/* Delete Card */}
                                    <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs">
                                        <div>
                                            <h5 className="font-bold text-rose-400">Delete Board</h5>
                                            <p className="text-slate-400 mt-0.5">
                                                {isSuperAdmin
                                                    ? 'Soft-delete this board and its configuration. Can be recovered from soft deletes.'
                                                    : 'Board deletion is restricted to Super Admin only.'}
                                            </p>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => setIsDeleteConfirmOpen(true)}
                                            disabled={!isSuperAdmin}
                                            className="h-8 gap-1.5 text-xs font-bold"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span>Delete Board</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="border-t border-white/10 bg-[#161622] px-6 py-3">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>

            {/* Archive Confirmation Dialog */}
            <Dialog open={isArchiveConfirmOpen} onOpenChange={setIsArchiveConfirmOpen}>
                <DialogContent className="max-w-md border-white/10 bg-[#1E1E30] text-white">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                            <Archive className="h-4 w-4 text-amber-400" />
                            <span>Archive "{board.title}"?</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-400">
                            Archiving hides this board from standard workspace navigation. All tasks, comments, files, and workflow history are preserved safely and can be restored at any time.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsArchiveConfirmOpen(false)}
                            className="text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleArchiveBoard}
                            disabled={isArchiving}
                            className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black"
                        >
                            {isArchiving ? 'Archiving...' : 'Confirm Archive'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <DialogContent className="max-w-md border-white/10 bg-[#1E1E30] text-white">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-rose-400 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-rose-500" />
                            <span>Delete "{board.title}"?</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-400">
                            This action will soft-delete the board. Only Super Admin has permission to execute this operation.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsDeleteConfirmOpen(false)}
                            className="text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDeleteBoard}
                            disabled={isDeleting}
                            className="text-xs font-bold"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Board'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
