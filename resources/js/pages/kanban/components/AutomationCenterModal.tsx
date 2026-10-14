import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Copy, History, Play, Plus, Search, Sparkles, Trash2, X, Zap } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { BoardAutomation, KanbanBoard, User } from '../types';

interface AutomationCenterModalProps {
    board: KanbanBoard;
    isOpen: boolean;
    onClose: () => void;
    users: User[];
}

export default function AutomationCenterModal({ board, isOpen, onClose, users = [] }: AutomationCenterModalProps) {
    const [activeTab, setActiveTab] = useState<'rules' | 'recipes' | 'history'>('rules');
    const [searchTerm, setSearchTerm] = useState('');

    // Rule Builder Modal state
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [editingRuleId, setEditingRuleId] = useState<number | null>(null);

    // WHEN -> IF -> THEN form state
    const [ruleName, setRuleName] = useState('');
    const [ruleDesc, setRuleDesc] = useState('');
    const [triggerType, setTriggerType] = useState('status_changed');
    const [toStatus, setToStatus] = useState('Done');
    const [conditionField, setConditionField] = useState('status');
    const [conditionOp, setConditionOp] = useState('equals');
    const [conditionVal, setConditionVal] = useState('Done');
    const [actionType, setActionType] = useState('notify_creator');
    const [actionMsg, setActionMsg] = useState('Task completed successfully');

    const automations = board.automations || [];
    const executions = board.automation_executions || [];

    // Filtered automations
    const filteredRules = useMemo(() => {
        return automations.filter((r) => {
            if (searchTerm) {
                const q = searchTerm.toLowerCase();
                return (
                    r.name.toLowerCase().includes(q) ||
                    (r.description && r.description.toLowerCase().includes(q)) ||
                    r.trigger_type.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [automations, searchTerm]);

    const activeRulesCount = automations.filter((r) => r.is_active).length;

    // Toggle rule active status
    const handleToggleRule = (rule: BoardAutomation) => {
        router.post(`/kanban/automations/${rule.id}/toggle`);
    };

    // Duplicate rule
    const handleDuplicateRule = (rule: BoardAutomation) => {
        router.post(`/kanban/automations/${rule.id}/duplicate`);
    };

    // Delete rule
    const handleDeleteRule = (rule: BoardAutomation) => {
        if (confirm(`Delete automation rule "${rule.name}"?`)) {
            router.delete(`/kanban/automations/${rule.id}`);
        }
    };

    // Test execution
    const handleTestRule = (rule: BoardAutomation) => {
        router.post(`/kanban/automations/${rule.id}/test`);
    };

    // Open Builder for new rule
    const handleOpenCreateRule = () => {
        setEditingRuleId(null);
        setRuleName('');
        setRuleDesc('');
        setTriggerType('status_changed');
        setToStatus('Done');
        setConditionField('status');
        setConditionOp('equals');
        setConditionVal('Done');
        setActionType('notify_creator');
        setActionMsg('Task completed successfully');
        setIsBuilderOpen(true);
    };

    // Use a pre-built recipe
    const handleApplyRecipe = (recipe: (typeof RECIPES)[0]) => {
        setEditingRuleId(null);
        setRuleName(recipe.name);
        setRuleDesc(recipe.desc);
        setTriggerType(recipe.triggerType);
        setToStatus(recipe.toStatus || 'Done');
        setConditionField(recipe.conditionField);
        setConditionOp(recipe.conditionOp);
        setConditionVal(recipe.conditionVal);
        setActionType(recipe.actionType);
        setActionMsg(recipe.actionMsg);
        setIsBuilderOpen(true);
    };

    // Save Rule Builder
    const handleSaveRule = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ruleName.trim()) return;

        const payload = {
            name: ruleName.trim(),
            description: ruleDesc.trim() || undefined,
            trigger_type: triggerType,
            trigger_config: triggerType === 'status_changed' ? { to_status: toStatus } : {},
            conditions: {
                match_type: 'and',
                rules: [
                    {
                        field: conditionField,
                        operator: conditionOp,
                        value: conditionVal,
                    },
                ],
            },
            actions: [
                {
                    type: actionType,
                    message: actionMsg,
                    title: `Automation: ${ruleName}`,
                    status: actionType === 'change_status' ? actionMsg : undefined,
                },
            ],
            is_active: true,
        };

        if (editingRuleId) {
            router.patch(`/kanban/automations/${editingRuleId}`, payload, {
                onSuccess: () => setIsBuilderOpen(false),
            });
        } else {
            router.post(`/kanban/boards/${board.id}/automations`, payload, {
                onSuccess: () => setIsBuilderOpen(false),
            });
        }
    };

    const RECIPES = [
        {
            name: 'When status changes to Done → Notify Creator',
            desc: 'Automatically alert task requester as soon as an item is marked Done.',
            triggerType: 'status_changed',
            toStatus: 'Done',
            conditionField: 'status',
            conditionOp: 'equals',
            conditionVal: 'Done',
            actionType: 'notify_creator',
            actionMsg: 'Task has been completed.',
        },
        {
            name: 'When task is created → Assign default manager',
            desc: 'Instantly allocate newly logged tasks to the department head.',
            triggerType: 'item_created',
            conditionField: 'priority',
            conditionOp: 'is_not_empty',
            conditionVal: '',
            actionType: 'notify_assignee',
            actionMsg: 'A new task has been created and assigned to you.',
        },
        {
            name: 'When priority becomes Urgent → Create Audit Log & Notify',
            desc: 'Log compliance-grade audit trail when critical priority issues occur.',
            triggerType: 'priority_changed',
            conditionField: 'priority',
            conditionOp: 'equals',
            conditionVal: 'Urgent',
            actionType: 'create_audit_event',
            actionMsg: 'High priority escalation triggered.',
        },
        {
            name: 'When deadline passes → Mark as High Priority',
            desc: 'Automatically flag overdue items and notify the team.',
            triggerType: 'task_overdue',
            conditionField: 'due_date',
            conditionOp: 'is_not_empty',
            conditionVal: '',
            actionType: 'change_priority',
            actionMsg: 'High',
        },
        {
            name: 'Cross-Department Sync: Forward Completed to Operations',
            desc: 'Dispatch cross-department workflow dispatch when finished.',
            triggerType: 'status_changed',
            toStatus: 'Done',
            conditionField: 'status',
            conditionOp: 'equals',
            conditionVal: 'Done',
            actionType: 'cross_department_action',
            actionMsg: 'Operations handover initiated',
        },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent hideDefaultClose className="bg-card border-border flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border p-0 shadow-2xl sm:max-w-4xl">
                {/* Header */}
                <div className="border-border/60 bg-muted/20 flex flex-col items-start justify-between gap-4 border-b p-6 sm:flex-row sm:items-center">
                    {/* Left: Automation icon, title, active badge, and description */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-xs">
                            <Zap className="text-primary h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-foreground flex items-center gap-2 text-xl font-black tracking-tight truncate">
                                Automation Center
                                <span className="bg-primary/15 text-primary rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0">
                                    {activeRulesCount} active
                                </span>
                            </h2>
                            <p className="text-muted-foreground mt-0.5 text-xs truncate">Enterprise no-code workflow automations for {board.title}</p>
                        </div>
                    </div>

                    {/* Right & Far Right: Create Automation button + X close button */}
                    <div className="flex items-center gap-3.5 self-end sm:self-center shrink-0">
                        <Button
                            onClick={handleOpenCreateRule}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 rounded-xl px-3.5 text-xs font-bold shadow-xs flex items-center"
                        >
                            <Plus className="mr-1.5 h-4 w-4" />
                            Create Automation
                        </Button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted/80 flex h-9 w-9 items-center justify-center rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                            title="Close modal (Esc)"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Sub-navigation & Search Toolbar */}
                <div className="border-border/50 bg-card flex flex-col items-stretch justify-between gap-3 border-b px-6 py-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setActiveTab('rules')}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                activeTab === 'rules' ? 'bg-primary/10 text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Zap className="h-3.5 w-3.5" />
                            <span>Active Rules ({automations.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('recipes')}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                activeTab === 'recipes' ? 'bg-primary/10 text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Templates & Recipes</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                activeTab === 'history' ? 'bg-primary/10 text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <History className="h-3.5 w-3.5" />
                            <span>Execution History ({executions.length})</span>
                        </button>
                    </div>

                    <div className="relative min-w-[200px]">
                        <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                        <Input
                            placeholder="Filter automations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-background border-border h-8 rounded-xl pr-2.5 pl-8 text-xs"
                        />
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 space-y-4 overflow-y-auto p-6">
                    {/* 1. ACTIVE RULES TAB */}
                    {activeTab === 'rules' && (
                        <div className="space-y-3">
                            {filteredRules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className="border-border/70 hover:border-primary/40 bg-background flex flex-col items-start justify-between gap-4 rounded-2xl border p-4 transition-all sm:flex-row sm:items-center"
                                >
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2 w-2 rounded-full ${rule.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            <h4 className="text-foreground text-xs font-bold">{rule.name}</h4>
                                            <span className="text-muted-foreground bg-muted rounded-md px-2 py-0.5 text-[10px] font-semibold">
                                                Trigger: {rule.trigger_type}
                                            </span>
                                        </div>
                                        {rule.description && <p className="text-muted-foreground pl-4 text-xs">{rule.description}</p>}
                                        <div className="text-muted-foreground flex items-center gap-3 pt-1 pl-4 text-[11px]">
                                            <span>Runs: {rule.execution_count}</span>
                                            {rule.last_executed_at && <span>• Last run: {formatDate(rule.last_executed_at)}</span>}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTestRule(rule)}
                                            className="border-border bg-card hover:bg-muted h-8 rounded-xl text-xs"
                                            title="Dry-run test automation on first task"
                                        >
                                            <Play className="mr-1 h-3 w-3 text-emerald-500" />
                                            Test
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDuplicateRule(rule)}
                                            className="border-border bg-card hover:bg-muted h-8 rounded-xl text-xs"
                                            title="Duplicate rule"
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleToggleRule(rule)}
                                            className={`border-border h-8 rounded-xl text-xs ${
                                                rule.is_active ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                                            }`}
                                        >
                                            {rule.is_active ? 'Disable' : 'Enable'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteRule(rule)}
                                            className="text-muted-foreground h-8 w-8 rounded-xl hover:text-rose-600"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {filteredRules.length === 0 && (
                                <div className="text-muted-foreground space-y-2 py-16 text-center text-xs">
                                    <Zap className="text-muted-foreground mx-auto h-8 w-8 opacity-30" />
                                    <p>No automations configured on this board.</p>
                                    <Button variant="outline" size="sm" onClick={handleOpenCreateRule} className="rounded-xl text-xs">
                                        Create First Rule
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 2. RECIPES TAB */}
                    {activeTab === 'recipes' && (
                        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                            {RECIPES.map((recipe, idx) => (
                                <div
                                    key={idx}
                                    className="border-border/70 hover:border-primary/50 bg-background group flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-all"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="text-primary h-4 w-4" />
                                            <h4 className="text-foreground group-hover:text-primary text-xs font-bold transition-colors">
                                                {recipe.name}
                                            </h4>
                                        </div>
                                        <p className="text-muted-foreground text-xs">{recipe.desc}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleApplyRecipe(recipe)}
                                        className="border-border bg-card hover:bg-muted h-8 self-start rounded-xl text-xs font-semibold"
                                    >
                                        Use Recipe
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 3. EXECUTION HISTORY TAB */}
                    {activeTab === 'history' && (
                        <div className="space-y-2.5">
                            {executions.map((exec) => (
                                <div
                                    key={exec.id}
                                    className="border-border/70 bg-background flex flex-col items-start justify-between gap-2 rounded-xl border p-3.5 text-xs sm:flex-row sm:items-center"
                                >
                                    <div className="space-y-0.5">
                                        <div className="text-foreground flex items-center gap-2 font-bold">
                                            {exec.status === 'success' ? (
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                            ) : (
                                                <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                                            )}
                                            <span>Event: {exec.trigger_event}</span>
                                            <span
                                                className={`py-0.2 rounded-md px-1.5 text-[10px] font-bold uppercase ${
                                                    exec.status === 'success' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-rose-500/20 text-rose-600'
                                                }`}
                                            >
                                                {exec.status}
                                            </span>
                                        </div>
                                        <div className="text-muted-foreground text-[11px]">
                                            Target Item: {exec.task?.title || `#${exec.task_id || 'Global'}`} • Triggered by:{' '}
                                            {exec.triggered_by?.name || 'System / Scheduler'} • Duration: {exec.execution_duration_ms}ms
                                        </div>
                                        {exec.error_message && <p className="pt-1 font-mono text-[11px] text-rose-500">{exec.error_message}</p>}
                                    </div>

                                    <div className="text-muted-foreground text-right text-[11px] font-medium">{formatDate(exec.created_at)}</div>
                                </div>
                            ))}

                            {executions.length === 0 && (
                                <div className="text-muted-foreground py-16 text-center text-xs">No execution history recorded yet.</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-border/60 bg-muted/20 flex justify-end border-t p-4">
                    <Button variant="outline" onClick={onClose} className="h-9 rounded-xl text-xs">
                        Close
                    </Button>
                </div>
            </DialogContent>

            {/* VISUAL NO-CODE RULE BUILDER (WHEN -> IF -> THEN) MODAL */}
            <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
                <DialogContent className="bg-card border-border rounded-3xl border p-6 shadow-2xl sm:max-w-xl">
                    <form onSubmit={handleSaveRule} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base font-black">
                                <Zap className="text-primary h-4 w-4" />
                                {editingRuleId ? 'Edit Automation Rule' : 'Build Custom Automation'}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="mb-1 block font-semibold">Rule Name</label>
                                <Input
                                    placeholder="e.g. Move to Done and notify reviewer"
                                    value={ruleName}
                                    onChange={(e) => setRuleName(e.target.value)}
                                    required
                                    className="h-9 rounded-xl"
                                />
                            </div>

                            {/* WHEN BLOCK */}
                            <div className="border-primary/30 bg-primary/5 space-y-2 rounded-2xl border p-3.5">
                                <span className="text-primary text-[10px] font-black tracking-wider uppercase">1. WHEN (Trigger)</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-muted-foreground mb-1 block text-[11px]">Event</label>
                                        <Select value={triggerType} onValueChange={setTriggerType}>
                                            <SelectTrigger className="bg-background h-9 rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="status_changed">Status Changes</SelectItem>
                                                <SelectItem value="priority_changed">Priority Changes</SelectItem>
                                                <SelectItem value="item_created">Item Created</SelectItem>
                                                <SelectItem value="item_assigned">Item Assigned</SelectItem>
                                                <SelectItem value="task_overdue">Due Date Passes</SelectItem>
                                                <SelectItem value="recurring_schedule">Recurring Schedule</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {triggerType === 'status_changed' && (
                                        <div>
                                            <label className="text-muted-foreground mb-1 block text-[11px]">To Status</label>
                                            <Select value={toStatus} onValueChange={setToStatus}>
                                                <SelectTrigger className="bg-background h-9 rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(board.columns || []).map((c) => (
                                                        <SelectItem key={c.id} value={c.title}>
                                                            {c.title}
                                                        </SelectItem>
                                                    ))}
                                                    <SelectItem value="Done">Done</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* IF BLOCK */}
                            <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5">
                                <span className="text-[10px] font-black tracking-wider text-amber-700 uppercase dark:text-amber-400">
                                    2. IF (Conditions)
                                </span>
                                <div className="grid grid-cols-3 gap-2">
                                    <Select value={conditionField} onValueChange={setConditionField}>
                                        <SelectTrigger className="bg-background h-9 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="status">Status</SelectItem>
                                            <SelectItem value="priority">Priority</SelectItem>
                                            <SelectItem value="progress">Progress</SelectItem>
                                            <SelectItem value="due_date">Due Date</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={conditionOp} onValueChange={setConditionOp}>
                                        <SelectTrigger className="bg-background h-9 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="equals">Equals</SelectItem>
                                            <SelectItem value="not_equals">Does not equal</SelectItem>
                                            <SelectItem value="is_not_empty">Is not empty</SelectItem>
                                            <SelectItem value="greater_than">Greater than</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Input
                                        placeholder="Value"
                                        value={conditionVal}
                                        onChange={(e) => setConditionVal(e.target.value)}
                                        className="bg-background h-9 rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* THEN BLOCK */}
                            <div className="space-y-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
                                <span className="text-[10px] font-black tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                                    3. THEN (Actions)
                                </span>
                                <div className="space-y-2">
                                    <Select value={actionType} onValueChange={setActionType}>
                                        <SelectTrigger className="bg-background h-9 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="notify_creator">Notify Task Creator</SelectItem>
                                            <SelectItem value="notify_assignee">Notify Assignee</SelectItem>
                                            <SelectItem value="change_status">Change Status</SelectItem>
                                            <SelectItem value="change_priority">Change Priority</SelectItem>
                                            <SelectItem value="create_audit_event">Record Audit Event</SelectItem>
                                            <SelectItem value="cross_department_action">Cross-Department Action</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Input
                                        placeholder="Action payload / Message / Status"
                                        value={actionMsg}
                                        onChange={(e) => setActionMsg(e.target.value)}
                                        className="bg-background h-9 rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsBuilderOpen(false)} className="h-9 rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!ruleName.trim()} className="bg-primary hover:bg-primary/90 h-9 rounded-xl">
                                Save & Enable Rule
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
