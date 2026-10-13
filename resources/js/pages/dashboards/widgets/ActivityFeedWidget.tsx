import { Activity } from 'lucide-react';
import React from 'react';

interface ActivityItem {
    id: number;
    user_name: string;
    action: string;
    description: string;
    time_ago: string;
}

interface ActivityFeedWidgetProps {
    title: string;
    data?: {
        activities?: ActivityItem[];
    };
}

export const ActivityFeedWidget: React.FC<ActivityFeedWidgetProps> = ({ title, data }) => {
    const activities = data?.activities ?? [];

    if (activities.length === 0) {
        return <div className="flex h-48 items-center justify-center text-xs text-gray-400">No recent activity logged.</div>;
    }

    return (
        <div className="max-h-72 space-y-3 overflow-y-auto p-1 pr-1">
            {activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/80 dark:text-violet-300">
                        <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-800 dark:text-gray-200">
                            <span className="font-semibold text-gray-950 dark:text-white">{act.user_name}</span> {act.description}
                        </p>
                        <span className="mt-0.5 block text-[11px] text-gray-400">{act.time_ago}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};
