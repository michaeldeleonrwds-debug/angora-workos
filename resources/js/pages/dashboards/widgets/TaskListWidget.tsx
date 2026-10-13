import { Calendar, CheckCircle2 } from 'lucide-react';
import React from 'react';

interface TaskItem {
    id: number;
    title: string;
    board_name?: string;
    status: string;
    priority: string;
    due_date?: string;
    assignee?: string;
}

interface TaskListWidgetProps {
    title: string;
    data?: {
        filter_type?: string;
        tasks?: TaskItem[];
    };
}

export const TaskListWidget: React.FC<TaskListWidgetProps> = ({ title, data }) => {
    const tasks = data?.tasks ?? [];

    if (tasks.length === 0) {
        return (
            <div className="flex h-48 flex-col items-center justify-center text-xs text-gray-400">
                <CheckCircle2 className="mb-1 h-8 w-8 text-emerald-400" />
                All caught up! No tasks in this filter.
            </div>
        );
    }

    return (
        <div className="max-h-72 space-y-2 overflow-y-auto p-1 pr-1">
            {tasks.map((task) => (
                <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3 transition-all hover:border-gray-200 dark:border-gray-800 dark:bg-gray-800/60"
                >
                    <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-gray-600 uppercase dark:bg-gray-700 dark:text-gray-300">
                                {task.board_name ?? 'General'}
                            </span>
                            <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                    task.priority === 'urgent'
                                        ? 'bg-rose-100 text-rose-700'
                                        : task.priority === 'high'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-blue-100 text-blue-700'
                                }`}
                            >
                                {task.priority}
                            </span>
                        </div>
                        <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{task.title}</h4>
                    </div>

                    <div className="flex-shrink-0 space-y-1 text-right text-xs">
                        {task.due_date && (
                            <div className="flex items-center gap-1 font-medium text-gray-500">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{task.due_date}</span>
                            </div>
                        )}
                        <p className="text-[11px] text-gray-400">{task.assignee}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};
