import { CheckCircle2 } from 'lucide-react';
import React from 'react';

interface Segment {
    label: string;
    count: number;
    percentage: number;
    color: string;
}

interface BatteryProgressWidgetProps {
    title: string;
    data?: {
        total?: number;
        segments?: Segment[];
        completion_percentage?: number;
    };
}

export const BatteryProgressWidget: React.FC<BatteryProgressWidgetProps> = ({ title, data }) => {
    const total = data?.total ?? 0;
    const segments = data?.segments ?? [];
    const completionPercentage = data?.completion_percentage ?? 0;

    return (
        <div className="flex h-full flex-col justify-between space-y-4 p-2">
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Completion Status</span>
                    <div className="mt-0.5 text-2xl font-bold text-[#12121E] dark:text-white">
                        {completionPercentage}% <span className="text-xs font-normal text-gray-400">({total} total items)</span>
                    </div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                </div>
            </div>

            {/* monday.com style Battery Bar */}
            <div className="space-y-1.5">
                <div className="flex h-5 w-full overflow-hidden rounded-full border border-gray-200/60 bg-gray-100 p-0.5 dark:border-gray-700/60 dark:bg-gray-800">
                    {segments.length === 0 ? (
                        <div className="h-full w-full rounded-full bg-gray-200 dark:bg-gray-700" />
                    ) : (
                        segments.map((seg, idx) => (
                            <div
                                key={idx}
                                style={{
                                    width: `${seg.percentage}%`,
                                    backgroundColor: seg.color,
                                }}
                                className="group relative h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full hover:opacity-90"
                                title={`${seg.label}: ${seg.count} (${seg.percentage}%)`}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Legend Breakdown */}
            <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-2 sm:grid-cols-3 dark:border-gray-800/80">
                {segments.map((seg, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span className="truncate font-medium text-gray-600 dark:text-gray-300">{seg.label}:</span>
                        <span className="ml-auto font-semibold text-gray-900 dark:text-white">{seg.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
