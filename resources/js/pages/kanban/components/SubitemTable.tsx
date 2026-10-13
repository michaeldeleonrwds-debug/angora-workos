import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { router } from '@inertiajs/react';
import { CornerDownRight, Plus, Trash2, User as UserIcon } from 'lucide-react';
import React, { useState } from 'react';
import { KanbanColumn, Task, User } from '../types';

interface SubitemTableProps {
    parentTask: Task;
    subitems: Task[];
    columns: KanbanColumn[];
    users: User[];
}

export default function SubitemTable({ parentTask, subitems = [], columns = [], users = [] }: SubitemTableProps) {
    const [newTitle, setNewTitle] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddSubitem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        router.post(
            `/kanban/tasks/${parentTask.id}/subitems`,
            {
                title: newTitle.trim(),
            },
            {
                onSuccess: () => {
                    setNewTitle('');
                    setIsAdding(false);
                },
            },
        );
    };

    const handleUpdateStatus = (subtaskId: number, columnId: number) => {
        router.patch(`/kanban/tasks/${subtaskId}/column`, {
            column_id: columnId,
        });
    };

    const handleUpdateAssignee = (subtaskId: number, userId: number | null) => {
        router.patch(`/kanban/tasks/${subtaskId}`, {
            assigned_to: userId,
        });
    };

    const handleDelete = (subtaskId: number) => {
        router.delete(`/kanban/tasks/${subtaskId}`);
    };

    const getStatusStyle = (title: string = '') => {
        const lower = title.toLowerCase();
        if (lower.includes('done') || lower.includes('complete')) {
            return { bg: '#00c875', text: '#ffffff', label: 'Done' };
        }
        if (lower.includes('progress') || lower.includes('working')) {
            return { bg: '#fdab3d', text: '#ffffff', label: 'Working on it' };
        }
        if (lower.includes('review')) {
            return { bg: '#a25ddc', text: '#ffffff', label: 'Review' };
        }
        if (lower.includes('stuck') || lower.includes('blocked')) {
            return { bg: '#e2445c', text: '#ffffff', label: 'Stuck' };
        }
        return { bg: '#c4c4c4', text: '#ffffff', label: title || 'Not Started' };
    };

    return (
        <div className="bg-muted/20 border-border/40 border-b py-2 pr-3 pl-9">
            <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold">
                <CornerDownRight className="h-3.5 w-3.5" />
                <span>Subitems ({subitems.length})</span>
            </div>

            <div className="space-y-1">
                {subitems.map((sub) => {
                    const statusMeta = getStatusStyle(sub.column?.title);
                    return (
                        <div
                            key={sub.id}
                            className="bg-card border-border/60 hover:border-border flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5 text-xs transition-all"
                        >
                            <span className="text-foreground flex-1 truncate font-medium">{sub.title}</span>

                            <div className="flex flex-shrink-0 items-center gap-2">
                                {/* Assignee */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="hover:bg-muted/60 flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors">
                                            {sub.assignee ? (
                                                <div className="bg-primary/20 text-primary flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                                                    {sub.assignee.name.charAt(0)}
                                                </div>
                                            ) : (
                                                <div className="border-border text-muted-foreground flex h-5 w-5 items-center justify-center rounded-full border border-dashed">
                                                    <UserIcon className="h-3 w-3" />
                                                </div>
                                            )}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                        <DropdownMenuItem onClick={() => handleUpdateAssignee(sub.id, null)}>
                                            <span className="text-muted-foreground">Unassigned</span>
                                        </DropdownMenuItem>
                                        {users.map((u) => (
                                            <DropdownMenuItem key={u.id} onClick={() => handleUpdateAssignee(sub.id, u.id)}>
                                                <span>{u.name}</span>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Status */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="min-w-[90px] rounded px-2.5 py-1 text-center text-[11px] font-bold tracking-tight text-white shadow-2xs transition-all hover:brightness-105"
                                            style={{ backgroundColor: statusMeta.bg }}
                                        >
                                            {statusMeta.label}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-36 space-y-1 rounded-xl p-1">
                                        {columns.map((col) => {
                                            const meta = getStatusStyle(col.title);
                                            return (
                                                <button
                                                    key={col.id}
                                                    type="button"
                                                    onClick={() => handleUpdateStatus(sub.id, col.id)}
                                                    className="w-full rounded py-1 text-center text-xs font-bold text-white transition-opacity hover:opacity-90"
                                                    style={{ backgroundColor: meta.bg }}
                                                >
                                                    {col.title}
                                                </button>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Delete Subitem */}
                                <button
                                    onClick={() => handleDelete(sub.id)}
                                    className="text-muted-foreground rounded p-1 transition-colors hover:bg-red-500/10 hover:text-red-500"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Inline Add Subitem */}
                {isAdding ? (
                    <form onSubmit={handleAddSubitem} className="mt-2 flex items-center gap-2">
                        <Input
                            placeholder="Write subitem title..."
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            autoFocus
                            className="bg-card h-7 text-xs"
                        />
                        <Button type="submit" size="sm" className="h-7 text-xs">
                            Add
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="h-7 text-xs">
                            Cancel
                        </Button>
                    </form>
                ) : (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="text-primary flex items-center gap-1 pt-1 text-[11px] font-semibold hover:underline"
                    >
                        <Plus className="h-3 w-3" />
                        <span>Add Subitem</span>
                    </button>
                )}
            </div>
        </div>
    );
}
