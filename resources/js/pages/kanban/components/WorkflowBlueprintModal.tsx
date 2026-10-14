import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowRight,
    Calendar,
    CheckCircle2,
    Clock,
    Code2,
    Film,
    FolderKanban,
    GitFork,
    Layers,
    ListChecks,
    Megaphone,
    Palette,
    Plus,
    Sparkles,
    Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { BoardGroup, KanbanBoard, User } from '../types';

interface WorkflowBlueprintModalProps {
    isOpen: boolean;
    onClose: () => void;
    board: KanbanBoard;
    groups: BoardGroup[];
    users: User[];
}

export default function WorkflowBlueprintModal({
    isOpen,
    onClose,
    board,
    groups = [],
    users = [],
}: WorkflowBlueprintModalProps) {
    const [blueprints, setBlueprints] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedBlueprint, setSelectedBlueprint] = useState<any | null>(null);

    // Instantiation configuration state
    const [dateMappingMode, setDateMappingMode] = useState<'kickoff' | 'deadline'>('kickoff');
    const [referenceDate, setReferenceDate] = useState<string>(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [groupMode, setGroupMode] = useState<'new' | 'existing'>('new');
    const [newGroupTitle, setNewGroupTitle] = useState('');
    const [targetGroupId, setTargetGroupId] = useState<number | ''>('');
    const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | ''>('');
    const [isInstantiating, setIsInstantiating] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const fetchBlueprints = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`/kanban/boards/${board.id}/task-blueprints`);
            setBlueprints(res.data || []);
            if (res.data && res.data.length > 0) {
                const first = res.data[0];
                setSelectedBlueprint(first);
                setNewGroupTitle(first.content_schema?.group_name || first.title);
            }
        } catch (err) {
            console.error('Failed to load blueprints:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchBlueprints();
        }
    }, [isOpen, board.id]);

    const handleSelectBlueprint = (bp: any) => {
        setSelectedBlueprint(bp);
        setNewGroupTitle(bp.content_schema?.group_name || bp.title);
        setErrorMessage(null);
    };

    const handleInstantiate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBlueprint) return;

        setIsInstantiating(true);
        setErrorMessage(null);

        try {
            await axios.post(`/kanban/boards/${board.id}/task-blueprints/instantiate`, {
                template_id: selectedBlueprint.id,
                date_mapping_mode: dateMappingMode,
                reference_date: referenceDate,
                target_group_id: groupMode === 'existing' && targetGroupId ? Number(targetGroupId) : null,
                new_group_title: groupMode === 'new' ? newGroupTitle.trim() : null,
                assigned_to: selectedAssigneeId ? Number(selectedAssigneeId) : null,
            });

            onClose();
            router.reload({ only: ['boards', 'tasks'] });
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to instantiate workflow template';
            setErrorMessage(msg);
        } finally {
            setIsInstantiating(false);
        }
    };

    const getBlueprintIcon = (iconName: string) => {
        switch (iconName) {
            case 'Film':
                return <Film className="h-5 w-5 text-rose-500" />;
            case 'Palette':
                return <Palette className="h-5 w-5 text-purple-500" />;
            case 'Megaphone':
                return <Megaphone className="h-5 w-5 text-emerald-500" />;
            case 'Code2':
                return <Code2 className="h-5 w-5 text-blue-500" />;
            default:
                return <Sparkles className="h-5 w-5 text-amber-500" />;
        }
    };

    const schema = selectedBlueprint?.content_schema || {};
    const tasks = schema.tasks || [];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl p-6 rounded-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader className="border-b border-border/60 pb-3">
                    <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                        <Layers className="h-5 w-5 text-primary" />
                        Production Workflow Blueprints
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                        Instantiate standard agency deliverables with preconfigured stages, relative deadline offsets, subtask checklists, and dependency graphs.
                    </p>
                </DialogHeader>

                {errorMessage && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                        {errorMessage}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden py-2">
                    {/* Left Column: Blueprint Selector */}
                    <div className="md:col-span-5 flex flex-col space-y-2 overflow-y-auto pr-1">
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Available Blueprints ({blueprints.length})
                        </Label>

                        {isLoading ? (
                            <div className="py-8 text-center text-xs text-muted-foreground italic">
                                Loading blueprints...
                            </div>
                        ) : (
                            blueprints.map((bp) => {
                                const isSelected = selectedBlueprint?.id === bp.id;
                                const taskCount = (bp.content_schema?.tasks || []).length;
                                const duration = bp.content_schema?.total_duration_days || 14;

                                return (
                                    <button
                                        key={bp.id}
                                        type="button"
                                        onClick={() => handleSelectBlueprint(bp)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                                            isSelected
                                                ? 'border-primary/60 bg-primary/5 shadow-xs ring-1 ring-primary/40'
                                                : 'border-border/80 bg-card hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="p-2 rounded-lg bg-background border border-border/60 shrink-0 mt-0.5">
                                            {getBlueprintIcon(bp.icon)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-foreground truncate">
                                                    {bp.title}
                                                </h4>
                                                {bp.is_system_template && (
                                                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                                        Standard
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                                                {bp.description}
                                            </p>
                                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2 font-medium">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3 text-primary" />
                                                    {duration} days total
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <ListChecks className="h-3 w-3 text-emerald-600" />
                                                    {taskCount} tasks
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Right Column: Blueprint Preview & Instantiation Options */}
                    <div className="md:col-span-7 flex flex-col space-y-4 overflow-y-auto pl-1 border-l border-border/50">
                        {selectedBlueprint ? (
                            <form onSubmit={handleInstantiate} className="space-y-4">
                                {/* Preview Card */}
                                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                            Blueprint Deliverables Sequence ({tasks.length})
                                        </h4>
                                        <span className="text-[11px] font-bold text-primary">
                                            {schema.total_duration_days || 14} Days Duration
                                        </span>
                                    </div>

                                    {/* Task Timeline Sequence Preview */}
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {tasks.map((t: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="p-2.5 rounded-lg border border-border/60 bg-background text-xs space-y-1"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-foreground truncate pr-2">
                                                        {idx + 1}. {t.title}
                                                    </span>
                                                    <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                        Day +{t.offset_days} ({t.duration_days}d)
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                                                    {t.priority && (
                                                        <span className="px-1.5 py-0.2 rounded bg-muted">
                                                            {t.priority}
                                                        </span>
                                                    )}
                                                    {t.subtasks && t.subtasks.length > 0 && (
                                                        <span>{t.subtasks.length} checklist items</span>
                                                    )}
                                                    {t.depends_on && t.depends_on.length > 0 && (
                                                        <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-semibold">
                                                            <GitFork className="h-2.5 w-2.5" />
                                                            Prerequisites linked
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Scheduling Configuration */}
                                <div className="space-y-3">
                                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                                        Date Mapping & Schedule
                                    </Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                                Scheduling Mode
                                            </label>
                                            <select
                                                value={dateMappingMode}
                                                onChange={(e) => setDateMappingMode(e.target.value as any)}
                                                className="w-full h-8 text-xs rounded-lg border border-input bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                            >
                                                <option value="kickoff">Forward from Kickoff Date</option>
                                                <option value="deadline">Backward from Target Deadline</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                                {dateMappingMode === 'kickoff' ? 'Kickoff Start Date' : 'Target Completion Deadline'}
                                            </label>
                                            <Input
                                                type="date"
                                                value={referenceDate}
                                                onChange={(e) => setReferenceDate(e.target.value)}
                                                className="h-8 text-xs"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Target Board Group */}
                                <div className="space-y-3 border-t border-border/60 pt-3">
                                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                                        Board Placement
                                    </Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                                Group Placement
                                            </label>
                                            <select
                                                value={groupMode}
                                                onChange={(e) => setGroupMode(e.target.value as any)}
                                                className="w-full h-8 text-xs rounded-lg border border-input bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                            >
                                                <option value="new">Create New Group</option>
                                                <option value="existing">Add to Existing Group</option>
                                            </select>
                                        </div>

                                        <div>
                                            {groupMode === 'new' ? (
                                                <>
                                                    <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                                        New Group Title
                                                    </label>
                                                    <Input
                                                        type="text"
                                                        value={newGroupTitle}
                                                        onChange={(e) => setNewGroupTitle(e.target.value)}
                                                        placeholder="Group title..."
                                                        className="h-8 text-xs"
                                                        required
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                                                        Target Group
                                                    </label>
                                                    <select
                                                        value={targetGroupId}
                                                        onChange={(e) => setTargetGroupId(e.target.value ? Number(e.target.value) : '')}
                                                        className="w-full h-8 text-xs rounded-lg border border-input bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                    >
                                                        <option value="">Select Group...</option>
                                                        {groups.map((g) => (
                                                            <option key={g.id} value={g.id}>
                                                                {g.title}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Optional Default Assignee */}
                                <div className="space-y-1 border-t border-border/60 pt-3">
                                    <label className="text-[11px] font-semibold text-muted-foreground block">
                                        Assign Tasks To (Optional)
                                    </label>
                                    <select
                                        value={selectedAssigneeId}
                                        onChange={(e) => setSelectedAssigneeId(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full h-8 text-xs rounded-lg border border-input bg-background px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="">Leave Unassigned</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name} ({u.department || 'Team'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={onClose}
                                        className="h-8 text-xs"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={isInstantiating}
                                        className="h-8 text-xs font-bold bg-primary text-primary-foreground flex items-center gap-1.5"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        {isInstantiating ? 'Instantiating...' : 'Instantiate Blueprint'}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="py-12 text-center text-xs text-muted-foreground italic">
                                Select a blueprint from the list to preview and configure.
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
