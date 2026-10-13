import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { router } from '@inertiajs/react';
import { Check, ChevronDown, Copy, Folder, Layout, MoreHorizontal, Plus, Settings, Star, Trash2, UserPlus, Users } from 'lucide-react';
import React, { useState } from 'react';
import { KanbanBoard, User, Workspace } from '../types';

interface WorkspaceBoardNavProps {
    workspaces: Workspace[];
    activeWorkspace?: Workspace;
    boards: KanbanBoard[];
    activeBoard?: KanbanBoard;
    users?: User[];
}

export default function WorkspaceBoardNav({ workspaces = [], activeWorkspace, boards = [], activeBoard, users = [] }: WorkspaceBoardNavProps) {
    const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
    const [isEditWorkspaceOpen, setIsEditWorkspaceOpen] = useState(false);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);

    // Create / Edit Workspace Form
    const [workspaceName, setWorkspaceName] = useState('');
    const [workspaceDesc, setWorkspaceDesc] = useState('');
    const [workspaceColor, setWorkspaceColor] = useState('#C8AEF5');

    // Create Board Form
    const [boardTitle, setBoardTitle] = useState('');
    const [boardDesc, setBoardDesc] = useState('');
    const [boardFolderName, setBoardFolderName] = useState('');
    const [boardVisibility, setBoardVisibility] = useState<'public' | 'private' | 'shareable'>('public');

    // Member Add Form
    const [newMemberUserId, setNewMemberUserId] = useState<string>('');
    const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member' | 'viewer'>('member');

    // Folder Filter
    const [selectedFolder, setSelectedFolder] = useState<string>('all');

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

    const handleToggleWorkspaceFavorite = (wsId: number) => {
        router.post(`/workspaces/${wsId}/favorite`);
    };

    const handleToggleBoardFavorite = (boardId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        router.post(`/kanban/boards/${boardId}/favorite`);
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

    // Filter boards belonging to active workspace
    const currentWorkspaceBoards = boards.filter((b) => !b.workspace_id || b.workspace_id === activeWorkspace?.id);

    // Extract unique folders
    const availableFolders = Array.from(new Set(currentWorkspaceBoards.map((b) => b.folder_name).filter(Boolean) as string[]));

    // Apply folder filter
    const visibleBoards = currentWorkspaceBoards.filter((b) => {
        if (selectedFolder === 'all') return true;
        return b.folder_name === selectedFolder;
    });

    const activeMembers = activeWorkspace?.members || [];

    return (
        <div className="border-border/50 mb-4 flex flex-col gap-2.5 border-b pb-3">
            {/* Top Bar: Workspace Selector, Favorite, Members, Settings */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {/* Workspace Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="bg-card border-border hover:bg-muted/60 text-foreground flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-bold shadow-xs transition-all">
                                <span
                                    className="h-3.5 w-3.5 flex-shrink-0 rounded-md"
                                    style={{ backgroundColor: activeWorkspace?.color || '#C8AEF5' }}
                                />
                                <span className="max-w-[150px] truncate">{activeWorkspace?.name || 'Workspace'}</span>
                                <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-72 rounded-xl p-1.5 shadow-lg">
                            <div className="text-muted-foreground flex items-center justify-between px-2 py-1.5 text-xs font-semibold tracking-wider uppercase">
                                <span>Workspaces</span>
                            </div>
                            {workspaces.map((ws) => (
                                <DropdownMenuItem
                                    key={ws.id}
                                    onClick={() => handleSelectWorkspace(ws.id)}
                                    className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="h-3 w-3 flex-shrink-0 rounded-md" style={{ backgroundColor: ws.color || '#C8AEF5' }} />
                                        <span className="truncate text-sm font-medium">{ws.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {ws.is_favorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                                        {ws.id === activeWorkspace?.id && <Check className="h-4 w-4 text-emerald-500" />}
                                    </div>
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem
                                onClick={() => setIsCreateWorkspaceOpen(true)}
                                className="text-primary flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 font-medium"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Create New Workspace</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Workspace Favorite Star */}
                    {activeWorkspace && (
                        <button
                            onClick={() => handleToggleWorkspaceFavorite(activeWorkspace.id)}
                            className="border-border bg-card hover:bg-muted text-muted-foreground rounded-lg border p-1.5 transition-colors hover:text-amber-400"
                            title={activeWorkspace.is_favorite ? 'Remove Favorite' : 'Mark as Favorite'}
                        >
                            <Star className={`h-3.5 w-3.5 ${activeWorkspace.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>
                    )}

                    {/* Workspace Members Button */}
                    <button
                        onClick={() => setIsMembersModalOpen(true)}
                        className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all"
                    >
                        <Users className="h-3.5 w-3.5" />
                        <span>Members ({activeMembers.length})</span>
                    </button>

                    {/* Edit Workspace Settings Button */}
                    <button
                        onClick={handleOpenEditWorkspace}
                        className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg border p-1.5 transition-colors"
                        title="Edit Workspace"
                    >
                        <Settings className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Folder filter if folders exist */}
                {availableFolders.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Folder className="h-3.5 w-3.5" />
                            <span>Folder:</span>
                        </span>
                        <button
                            onClick={() => setSelectedFolder('all')}
                            className={`rounded-md px-2 py-0.5 font-semibold ${
                                selectedFolder === 'all' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            All
                        </button>
                        {availableFolders.map((f) => (
                            <button
                                key={f}
                                onClick={() => setSelectedFolder(f)}
                                className={`rounded-md px-2 py-0.5 font-semibold ${
                                    selectedFolder === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Board Tabs / Pills Row */}
            <div className="scrollbar-none flex max-w-full items-center gap-1.5 overflow-x-auto pb-1">
                {visibleBoards.map((b) => {
                    const isActive = b.id === activeBoard?.id;
                    return (
                        <div
                            key={b.id}
                            onClick={() => handleSelectBoard(b.id)}
                            className={`group flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                                isActive
                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                    : 'bg-card text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground'
                            }`}
                        >
                            <Layout className="h-3.5 w-3.5 opacity-80" />
                            <span className="max-w-[130px] truncate">{b.title}</span>

                            {b.is_favorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}

                            {/* Board Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        onClick={(e) => e.stopPropagation()}
                                        className={`rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10 ${
                                            isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                                        }`}
                                    >
                                        <MoreHorizontal className="h-3 w-3" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                    <DropdownMenuItem
                                        onClick={(e) => handleToggleBoardFavorite(b.id, e)}
                                        className="flex cursor-pointer items-center gap-2 text-xs"
                                    >
                                        <Star className="h-3.5 w-3.5 text-amber-400" />
                                        <span>{b.is_favorite ? 'Unfavorite Board' : 'Favorite Board'}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={(e) => handleDuplicateBoard(b.id, e)}
                                        className="flex cursor-pointer items-center gap-2 text-xs"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                        <span>Duplicate Board</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={(e) => handleDeleteBoard(b.id, e)}
                                        className="flex cursor-pointer items-center gap-2 text-xs text-red-500"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>Delete Board</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                })}

                {/* + Add Board Button */}
                <button
                    onClick={() => setIsCreateBoardOpen(true)}
                    className="border-border text-muted-foreground hover:text-foreground hover:border-primary/60 flex items-center gap-1 rounded-xl border border-dashed px-2.5 py-1.5 text-xs font-semibold transition-all"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Board</span>
                </button>
            </div>

            {/* Create Workspace Modal */}
            <Dialog open={isCreateWorkspaceOpen} onOpenChange={setIsCreateWorkspaceOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleCreateWorkspace}>
                        <DialogHeader>
                            <DialogTitle>Create Workspace</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="ws-name">Workspace Name</Label>
                                <Input
                                    id="ws-name"
                                    placeholder="e.g. Operations, Product Team, Marketing"
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="ws-desc">Description (Optional)</Label>
                                <Input
                                    id="ws-desc"
                                    placeholder="Brief overview of this workspace"
                                    value={workspaceDesc}
                                    onChange={(e) => setWorkspaceDesc(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Workspace Theme Color</Label>
                                <div className="mt-2 flex items-center gap-2">
                                    {['#C8AEF5', '#D8F779', '#579BFC', '#00C875', '#FDAB3D', '#E2445C', '#A25DDC'].map((hex) => (
                                        <button
                                            type="button"
                                            key={hex}
                                            onClick={() => setWorkspaceColor(hex)}
                                            className={`h-6 w-6 rounded-full border-2 transition-all ${
                                                workspaceColor === hex ? 'border-foreground scale-110' : 'border-transparent'
                                            }`}
                                            style={{ backgroundColor: hex }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateWorkspaceOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Create Workspace</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Workspace Modal */}
            <Dialog open={isEditWorkspaceOpen} onOpenChange={setIsEditWorkspaceOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleEditWorkspace}>
                        <DialogHeader>
                            <DialogTitle>Edit Workspace Settings</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="edit-ws-name">Workspace Name</Label>
                                <Input
                                    id="edit-ws-name"
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-ws-desc">Description</Label>
                                <Input id="edit-ws-desc" value={workspaceDesc} onChange={(e) => setWorkspaceDesc(e.target.value)} className="mt-1" />
                            </div>
                            <div>
                                <Label>Theme Color</Label>
                                <div className="mt-2 flex items-center gap-2">
                                    {['#C8AEF5', '#D8F779', '#579BFC', '#00C875', '#FDAB3D', '#E2445C', '#A25DDC'].map((hex) => (
                                        <button
                                            type="button"
                                            key={hex}
                                            onClick={() => setWorkspaceColor(hex)}
                                            className={`h-6 w-6 rounded-full border-2 transition-all ${
                                                workspaceColor === hex ? 'border-foreground scale-110' : 'border-transparent'
                                            }`}
                                            style={{ backgroundColor: hex }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditWorkspaceOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Workspace Members Modal */}
            <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
                <DialogContent className="rounded-2xl sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Manage Workspace Members</DialogTitle>
                    </DialogHeader>

                    {/* Add Member Form */}
                    <form onSubmit={handleAddMember} className="border-border flex items-center gap-2 border-b pt-2 pb-4">
                        <select
                            value={newMemberUserId}
                            onChange={(e) => setNewMemberUserId(e.target.value)}
                            required
                            className="border-border bg-background h-9 flex-1 rounded-xl border px-3 text-xs"
                        >
                            <option value="">Select a user to invite...</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name} ({u.role})
                                </option>
                            ))}
                        </select>

                        <select
                            value={newMemberRole}
                            onChange={(e) => setNewMemberRole(e.target.value as any)}
                            className="border-border bg-background h-9 rounded-xl border px-2.5 text-xs font-semibold capitalize"
                        >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                            <option value="viewer">Viewer</option>
                        </select>

                        <Button type="submit" size="sm" className="h-9 gap-1 text-xs font-bold">
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>Add</span>
                        </Button>
                    </form>

                    {/* Current Members List */}
                    <div className="max-h-60 space-y-2 overflow-y-auto py-2">
                        {activeMembers.map((m) => (
                            <div
                                key={m.id}
                                className="border-border/60 bg-muted/20 flex items-center justify-between rounded-xl border p-2.5 text-xs"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold">
                                        {m.user?.name.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <div className="text-foreground font-bold">{m.user?.name || 'User'}</div>
                                        <div className="text-muted-foreground text-[10px]">{m.user?.email}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="bg-muted rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">{m.role}</span>
                                    {m.role !== 'owner' && (
                                        <button
                                            onClick={() => handleRemoveMember(m.id)}
                                            className="text-muted-foreground rounded p-1 transition-colors hover:bg-red-500/10 hover:text-red-500"
                                            title="Remove member"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button type="button" onClick={() => setIsMembersModalOpen(false)}>
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
                            <DialogTitle>Create Board in {activeWorkspace?.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="b-title">Board Title</Label>
                                <Input
                                    id="b-title"
                                    placeholder="e.g. Q4 Sprints, Client Projects, Bug Tracker"
                                    value={boardTitle}
                                    onChange={(e) => setBoardTitle(e.target.value)}
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="b-desc">Description</Label>
                                <Input
                                    id="b-desc"
                                    placeholder="Board purpose and goals"
                                    value={boardDesc}
                                    onChange={(e) => setBoardDesc(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="b-folder">Folder (Optional)</Label>
                                <Input
                                    id="b-folder"
                                    placeholder="e.g. Sprints, Operations, Client Work"
                                    value={boardFolderName}
                                    onChange={(e) => setBoardFolderName(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Visibility</Label>
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                    {(['public', 'private', 'shareable'] as const).map((mode) => (
                                        <button
                                            type="button"
                                            key={mode}
                                            onClick={() => setBoardVisibility(mode)}
                                            className={`rounded-xl border px-3 py-2 text-xs font-semibold capitalize transition-all ${
                                                boardVisibility === mode
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'border-border bg-card text-muted-foreground'
                                            }`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateBoardOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Create Board</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
