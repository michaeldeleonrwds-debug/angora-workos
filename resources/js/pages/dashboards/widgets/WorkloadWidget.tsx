import { AlertTriangle } from 'lucide-react';
import React from 'react';

interface WorkloadMember {
    user_id: number;
    user_name: string;
    user_email: string;
    assigned_tasks: number;
    active_tasks: number;
    completed_tasks: number;
    overdue_tasks: number;
    capacity: number;
    utilization_percentage: number;
    workload_status: 'overloaded' | 'normal' | 'underloaded';
}

interface WorkloadWidgetProps {
    title: string;
    data?: {
        capacity_threshold?: number;
        members?: WorkloadMember[];
    };
}

export const WorkloadWidget: React.FC<WorkloadWidgetProps> = ({ title, data }) => {
    const members = data?.members ?? [];

    if (members.length === 0) {
        return <div className="flex h-48 items-center justify-center text-xs text-gray-400">No active team assignments found.</div>;
    }

    return (
        <div className="max-h-72 space-y-3.5 overflow-y-auto p-1 pr-1">
            {members.map((member) => {
                const isOverloaded = member.workload_status === 'overloaded';
                const isNormal = member.workload_status === 'normal';

                return (
                    <div
                        key={member.user_id}
                        className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50/70 p-3 transition-colors hover:border-gray-200 dark:border-gray-800 dark:bg-gray-800/50"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                                    {member.user_name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-sm leading-tight font-semibold text-gray-900 dark:text-white">{member.user_name}</h4>
                                    <p className="text-[11px] text-gray-400">{member.active_tasks} active tasks</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {member.overdue_tasks > 0 && (
                                    <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:bg-rose-950/60">
                                        <AlertTriangle className="h-3 w-3" /> {member.overdue_tasks} overdue
                                    </span>
                                )}
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                        isOverloaded
                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                                            : isNormal
                                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                                    }`}
                                >
                                    {member.utilization_percentage}%
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar of Capacity */}
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                                className={`h-full rounded-full transition-all ${
                                    isOverloaded ? 'bg-rose-500' : isNormal ? 'bg-emerald-500' : 'bg-blue-400'
                                }`}
                                style={{ width: `${Math.min(member.utilization_percentage, 100)}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
