import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, Clock, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';
import { KanbanBoard } from '../types';

interface BoardActivityModalProps {
    board: KanbanBoard;
    isOpen: boolean;
    onClose: () => void;
}

export default function BoardActivityModal({
    board,
    isOpen,
    onClose,
}: BoardActivityModalProps) {
    const [activities, setActivities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setIsLoading(true);
        axios
            .get(`/kanban/boards/${board.id}/activities`)
            .then((res) => {
                setActivities(res.data.activities || []);
                setIsLoading(false);
            })
            .catch(() => {
                setIsLoading(false);
            });
    }, [isOpen, board.id]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl max-h-[80vh] border-white/10 bg-[#1E1E30] text-white flex flex-col p-0 overflow-hidden">
                <DialogHeader className="border-b border-white/10 px-6 py-4">
                    <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#579BFC]" />
                        <span>Board Activity Log — {board.title}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 text-slate-400">
                            <Loader2 className="h-6 w-6 animate-spin text-[#579BFC]" />
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400">
                            No recent activity recorded for this board.
                        </div>
                    ) : (
                        activities.map((act) => (
                            <div
                                key={act.id}
                                className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#28283E]/50 p-3 text-xs"
                            >
                                <UserAvatar user={act.user} size="xs" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-white">{act.user?.name || 'User'}</span>
                                        <span className="text-[10px] text-slate-400">
                                            {formatDateTime(act.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-slate-300 mt-1 leading-relaxed">
                                        {act.description}
                                    </p>
                                    {act.task && (
                                        <span className="inline-block mt-1 text-[10px] font-semibold text-[#579BFC]">
                                            Task: {act.task.title}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
