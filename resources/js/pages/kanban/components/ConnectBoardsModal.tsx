import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { router } from '@inertiajs/react';
import { Link2, Plus, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BoardColumn, Task } from '../types';

interface ConnectBoardsModalProps {
    task: Task;
    column: BoardColumn;
    isOpen: boolean;
    onClose: () => void;
}

interface TargetItem {
    id: number;
    title: string;
    board_id: number;
    status?: string;
    status_color?: string;
    priority?: string;
    assignee?: string;
    due_date?: string;
    progress?: number;
}

interface BoardOption {
    id: number;
    title: string;
    workspace_id: number;
    department?: string;
}

export default function ConnectBoardsModal({ task, column, isOpen, onClose }: ConnectBoardsModalProps) {
    const [boards, setBoards] = useState<BoardOption[]>([]);
    const [selectedBoardId, setSelectedBoardId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<TargetItem[]>([]);
    const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Existing connections on this column
    const existingRelationships = (task.outgoingRelationships || []).filter((r) => !r.column_key || r.column_key === column.key);

    useEffect(() => {
        if (isOpen) {
            fetchInitialBoards();
        }
    }, [isOpen]);

    const fetchInitialBoards = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/kanban/connected-items/search');
            if (res.ok) {
                const data = await res.json();
                setBoards(data.boards || []);
                // Default to a different board if available
                const otherBoard = (data.boards || []).find((b: BoardOption) => b.id !== task.board_id);
                if (otherBoard) {
                    setSelectedBoardId(otherBoard.id.toString());
                    searchItems(otherBoard.id.toString(), '');
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    const searchItems = async (boardId: string, query: string) => {
        if (!boardId) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/kanban/connected-items/search?board_id=${boardId}&query=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data.items || []);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleBoardChange = (newBoardId: string) => {
        setSelectedBoardId(newBoardId);
        searchItems(newBoardId, searchQuery);
    };

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        searchItems(selectedBoardId, query);
    };

    const toggleSelectTask = (id: number) => {
        if (selectedTaskIds.includes(id)) {
            setSelectedTaskIds(selectedTaskIds.filter((t) => t !== id));
        } else {
            setSelectedTaskIds([...selectedTaskIds, id]);
        }
    };

    const handleConnect = () => {
        if (selectedTaskIds.length === 0) return;

        router.post(
            '/kanban/relationships',
            {
                source_task_id: task.id,
                target_task_ids: selectedTaskIds,
                column_key: column.key,
                relation_type: column.config?.relation_type || 'one_way',
            },
            {
                onSuccess: () => {
                    setSelectedTaskIds([]);
                    onClose();
                },
            },
        );
    };

    const handleRemoveRelationship = (relId: number) => {
        router.delete(`/kanban/relationships/${relId}`);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-card text-foreground rounded-2xl sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                        <Link2 className="text-primary h-5 w-5" />
                        Connect Items to "{task.title}"
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-xs">
                        Link related tasks, deliverables, or projects across boards. Column: <strong>{column.title}</strong> (
                        {column.config?.relation_type === 'two_way' ? 'Two-way' : 'One-way'})
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Existing Links Section */}
                    {existingRelationships.length > 0 && (
                        <div className="bg-muted/40 border-border/40 space-y-2 rounded-xl border p-3">
                            <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                                Currently Connected Items ({existingRelationships.length})
                            </span>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {existingRelationships.map((rel) => (
                                    <div
                                        key={rel.id}
                                        className="bg-background border-border group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium shadow-2xs"
                                    >
                                        <span className="font-semibold">{rel.target_task?.title || `Item #${rel.target_task_id}`}</span>
                                        {rel.target_board && <span className="text-muted-foreground text-[10px]">({rel.target_board.title})</span>}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRelationship(rel.id)}
                                            className="text-muted-foreground ml-1 transition-colors hover:text-rose-500"
                                            title="Disconnect"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Target Board Selector & Search */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="text-muted-foreground mb-1 block text-xs font-semibold">Select Target Board</label>
                            <select
                                value={selectedBoardId}
                                onChange={(e) => handleBoardChange(e.target.value)}
                                className="bg-background border-border w-full rounded-xl border p-2.5 text-xs focus:outline-none"
                            >
                                <option value="">Choose board...</option>
                                {boards.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.title} {b.id === task.board_id ? '(Current Board)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-muted-foreground mb-1 block text-xs font-semibold">Search Target Items</label>
                            <div className="relative">
                                <Search className="text-muted-foreground absolute top-3 left-3 h-3.5 w-3.5" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder="Filter by item title..."
                                    className="rounded-xl pl-8 text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="border-border/50 divide-border/30 bg-background/50 max-h-56 divide-y overflow-hidden overflow-y-auto rounded-xl border">
                        {isLoading ? (
                            <div className="text-muted-foreground p-6 text-center text-xs">Loading board items...</div>
                        ) : searchResults.length === 0 ? (
                            <div className="text-muted-foreground p-6 text-center text-xs">
                                {selectedBoardId ? 'No matching items found on this board.' : 'Please select a board to browse items.'}
                            </div>
                        ) : (
                            searchResults.map((item) => {
                                const isAlreadyLinked = existingRelationships.some((r) => r.target_task_id === item.id);
                                const isSelected = selectedTaskIds.includes(item.id);

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => !isAlreadyLinked && toggleSelectTask(item.id)}
                                        className={`flex cursor-pointer items-center justify-between p-2.5 px-3 text-xs transition ${
                                            isAlreadyLinked
                                                ? 'bg-muted/20 cursor-not-allowed opacity-40'
                                                : isSelected
                                                  ? 'bg-primary/10 border-primary border-l-2'
                                                  : 'hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <input
                                                type="checkbox"
                                                disabled={isAlreadyLinked}
                                                checked={isSelected || isAlreadyLinked}
                                                onChange={() => {}}
                                                className="border-border text-primary focus:ring-primary rounded"
                                            />
                                            <div>
                                                <span className="text-foreground font-semibold">{item.title}</span>
                                                <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-[10px]">
                                                    {item.status && (
                                                        <span
                                                            className="py-0.2 rounded px-1.5 text-[9px] font-bold text-white"
                                                            style={{ backgroundColor: item.status_color || '#64748b' }}
                                                        >
                                                            {item.status}
                                                        </span>
                                                    )}
                                                    {item.assignee && <span>Assignee: {item.assignee}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {isAlreadyLinked ? (
                                            <Badge variant="outline" className="text-[10px]">
                                                Connected
                                            </Badge>
                                        ) : isSelected ? (
                                            <Badge className="bg-primary text-primary-foreground text-[10px]">Selected</Badge>
                                        ) : (
                                            <Plus className="text-muted-foreground h-3.5 w-3.5 opacity-60" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <DialogFooter className="flex items-center justify-between pt-2 sm:justify-between">
                    <span className="text-muted-foreground text-xs">{selectedTaskIds.length} item(s) selected</span>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Done
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConnect}
                            disabled={selectedTaskIds.length === 0}
                            className="bg-primary text-primary-foreground font-semibold"
                        >
                            Link {selectedTaskIds.length > 0 ? `(${selectedTaskIds.length})` : ''}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
