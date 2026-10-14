import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { router } from '@inertiajs/react';
import {
    BarChart3,
    Calendar,
    Check,
    ChevronDown,
    Clock,
    Columns3,
    Filter,
    GanttChartSquare,
    Layers,
    LayoutGrid,
    MoreVertical,
    Paperclip,
    Plus,
    Search,
    SlidersHorizontal,
    Star,
    Table2,
    Trash2,
    Users,
    Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { BoardView, KanbanBoard, User } from '../types';

interface BoardHeaderProps {
    board: KanbanBoard;
    activeTab: string;
    onTabChange: (tab: any) => void;
    searchTerm: string;
    onSearchChange: (val: string) => void;
    personFilter: string;
    onPersonFilterChange: (val: string) => void;
    priorityFilter: string;
    onPriorityFilterChange: (val: string) => void;
    users: User[];
    onOpenNewTask: () => void;
    onOpenNewGroup: () => void;
    onOpenNewColumn: () => void;
    onOpenAutomate?: () => void;
    onOpenBlueprints?: () => void;
}

export default function BoardHeader({
    board,
    activeTab,
    onTabChange,
    searchTerm,
    onSearchChange,
    personFilter,
    onPersonFilterChange,
    priorityFilter,
    onPriorityFilterChange,
    users = [],
    onOpenNewTask,
    onOpenNewGroup,
    onOpenNewColumn,
    onOpenAutomate,
    onOpenBlueprints,
}: BoardHeaderProps) {
    const [isAddViewModalOpen, setIsAddViewModalOpen] = useState(false);
    const [newViewName, setNewViewName] = useState('');
    const [newViewType, setNewViewType] = useState<string>('table');

    // Available built-in views from board database or fallbacks
    const views: BoardView[] =
        board.views && board.views.length > 0
            ? board.views
            : [
                  { id: 1, board_id: board.id, name: 'Main Table', type: 'table', is_default: true, position: 0 },
                  { id: 2, board_id: board.id, name: 'Kanban', type: 'kanban', is_default: false, position: 1 },
                  { id: 3, board_id: board.id, name: 'Calendar', type: 'calendar', is_default: false, position: 2 },
                  { id: 4, board_id: board.id, name: 'Gantt', type: 'gantt', is_default: false, position: 3 },
                  { id: 5, board_id: board.id, name: 'Workload', type: 'workload', is_default: false, position: 4 },
                  { id: 6, board_id: board.id, name: 'Chart', type: 'chart', is_default: false, position: 5 },
                  { id: 7, board_id: board.id, name: 'Files', type: 'files', is_default: false, position: 6 },
                  { id: 8, board_id: board.id, name: 'Gallery', type: 'gallery', is_default: false, position: 7 },
              ];

    const getViewIcon = (type: string) => {
        switch (type) {
            case 'table':
                return <Table2 className="h-4 w-4" />;
            case 'kanban':
                return <Columns3 className="h-4 w-4" />;
            case 'calendar':
                return <Calendar className="h-4 w-4" />;
            case 'timeline':
                return <Clock className="h-4 w-4" />;
            case 'gantt':
                return <GanttChartSquare className="h-4 w-4" />;
            case 'workload':
                return <Users className="h-4 w-4" />;
            case 'chart':
                return <BarChart3 className="h-4 w-4" />;
            case 'files':
                return <Paperclip className="h-4 w-4" />;
            case 'gallery':
                return <LayoutGrid className="h-4 w-4" />;
            default:
                return <Table2 className="h-4 w-4" />;
        }
    };

    const handleCreateView = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newViewName.trim() || !board.id) return;

        router.post(
            `/kanban/boards/${board.id}/views`,
            {
                name: newViewName.trim(),
                type: newViewType,
            },
            {
                onSuccess: () => {
                    setIsAddViewModalOpen(false);
                    setNewViewName('');
                    onTabChange(newViewType);
                },
            },
        );
    };

    const handleDeleteView = (view: BoardView, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Delete view "${view.name}"?`)) {
            router.delete(`/kanban/views/${view.id}`, {
                onSuccess: () => {
                    if (activeTab === view.type) {
                        onTabChange('table');
                    }
                },
            });
        }
    };

    const handleSetDefaultView = (view: BoardView, e: React.MouseEvent) => {
        e.stopPropagation();
        router.patch(`/kanban/views/${view.id}`, {
            is_default: true,
        });
    };

    const viewTypeOptions = [
        { type: 'table', label: 'Main Table', desc: 'Custom columns, inline cell editing, expandable subtasks' },
        { type: 'kanban', label: 'Kanban Board', desc: 'Cards across customizable workflow stages' },
        { type: 'calendar', label: 'Calendar View', desc: 'Month and week view with drag-and-drop reschedule' },
        { type: 'gantt', label: 'Gantt & Dependencies', desc: 'Task sequencing, timeline dependencies, milestones' },
        { type: 'workload', label: 'Workload & Capacity', desc: 'Resource allocation, daily/weekly load indicators' },
        { type: 'chart', label: 'Dashboard & Charts', desc: 'Real aggregated status, priority, and progress analytics' },
        { type: 'files', label: 'Files & Asset Vault', desc: 'Centralized gallery of all attachments across tasks' },
        { type: 'gallery', label: 'Visual Gallery', desc: 'Cards layout showcasing visual media & task details' },
    ];

    return (
        <div className="mb-5 space-y-4">
            {/* Board Title & Top Level Actions */}
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-foreground flex items-center gap-2 text-2xl font-black tracking-tight">
                        {board.title}
                        <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wider uppercase">
                            {board.visibility || 'Public'}
                        </span>
                    </h1>
                    {board.description && <p className="text-muted-foreground mt-0.5 max-w-2xl text-xs">{board.description}</p>}
                </div>

                {/* Primary Board Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        onClick={onOpenNewTask}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 rounded-xl px-3.5 text-xs font-bold shadow-xs"
                    >
                        <Plus className="mr-1 h-4 w-4" />
                        New Item
                    </Button>

                    <Button
                        variant="outline"
                        onClick={onOpenNewGroup}
                        className="border-border bg-card hover:bg-muted/60 h-9 rounded-xl px-3 text-xs"
                    >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add Group
                    </Button>

                    <Button
                        variant="outline"
                        onClick={onOpenNewColumn}
                        className="border-border bg-card hover:bg-muted/60 h-9 rounded-xl px-3 text-xs"
                    >
                        <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
                        Add Column
                    </Button>

                    {onOpenAutomate && (
                        <Button
                            variant="outline"
                            onClick={onOpenAutomate}
                            className="border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary h-9 rounded-xl px-3 text-xs font-bold shadow-2xs"
                        >
                            <Zap className="text-primary mr-1 h-3.5 w-3.5" />
                            Automate
                            {(board.automations || []).length > 0 && (
                                <span className="py-0.2 bg-primary/20 text-primary ml-1 rounded-full px-1.5 text-[10px]">
                                    {(board.automations || []).length}
                                </span>
                            )}
                        </Button>
                    )}

                    {onOpenBlueprints && (
                        <Button
                            variant="outline"
                            onClick={onOpenBlueprints}
                            className="border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-500 h-9 rounded-xl px-3 text-xs font-bold shadow-2xs"
                        >
                            <Layers className="mr-1 h-3.5 w-3.5" />
                            Blueprints
                        </Button>
                    )}
                </div>
            </div>

            {/* Views Switcher & Filter Toolbar */}
            <div className="border-border/50 flex flex-col items-stretch justify-between gap-3 border-b pt-1 pb-2 md:flex-row md:items-center">
                {/* View Tabs */}
                <div className="scrollbar-none flex max-w-full items-center gap-1 overflow-x-auto">
                    {views.map((v) => {
                        const isActive = activeTab === v.type;
                        return (
                            <div key={v.id} className="group/tab relative flex items-center">
                                <button
                                    onClick={() => onTabChange(v.type)}
                                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                                        isActive
                                            ? 'bg-primary/10 text-primary border-primary/30 shadow-xs'
                                            : 'text-muted-foreground hover:bg-muted/50 border-transparent bg-transparent'
                                    }`}
                                >
                                    {getViewIcon(v.type)}
                                    <span>{v.name}</span>
                                    {v.is_default && <span className="bg-primary h-1.5 w-1.5 rounded-full" title="Default View" />}
                                </button>

                                {/* View Settings Dropdown */}
                                {v.id > 0 && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="hover:bg-muted text-muted-foreground ml-[-6px] rounded-md p-1 opacity-0 transition-opacity group-hover/tab:opacity-100">
                                                <MoreVertical className="h-3 w-3" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-40 rounded-xl text-xs">
                                            <DropdownMenuItem onClick={(e) => handleSetDefaultView(v, e)}>
                                                <Star className="mr-2 h-3.5 w-3.5 text-amber-500" />
                                                Set as Default
                                            </DropdownMenuItem>
                                            {views.length > 1 && (
                                                <DropdownMenuItem
                                                    onClick={(e) => handleDeleteView(v, e)}
                                                    className="text-rose-600 focus:text-rose-600"
                                                >
                                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                    Delete View
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        );
                    })}

                    {/* Add View Button */}
                    <button
                        onClick={() => setIsAddViewModalOpen(true)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted/60 border-border flex items-center gap-1 rounded-xl border border-dashed px-2.5 py-1.5 text-xs font-semibold transition-all"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add View</span>
                    </button>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative min-w-[160px] flex-1 sm:flex-initial">
                        <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                        <Input
                            placeholder="Search items..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="bg-card border-border h-8 rounded-xl pr-2.5 pl-8 text-xs"
                        />
                    </div>

                    {/* Person Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="border-border h-8 gap-1.5 rounded-xl text-xs">
                                <Users className="text-muted-foreground h-3.5 w-3.5" />
                                <span>{personFilter === 'all' ? 'Person' : users.find((u) => String(u.id) === personFilter)?.name || 'Person'}</span>
                                <ChevronDown className="text-muted-foreground h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <DropdownMenuItem onClick={() => onPersonFilterChange('all')} className="text-xs">
                                <span>All People</span>
                                {personFilter === 'all' && <Check className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
                            </DropdownMenuItem>
                            {users.map((u) => (
                                <DropdownMenuItem key={u.id} onClick={() => onPersonFilterChange(String(u.id))} className="text-xs">
                                    <span className="truncate">{u.name}</span>
                                    {personFilter === String(u.id) && <Check className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Priority Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="border-border h-8 gap-1.5 rounded-xl text-xs">
                                <Filter className="text-muted-foreground h-3.5 w-3.5" />
                                <span>{priorityFilter === 'all' ? 'Priority' : priorityFilter}</span>
                                <ChevronDown className="text-muted-foreground h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 rounded-xl">
                            {['all', 'Urgent', 'High', 'Medium', 'Low'].map((p) => (
                                <DropdownMenuItem key={p} onClick={() => onPriorityFilterChange(p)} className="text-xs capitalize">
                                    <span>{p === 'all' ? 'All Priorities' : p}</span>
                                    {priorityFilter === p && <Check className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Add New View Modal */}
            <Dialog open={isAddViewModalOpen} onOpenChange={setIsAddViewModalOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md">
                    <form onSubmit={handleCreateView}>
                        <DialogHeader>
                            <DialogTitle>Add New Board View</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4 text-xs">
                            <div>
                                <label className="mb-1 block font-semibold">View Name</label>
                                <Input
                                    placeholder="e.g. Master Schedule, Resource Planning"
                                    value={newViewName}
                                    onChange={(e) => setNewViewName(e.target.value)}
                                    required
                                    className="h-9 rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block font-semibold">View Type</label>
                                <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto pr-1">
                                    {viewTypeOptions.map((opt) => (
                                        <div
                                            key={opt.type}
                                            onClick={() => setNewViewType(opt.type)}
                                            className={`cursor-pointer rounded-xl border p-2.5 transition-all ${
                                                newViewType === opt.type
                                                    ? 'border-primary bg-primary/10 shadow-xs'
                                                    : 'border-border/70 hover:border-primary/40 bg-card'
                                            }`}
                                        >
                                            <div className="text-foreground flex items-center gap-1.5 font-bold">
                                                {getViewIcon(opt.type)}
                                                <span>{opt.label}</span>
                                            </div>
                                            <p className="text-muted-foreground mt-1 line-clamp-2 text-[10px]">{opt.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddViewModalOpen(false)} className="h-9 rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!newViewName.trim()} className="bg-primary hover:bg-primary/90 h-9 rounded-xl">
                                Add View
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
