import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { router } from '@inertiajs/react';
import { Calendar, CheckSquare, Clock, Copy, Hash, Layers, Link2, ListFilter, ListTodo, Percent, Star, Tag, Type, UserCheck } from 'lucide-react';
import React, { useState } from 'react';
import { KanbanBoard } from '../types';

interface AddColumnModalProps {
    board: KanbanBoard;
    isOpen: boolean;
    onClose: () => void;
    scope?: 'task' | 'subtask';
}

import { FileText } from 'lucide-react';

const COLUMN_TYPES = [
    { type: 'people', title: 'People', icon: UserCheck, desc: 'Assign team members' },
    { type: 'status', title: 'Status', icon: Layers, desc: 'Color-coded progress states' },
    { type: 'priority', title: 'Priority', icon: ListTodo, desc: 'Low, Medium, High, Urgent' },
    { type: 'date', title: 'Date', icon: Calendar, desc: 'Due dates & milestones' },
    { type: 'timeline', title: 'Timeline', icon: Clock, desc: 'Gantt / duration bar' },
    { type: 'number', title: 'Numbers', icon: Hash, desc: 'Budgets, costs, estimations' },
    { type: 'checkbox', title: 'Checkbox', icon: CheckSquare, desc: 'Yes/no boolean check' },
    { type: 'dropdown', title: 'Dropdown', icon: ListFilter, desc: 'Custom options select' },
    { type: 'tags', title: 'Tags', icon: Tag, desc: 'Categorization badges' },
    { type: 'progress', title: 'Progress', icon: Percent, desc: 'Percentage completion bar' },
    { type: 'rating', title: 'Rating', icon: Star, desc: 'Visual star or point ranking' },
    { type: 'connect_boards', title: 'Connect Boards', icon: Link2, desc: 'Link items across other boards' },
    { type: 'mirror', title: 'Mirror', icon: Copy, desc: 'Reflect columns from connected items' },
    { type: 'text', title: 'Short Text', icon: Type, desc: 'Single-line text entry' },
    { type: 'long_text', title: 'Long Text', icon: FileText, desc: 'Multi-line notes and details' },
];

export default function AddColumnModal({ board, isOpen, onClose, scope = 'task' }: AddColumnModalProps) {
    const [title, setTitle] = useState('');
    const [selectedType, setSelectedType] = useState('status');
    const [optionsString, setOptionsString] = useState('Option A, Option B, Option C');
    const [statusLabelsString, setStatusLabelsString] = useState('Not Started, In Progress, Review, Done');
    const [relationType, setRelationType] = useState<'one_way' | 'two_way'>('one_way');
    const [mirrorSourceField, setMirrorSourceField] = useState('status');
    const [mirrorAggregation, setMirrorAggregation] = useState('first');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const config: Record<string, any> = {};
        if (selectedType === 'dropdown' || selectedType === 'tags') {
            config.options = optionsString
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean);
        } else if (selectedType === 'status') {
            config.status_options = statusLabelsString
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
        } else if (selectedType === 'connect_boards') {
            config.relation_type = relationType;
        } else if (selectedType === 'mirror') {
            config.source_field = mirrorSourceField;
            config.aggregation = mirrorAggregation;
        }

        router.post(
            `/kanban/boards/${board.id}/columns`,
            {
                title: title.trim(),
                type: selectedType,
                scope,
                width: 150,
                config: Object.keys(config).length > 0 ? config : null,
            },
            {
                onSuccess: () => {
                    onClose();
                    setTitle('');
                    setOptionsString('Option A, Option B, Option C');
                },
            },
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="rounded-2xl sm:max-w-lg">
                <form onSubmit={handleAdd}>
                    <DialogHeader>
                        <DialogTitle>{scope === 'subtask' ? 'Add Subtask Dynamic Column' : 'Add Dynamic Column'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="col-title">Column Title</Label>
                            <Input
                                id="col-title"
                                placeholder="e.g. Estimation (Hrs), Client Budget, Category"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label>Choose Column Type</Label>
                            <div className="mt-2 grid max-h-56 grid-cols-2 gap-2.5 overflow-y-auto p-1 sm:grid-cols-3">
                                {COLUMN_TYPES.map((c) => {
                                    const Icon = c.icon;
                                    const isSelected = selectedType === c.type;
                                    return (
                                        <button
                                            type="button"
                                            key={c.type}
                                            onClick={() => {
                                                setSelectedType(c.type);
                                                if (!title) setTitle(c.title);
                                            }}
                                            className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                                                isSelected
                                                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                                                    : 'border-border bg-card hover:bg-muted/50 text-foreground'
                                            }`}
                                        >
                                            <div className="mb-1 flex items-center gap-2">
                                                <Icon className="text-primary h-4 w-4" />
                                                <span className="text-xs font-semibold">{c.title}</span>
                                            </div>
                                            <span className="text-muted-foreground line-clamp-1 text-[10px]">{c.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {selectedType === 'status' && (
                            <div>
                                <Label htmlFor="col-status-opts">Status Labels (comma separated)</Label>
                                <Input
                                    id="col-status-opts"
                                    placeholder="e.g. Not Started, In Progress, For Review, Done"
                                    value={statusLabelsString}
                                    onChange={(e) => setStatusLabelsString(e.target.value)}
                                    className="mt-1"
                                />
                                <span className="text-muted-foreground mt-1 block text-[11px]">
                                    Each status will have a board-specific color tag in your board table.
                                </span>
                            </div>
                        )}

                        {(selectedType === 'dropdown' || selectedType === 'tags') && (
                            <div>
                                <Label htmlFor="col-opts">Options (comma separated)</Label>
                                <Input
                                    id="col-opts"
                                    placeholder="e.g. Planning, Execution, Verification"
                                    value={optionsString}
                                    onChange={(e) => setOptionsString(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        )}

                        {selectedType === 'connect_boards' && (
                            <div className="bg-primary/5 border-primary/20 space-y-2 rounded-xl border p-3">
                                <Label className="text-primary text-xs font-bold">Relationship Direction</Label>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setRelationType('one_way')}
                                        className={`rounded-lg border p-2 text-left font-medium transition ${
                                            relationType === 'one_way'
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-card border-border hover:bg-muted'
                                        }`}
                                    >
                                        <span className="block font-bold">One-Way</span>
                                        <span className="text-[10px] opacity-80">Link target items into this board only</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRelationType('two_way')}
                                        className={`rounded-lg border p-2 text-left font-medium transition ${
                                            relationType === 'two_way'
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-card border-border hover:bg-muted'
                                        }`}
                                    >
                                        <span className="block font-bold">Two-Way (Bidirectional)</span>
                                        <span className="text-[10px] opacity-80">Automatically link back on the target board</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedType === 'mirror' && (
                            <div className="space-y-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
                                <div>
                                    <Label className="text-xs font-bold text-purple-600 dark:text-purple-400">Source Field to Mirror</Label>
                                    <select
                                        value={mirrorSourceField}
                                        onChange={(e) => setMirrorSourceField(e.target.value)}
                                        className="bg-background border-border mt-1 w-full rounded-lg border p-2 text-xs focus:outline-none"
                                    >
                                        <option value="status">Status (Workflow Stage)</option>
                                        <option value="priority">Priority</option>
                                        <option value="assignee">Assignee</option>
                                        <option value="progress">Progress (%)</option>
                                        <option value="due_date">Due Date</option>
                                        <option value="title">Item Name</option>
                                    </select>
                                </div>

                                <div>
                                    <Label className="text-xs font-bold text-purple-600 dark:text-purple-400">Multiple Items Aggregation</Label>
                                    <select
                                        value={mirrorAggregation}
                                        onChange={(e) => setMirrorAggregation(e.target.value)}
                                        className="bg-background border-border mt-1 w-full rounded-lg border p-2 text-xs focus:outline-none"
                                    >
                                        <option value="first">Show First Item</option>
                                        <option value="list">Summary List (Comma separated)</option>
                                        <option value="count">Count of Linked Items</option>
                                        <option value="average">Average (for Numbers/Progress)</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit">Add Column</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
