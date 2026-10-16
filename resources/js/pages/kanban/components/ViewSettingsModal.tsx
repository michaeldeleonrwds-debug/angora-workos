import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    Check,
    Columns3,
    Eye,
    EyeOff,
    Filter,
    Layers,
    Layout,
    SlidersHorizontal,
    Star,
    User,
    Users,
    X,
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
import { showToast } from '@/components/toast';
import { BoardColumn, BoardView } from '../types';

interface ViewSettingsModalProps {
    view: BoardView | null;
    boardColumns: BoardColumn[];
    isOpen: boolean;
    onClose: () => void;
    canManage?: boolean;
}

const VIEW_TYPES = [
    { value: 'table', label: 'Main Table' },
    { value: 'kanban', label: 'Kanban Board' },
    { value: 'calendar', label: 'Calendar' },
    { value: 'timeline', label: 'Timeline Overview' },
    { value: 'gantt', label: 'Gantt Chart' },
    { value: 'workload', label: 'Workload & Capacity' },
    { value: 'chart', label: 'Production Chart' },
    { value: 'files', label: 'Files & Assets' },
];

const DEFAULT_BOARD_COLUMNS: BoardColumn[] = [
    { id: -1, board_id: 0, key: 'task', title: 'Task Name', type: 'text', position: 0, is_visible: true, width: 220 },
    { id: -2, board_id: 0, key: 'status', title: 'Status', type: 'status', position: 1, is_visible: true, width: 140 },
    { id: -3, board_id: 0, key: 'person', title: 'Assignee', type: 'person', position: 2, is_visible: true, width: 140 },
    { id: -4, board_id: 0, key: 'priority', title: 'Priority', type: 'priority', position: 3, is_visible: true, width: 120 },
    { id: -5, board_id: 0, key: 'due_date', title: 'Due Date', type: 'date', position: 4, is_visible: true, width: 130 },
    { id: -6, board_id: 0, key: 'progress', title: 'Progress', type: 'progress', position: 5, is_visible: true, width: 120 },
];

export default function ViewSettingsModal({
    view,
    boardColumns = [],
    isOpen,
    onClose,
    canManage = true,
}: ViewSettingsModalProps) {
    if (!view) return null;

    const effectiveColumns = boardColumns && boardColumns.length > 0 && Boolean(boardColumns[0]?.key)
        ? boardColumns
        : DEFAULT_BOARD_COLUMNS;

    const [name, setName] = useState(view.name);
    const [type, setType] = useState(view.type);
    const [isDefault, setIsDefault] = useState(Boolean(view.is_default));
    const [density, setDensity] = useState<'compact' | 'regular' | 'relaxed'>(
        view.settings?.density || 'regular'
    );
    const [groupBy, setGroupBy] = useState<string>(view.settings?.group_by || 'group');
    const [sortBy, setSortBy] = useState<string>(view.settings?.sort_by || 'position');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
        view.settings?.sort_direction || 'asc'
    );
    const [isPersonal, setIsPersonal] = useState<boolean>(
        Boolean(view.settings?.is_personal)
    );
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() => {
        if (view.settings?.visible_columns && Array.isArray(view.settings.visible_columns)) {
            return view.settings.visible_columns;
        }
        return effectiveColumns.filter((c) => c.is_visible !== false).map((c) => c.key);
    });

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && view) {
            setName(view.name);
            setType(view.type);
            setIsDefault(Boolean(view.is_default));
            setDensity(view.settings?.density || 'regular');
            setGroupBy(view.settings?.group_by || 'group');
            setSortBy(view.settings?.sort_by || 'position');
            setSortDirection(view.settings?.sort_direction || 'asc');
            setIsPersonal(Boolean(view.settings?.is_personal));
            if (view.settings?.visible_columns && Array.isArray(view.settings.visible_columns)) {
                setVisibleColumnKeys(view.settings.visible_columns);
            } else {
                setVisibleColumnKeys(effectiveColumns.filter((c) => c.is_visible !== false).map((c) => c.key));
            }
        }
    }, [isOpen, view, effectiveColumns]);

    const handleToggleColumnKey = (key: string) => {
        setVisibleColumnKeys((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        router.patch(
            `/kanban/views/${view.id}`,
            {
                name,
                type,
                is_default: isDefault,
                settings: {
                    density,
                    group_by: groupBy,
                    sort_by: sortBy,
                    sort_direction: sortDirection,
                    visible_columns: visibleColumnKeys,
                    is_personal: isPersonal,
                },
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSaving(false);
                    onClose();
                    showToast({ title: 'View settings saved', variant: 'success' });
                },
                onError: () => {
                    setIsSaving(false);
                    showToast({ title: 'Failed to update view settings', variant: 'error' });
                },
            }
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg border-white/10 bg-[#1E1E30] text-white">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-[#A25DDC]" />
                        <span>View Settings — {view.name}</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-400">
                        Configure display density, grouping, sorting, and visible columns for this view.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSave} className="space-y-4 py-2">
                    {/* View Name & Type */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-300">View Name</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="h-8 border-white/10 bg-[#28283E] text-xs text-white"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-300">View Type</Label>
                            <Select value={type} onValueChange={(val: any) => setType(val)}>
                                <SelectTrigger className="h-8 border-white/10 bg-[#28283E] text-xs text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-[#1E1E30] text-white">
                                    {VIEW_TYPES.map((t) => (
                                        <SelectItem key={t.value} value={t.value} className="text-xs">
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Density & Grouping */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-300">Display Density</Label>
                            <Select value={density} onValueChange={(d: any) => setDensity(d)}>
                                <SelectTrigger className="h-8 border-white/10 bg-[#28283E] text-xs text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-[#1E1E30] text-white">
                                    <SelectItem value="compact" className="text-xs">Compact (Dense)</SelectItem>
                                    <SelectItem value="regular" className="text-xs">Regular (Default)</SelectItem>
                                    <SelectItem value="relaxed" className="text-xs">Relaxed (Spacious)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-300">Grouping</Label>
                            <Select value={groupBy} onValueChange={setGroupBy}>
                                <SelectTrigger className="h-8 border-white/10 bg-[#28283E] text-xs text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-[#1E1E30] text-white">
                                    <SelectItem value="group" className="text-xs">By Group (Default)</SelectItem>
                                    <SelectItem value="status" className="text-xs">By Status</SelectItem>
                                    <SelectItem value="person" className="text-xs">By Assignee</SelectItem>
                                    <SelectItem value="priority" className="text-xs">By Priority</SelectItem>
                                    <SelectItem value="none" className="text-xs">No Grouping</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Sorting */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-300">Sort By</Label>
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="h-8 border-white/10 bg-[#28283E] text-xs text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-[#1E1E30] text-white">
                                    <SelectItem value="position" className="text-xs">Manual Order</SelectItem>
                                    <SelectItem value="due_date" className="text-xs">Due Date</SelectItem>
                                    <SelectItem value="priority" className="text-xs">Priority</SelectItem>
                                    <SelectItem value="created_at" className="text-xs">Creation Date</SelectItem>
                                    <SelectItem value="title" className="text-xs">Task Name (A-Z)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-300">Direction</Label>
                            <Select value={sortDirection} onValueChange={(d: any) => setSortDirection(d)}>
                                <SelectTrigger className="h-8 border-white/10 bg-[#28283E] text-xs text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-[#1E1E30] text-white">
                                    <SelectItem value="asc" className="text-xs">Ascending (Low-High / A-Z)</SelectItem>
                                    <SelectItem value="desc" className="text-xs">Descending (High-Low / Z-A)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Visible Columns in this view */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-300">
                            Visible Columns in this View
                        </Label>
                        <div className="max-h-36 overflow-y-auto rounded-xl border border-white/10 bg-[#28283E]/50 p-2 space-y-1">
                            {effectiveColumns.map((col) => {
                                const isChecked = visibleColumnKeys.includes(col.key);
                                return (
                                    <label
                                        key={col.key}
                                        className="flex items-center justify-between rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-white/5 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleToggleColumnKey(col.key)}
                                                className="rounded border-white/20 bg-[#1E1E30] text-[#A25DDC] focus:ring-0"
                                            />
                                            <span>{col.title}</span>
                                        </div>
                                        <span className="text-[10px] uppercase font-mono text-slate-500">
                                            {col.type}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Shared vs Personal preference & Default View toggles */}
                    <div className="space-y-2 rounded-xl border border-white/10 bg-[#28283E]/30 p-3">
                        <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isDefault}
                                onChange={(e) => setIsDefault(e.target.checked)}
                                className="rounded border-white/20 bg-[#1E1E30] text-amber-500 focus:ring-0"
                            />
                            <div className="flex items-center gap-1.5">
                                <Star className="h-3.5 w-3.5 text-amber-500" />
                                <span className="font-semibold text-white">Set as Default View</span>
                            </div>
                        </label>

                        <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
                            <input
                                type="checkbox"
                                checked={isPersonal}
                                onChange={(e) => setIsPersonal(e.target.checked)}
                                className="rounded border-white/20 bg-[#1E1E30] text-[#579BFC] focus:ring-0"
                            />
                            <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-[#579BFC]" />
                                <span>Save as Personal View (Does not affect other users)</span>
                            </div>
                        </label>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving || !canManage}
                            className="gap-1.5 text-xs font-bold bg-[#A25DDC] hover:bg-[#8e48cb] text-white"
                        >
                            {isSaving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Check className="h-3.5 w-3.5" />
                            )}
                            <span>Save Settings</span>
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
