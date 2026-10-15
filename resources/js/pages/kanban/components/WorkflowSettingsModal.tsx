import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, AlertCircle, CheckCircle2, ChevronRight, Loader2, Pencil, Plus, Shield, Trash2, Workflow, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { KanbanBoard } from '../types';

export interface WorkflowStage {
    id: number;
    title: string;
    color: string;
    position: number;
    semantic_category: string | null;
    stage_key: string | null;
    stage_role: string | null;
    is_default: boolean;
    is_archived: boolean;
    task_count: number;
}

export interface WorkflowTransition {
    from_column_id: number;
    to_column_id: number;
    contributor_allowed: boolean;
}

interface WorkflowSettingsData {
    configured: boolean;
    stages: WorkflowStage[];
    transitions: WorkflowTransition[];
    contributor_forbidden_targets: string[];
    contributor_locked_sources: string[];
}

interface WorkflowSettingsModalProps {
    board: KanbanBoard;
    isOpen: boolean;
    onClose: () => void;
}

type EdgeState = 'none' | 'manager' | 'contributor';

const SEMANTIC_OPTIONS = [
    { value: 'not_started', label: 'Not started' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'in_review', label: 'In review' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

const semanticLabel = (value: string | null) => SEMANTIC_OPTIONS.find((o) => o.value === value)?.label || value || '—';

export default function WorkflowSettingsModal({ board, isOpen, onClose }: WorkflowSettingsModalProps) {
    const [data, setData] = useState<WorkflowSettingsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [savingTransitions, setSavingTransitions] = useState(false);
    const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Draft transition matrix: fromId -> toId -> EdgeState
    const [draft, setDraft] = useState<Record<number, Record<number, EdgeState>>>({});

    // Stage add form
    const [showAddStage, setShowAddStage] = useState(false);
    const [newStageTitle, setNewStageTitle] = useState('');
    const [newStageColor, setNewStageColor] = useState('#64748b');
    const [newStageSemantic, setNewStageSemantic] = useState('not_started');

    // Inline stage editing
    const [editingStageId, setEditingStageId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editColor, setEditColor] = useState('#64748b');
    const [editSemantic, setEditSemantic] = useState('not_started');

    const activeStages = (data?.stages || []).filter((s) => !s.is_archived);
    const archivedStages = (data?.stages || []).filter((s) => s.is_archived);

    const buildDraftFromTransitions = useCallback((stages: WorkflowStage[], transitions: WorkflowTransition[]) => {
        const matrix: Record<number, Record<number, EdgeState>> = {};
        stages.forEach((stage) => {
            matrix[stage.id] = {};
        });
        transitions.forEach((t) => {
            if (!matrix[t.from_column_id]) matrix[t.from_column_id] = {};
            matrix[t.from_column_id][t.to_column_id] = t.contributor_allowed ? 'contributor' : 'manager';
        });
        setDraft(matrix);
    }, []);

    const loadData = useCallback(async () => {
        if (!board.id) return;
        setLoading(true);
        setBanner(null);
        try {
            const res = await fetch(`/kanban/boards/${board.id}/workflow`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (!res.ok) throw new Error('Failed to load workflow settings.');
            const json: WorkflowSettingsData = await res.json();
            setData(json);
            buildDraftFromTransitions(json.stages, json.transitions);
        } catch (err: any) {
            setBanner({ type: 'error', message: err?.message || 'Failed to load workflow settings.' });
        } finally {
            setLoading(false);
        }
    }, [board.id, buildDraftFromTransitions]);

    useEffect(() => {
        if (isOpen && board.id) {
            loadData();
        }
    }, [isOpen, board.id, loadData]);

    const refreshAfterStageOp = () => {
        loadData();
    };

    const inertiaDefaults = {
        preserveState: true,
        preserveScroll: true,
        only: ['activeBoard'],
        onFinish: refreshAfterStageOp,
    };

    const handleAddStage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStageTitle.trim()) return;
        setBanner(null);
        router.post(
            `/kanban/boards/${board.id}/stages`,
            {
                title: newStageTitle.trim(),
                color: newStageColor,
                semantic_category: newStageSemantic,
            },
            {
                ...inertiaDefaults,
                onSuccess: () => {
                    setShowAddStage(false);
                    setNewStageTitle('');
                    setBanner({ type: 'success', message: 'Stage added.' });
                },
                onError: (errors: any) => {
                    setBanner({ type: 'error', message: errors?.title || errors?.status || 'Could not add stage.' });
                },
            },
        );
    };

    const startEditStage = (stage: WorkflowStage) => {
        setEditingStageId(stage.id);
        setEditTitle(stage.title);
        setEditColor(stage.color || '#64748b');
        setEditSemantic(stage.semantic_category || 'not_started');
        setBanner(null);
    };

    const handleUpdateStage = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingStageId === null || !editTitle.trim()) return;
        setBanner(null);
        router.patch(
            `/kanban/stages/${editingStageId}`,
            {
                title: editTitle.trim(),
                color: editColor,
                semantic_category: editSemantic,
            },
            {
                ...inertiaDefaults,
                onSuccess: () => {
                    setEditingStageId(null);
                    setBanner({ type: 'success', message: 'Stage updated.' });
                },
                onError: (errors: any) => {
                    setBanner({ type: 'error', message: errors?.title || errors?.status || 'Could not update stage.' });
                },
            },
        );
    };

    const handleArchiveStage = (stage: WorkflowStage) => {
        if (!confirm(`Archive stage "${stage.title}"?`)) return;
        setBanner(null);
        router.delete(`/kanban/stages/${stage.id}`, {
            ...inertiaDefaults,
            onSuccess: () => setBanner({ type: 'success', message: 'Stage archived.' }),
            onError: (errors: any) => {
                setBanner({
                    type: 'error',
                    message: (typeof errors === 'string' ? errors : null) || 'Could not archive this stage. It may still contain tasks.',
                });
            },
        });
    };

    const handleReorder = (index: number, direction: -1 | 1) => {
        const ordered = [...activeStages];
        const target = index + direction;
        if (target < 0 || target >= ordered.length) return;
        [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
        const stageIds = [...ordered.map((s) => s.id), ...archivedStages.map((s) => s.id)];
        setBanner(null);
        router.post(
            `/kanban/boards/${board.id}/stages/reorder`,
            { stage_ids: stageIds },
            {
                ...inertiaDefaults,
                onSuccess: () => setBanner({ type: 'success', message: 'Stages reordered.' }),
                onError: () => setBanner({ type: 'error', message: 'Could not reorder stages.' }),
            },
        );
    };

    const stageBlocksContributorTarget = (to: WorkflowStage): boolean =>
        to.semantic_category === 'completed' || to.semantic_category === 'cancelled';

    const cycleEdge = (from: WorkflowStage, to: WorkflowStage) => {
        if (from.id === to.id) return;
        const current = draft[from.id]?.[to.id] || 'none';
        let next: EdgeState;
        if (current === 'none') {
            next = 'manager';
        } else if (current === 'manager') {
            next = stageBlocksContributorTarget(to) ? 'none' : 'contributor';
        } else {
            next = 'none';
        }
        setDraft((prev) => ({
            ...prev,
            [from.id]: { ...(prev[from.id] || {}), [to.id]: next },
        }));
        setBanner(null);
    };

    const handleSaveTransitions = async () => {
        const transitions: Array<{ from_column_id: number; to_column_id: number; contributor_allowed: boolean }> = [];
        Object.entries(draft).forEach(([fromId, targets]) => {
            Object.entries(targets).forEach(([toId, state]) => {
                if (state === 'none') return;
                transitions.push({
                    from_column_id: Number(fromId),
                    to_column_id: Number(toId),
                    contributor_allowed: state === 'contributor',
                });
            });
        });

        setSavingTransitions(true);
        setBanner(null);
        try {
            const res = await fetch(`/kanban/boards/${board.id}/workflow/transitions`, {
                method: 'PATCH',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': decodeURIComponent(
                        document.cookie
                            .split('; ')
                            .find((row) => row.startsWith('XSRF-TOKEN='))?.split('=')[1] || '',
                    ),
                },
                body: JSON.stringify({ transitions }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json?.message || 'Could not save transitions.');
            }
            setData((prev) =>
                prev
                    ? { ...prev, configured: json.configured ?? true, transitions: json.transitions || [] }
                    : prev,
            );
            setBanner({ type: 'success', message: 'Transitions saved.' });
        } catch (err: any) {
            setBanner({ type: 'error', message: err?.message || 'Could not save transitions.' });
        } finally {
            setSavingTransitions(false);
        }
    };

    const isProtectedStage = (stage: WorkflowStage): boolean => {
        if (!data) return false;
        if (stage.semantic_category === 'completed' || stage.semantic_category === 'in_review') return true;
        if (stage.stage_key && data.contributor_forbidden_targets.includes(stage.stage_key)) return true;
        if (stage.stage_key && data.contributor_locked_sources.includes(stage.stage_key)) return true;
        return false;
    };

    const edgeCount = (state: EdgeState) =>
        Object.values(draft).reduce((acc, targets) => acc + Object.values(targets).filter((s) => s === state).length, 0);

    const contributorPreview = activeStages.flatMap((from) =>
        activeStages
            .filter((to) => draft[from.id]?.[to.id] === 'contributor')
            .map((to) => ({ from: from.title, to: to.title })),
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Workflow className="text-primary h-5 w-5" />
                        Workflow Settings — {board.title}
                    </DialogTitle>
                </DialogHeader>

                {loading && (
                    <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading workflow…
                    </div>
                )}

                {!loading && !data && (
                    <div className="text-muted-foreground py-10 text-center text-sm">Unable to load workflow settings.</div>
                )}

                {!loading && data && (
                    <div className="space-y-6 py-2 text-xs">
                        {banner && (
                            <div
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                                    banner.type === 'success'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                                        : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                            >
                                {banner.type === 'success' ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                ) : (
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                )}
                                <span>{banner.message}</span>
                            </div>
                        )}

                        {/* Status */}
                        <div className="bg-muted/40 rounded-xl border border-border/60 px-3 py-2">
                            {data.configured ? (
                                <p className="text-muted-foreground">
                                    <span className="text-foreground font-semibold">Configured workflow.</span> Contributor moves are
                                    restricted to the green edges below. Managers may move tasks between any stages.
                                </p>
                            ) : (
                                <p className="text-muted-foreground">
                                    <span className="text-foreground font-semibold">Legacy board.</span> No transitions are saved yet —
                                    contributors follow the classic semantic rules. Saving edges below enables the dynamic workflow.
                                </p>
                            )}
                        </div>

                        {/* Stages */}
                        <section>
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-sm font-bold">Stages ({activeStages.length})</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAddStage((v) => !v)}
                                    className="h-8 rounded-lg text-xs"
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    Add Stage
                                </Button>
                            </div>

                            {showAddStage && (
                                <form onSubmit={handleAddStage} className="border-border/70 bg-card mb-3 space-y-3 rounded-xl border p-3">
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <div>
                                            <Label className="mb-1 block font-semibold">Title</Label>
                                            <Input
                                                value={newStageTitle}
                                                onChange={(e) => setNewStageTitle(e.target.value)}
                                                placeholder="e.g. Client Feedback"
                                                className="h-8 rounded-lg text-xs"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label className="mb-1 block font-semibold">Color</Label>
                                            <input
                                                type="color"
                                                value={newStageColor}
                                                onChange={(e) => setNewStageColor(e.target.value)}
                                                className="h-8 w-full cursor-pointer rounded-lg border border-border bg-card"
                                            />
                                        </div>
                                        <div>
                                            <Label className="mb-1 block font-semibold">Semantic role</Label>
                                            <Select value={newStageSemantic} onValueChange={setNewStageSemantic}>
                                                <SelectTrigger className="h-8 rounded-lg text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {SEMANTIC_OPTIONS.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setShowAddStage(false)} className="h-8 rounded-lg">
                                            Cancel
                                        </Button>
                                        <Button type="submit" size="sm" className="h-8 rounded-lg" disabled={!newStageTitle.trim()}>
                                            Add Stage
                                        </Button>
                                    </div>
                                </form>
                            )}

                            <div className="space-y-1.5">
                                {activeStages.map((stage, index) => (
                                    <div key={stage.id}>
                                        {editingStageId === stage.id ? (
                                            <form onSubmit={handleUpdateStage} className="border-primary/40 bg-primary/5 space-y-3 rounded-xl border p-3">
                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <div>
                                                        <Label className="mb-1 block font-semibold">Title</Label>
                                                        <Input
                                                            value={editTitle}
                                                            onChange={(e) => setEditTitle(e.target.value)}
                                                            className="h-8 rounded-lg text-xs"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="mb-1 block font-semibold">Color</Label>
                                                        <input
                                                            type="color"
                                                            value={editColor}
                                                            onChange={(e) => setEditColor(e.target.value)}
                                                            className="h-8 w-full cursor-pointer rounded-lg border border-border bg-card"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="mb-1 block font-semibold">Semantic role</Label>
                                                        <Select value={editSemantic} onValueChange={setEditSemantic}>
                                                            <SelectTrigger className="h-8 rounded-lg text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {SEMANTIC_OPTIONS.map((opt) => (
                                                                    <SelectItem key={opt.value} value={opt.value}>
                                                                        {opt.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingStageId(null)} className="h-8 rounded-lg">
                                                        Cancel
                                                    </Button>
                                                    <Button type="submit" size="sm" className="h-8 rounded-lg" disabled={!editTitle.trim()}>
                                                        Save Stage
                                                    </Button>
                                                </div>
                                            </form>
                                        ) : (
                                            <div className="border-border/70 bg-card flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2">
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReorder(index, -1)}
                                                        disabled={index === 0}
                                                        className="text-muted-foreground hover:text-foreground rounded p-1 disabled:opacity-30"
                                                        title="Move up"
                                                    >
                                                        <ArrowUp className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReorder(index, 1)}
                                                        disabled={index === activeStages.length - 1}
                                                        className="text-muted-foreground hover:text-foreground rounded p-1 disabled:opacity-30"
                                                        title="Move down"
                                                    >
                                                        <ArrowDown className="h-3.5 w-3.5" />
                                                    </button>
                                                    <span
                                                        className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                                                        style={{ backgroundColor: stage.color || '#64748b' }}
                                                    />
                                                </div>
                                                <span className="min-w-0 flex-1 truncate font-semibold">{stage.title}</span>
                                                <span className="text-muted-foreground hidden sm:inline">{semanticLabel(stage.semantic_category)}</span>
                                                {isProtectedStage(stage) && (
                                                    <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                                                        <Shield className="h-3 w-3" />
                                                        Protected
                                                    </Badge>
                                                )}
                                                {stage.is_default && (
                                                    <Badge variant="outline" className="border-primary/40 text-primary">
                                                        Default
                                                    </Badge>
                                                )}
                                                <span className="text-muted-foreground tabular-nums">{stage.task_count} tasks</span>
                                                <div className="flex items-center gap-1">
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => startEditStage(stage)} className="h-7 w-7" title="Edit stage">
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleArchiveStage(stage)}
                                                        className="text-rose-500 h-7 w-7"
                                                        title="Archive stage"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {archivedStages.length > 0 && (
                                <p className="text-muted-foreground mt-2 text-[11px]">{archivedStages.length} archived stage(s) hidden from the board.</p>
                            )}
                        </section>

                        {/* Transitions matrix */}
                        <section>
                            <h3 className="mb-1 text-sm font-bold">Contributor Transitions</h3>
                            <p className="text-muted-foreground mb-2">
                                Click a stage to cycle: <span className="font-medium">off</span> →{' '}
                                <span className="font-medium text-amber-600">managers only</span> →{' '}
                                <span className="font-medium text-emerald-600">contributors</span> → off.
                            </p>
                            <div className="space-y-2">
                                {activeStages.map((from) => (
                                    <div key={from.id} className="border-border/70 bg-card rounded-xl border p-2.5">
                                        <div className="mb-1.5 flex items-center gap-1.5 font-semibold">
                                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: from.color || '#64748b' }} />
                                            <span className="truncate">{from.title}</span>
                                            <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {activeStages
                                                .filter((to) => to.id !== from.id)
                                                .map((to) => {
                                                    const state = draft[from.id]?.[to.id] || 'none';
                                                    const contributorBlocked = stageBlocksContributorTarget(to);
                                                    return (
                                                        <button
                                                            key={to.id}
                                                            type="button"
                                                            onClick={() => cycleEdge(from, to)}
                                                            title={
                                                                contributorBlocked && state !== 'contributor'
                                                                    ? `${to.title} (completion stage — managers only)`
                                                                    : to.title
                                                            }
                                                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                                                                state === 'contributor'
                                                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                                    : state === 'manager'
                                                                      ? 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                                                      : 'border-border/70 text-muted-foreground hover:bg-muted/60 bg-transparent'
                                                            }`}
                                                        >
                                                            {to.title}
                                                            {contributorBlocked && state !== 'contributor' && ' 🔒'}
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Preview */}
                        <section className="border-border/70 rounded-xl border p-3">
                            <h3 className="mb-1.5 text-sm font-bold">Preview</h3>
                            <p className="text-muted-foreground mb-1">
                                {edgeCount('contributor')} contributor edge(s), {edgeCount('manager')} manager-only edge(s).
                            </p>
                            {contributorPreview.length > 0 ? (
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                    {contributorPreview.map((edge, i) => (
                                        <span key={i} className="text-emerald-700 dark:text-emerald-400">
                                            {edge.from} → {edge.to}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">No contributor edges configured yet.</p>
                            )}
                        </section>
                    </div>
                )}

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={onClose} className="h-9 rounded-xl">
                        <X className="mr-1 h-3.5 w-3.5" />
                        Close
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSaveTransitions}
                        disabled={loading || savingTransitions || !data}
                        className="h-9 rounded-xl"
                    >
                        {savingTransitions && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                        Save Transitions
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
