import React from 'react';

interface ChartWidgetProps {
    title: string;
    data?: {
        chart_type?: string;
        x_axis?: string;
        series?: Array<{ label: string; value: number }>;
    };
}

const PALETTE = ['#6366f1', '#00c875', '#fdab3d', '#ff5ac4', '#579bfc', '#a25ddc', '#00d2d2'];

export const ChartWidget: React.FC<ChartWidgetProps> = ({ title, data }) => {
    const chartType = data?.chart_type ?? 'bar';
    const series = data?.series ?? [];

    if (series.length === 0) {
        return <div className="flex h-48 items-center justify-center text-xs text-gray-400">No data points available for this period.</div>;
    }

    const maxValue = Math.max(...series.map((s) => s.value), 1);
    const totalValue = series.reduce((sum, s) => sum + s.value, 0);

    return (
        <div className="flex h-full w-full flex-col justify-between space-y-4 p-2">
            {chartType === 'pie' ? (
                /* Native CSS / SVG Donut / Pie Breakdown */
                <div className="flex flex-col items-center justify-around gap-4 pt-2 sm:flex-row">
                    <div className="relative flex h-36 w-36 flex-shrink-0 items-center justify-center">
                        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                            {/* Background circle */}
                            <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="3" className="dark:stroke-gray-800" />
                            {/* SVG Segments */}
                            {(() => {
                                let accumulatedPercent = 0;
                                return series.map((s, idx) => {
                                    const percent = totalValue > 0 ? (s.value / totalValue) * 100 : 0;
                                    const strokeDasharray = `${percent} ${100 - percent}`;
                                    const strokeDashoffset = -accumulatedPercent;
                                    accumulatedPercent += percent;
                                    const color = PALETTE[idx % PALETTE.length];

                                    return (
                                        <circle
                                            key={idx}
                                            cx="18"
                                            cy="18"
                                            r="15.9155"
                                            fill="none"
                                            stroke={color}
                                            strokeWidth="3.2"
                                            strokeDasharray={strokeDasharray}
                                            strokeDashoffset={strokeDashoffset}
                                            className="transition-all duration-300 hover:opacity-80"
                                        />
                                    );
                                });
                            })()}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-xl leading-none font-extrabold text-[#12121E] dark:text-white">{totalValue}</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase">Total</span>
                        </div>
                    </div>

                    <div className="min-w-[140px] flex-1 space-y-1.5">
                        {series.map((s, idx) => {
                            const percent = totalValue > 0 ? Math.round((s.value / totalValue) * 100) : 0;
                            const color = PALETTE[idx % PALETTE.length];
                            return (
                                <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
                                        <span className="truncate font-medium text-gray-600 dark:text-gray-300">{s.label}</span>
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {s.value} ({percent}%)
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* Native Responsive Bar Chart */
                <div className="space-y-3 pt-2">
                    {series.map((item, idx) => {
                        const percent = Math.round((item.value / maxValue) * 100);
                        const color = PALETTE[idx % PALETTE.length];

                        return (
                            <div key={idx} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="max-w-[180px] truncate font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                                    <span className="ml-2 font-bold text-gray-900 dark:text-white">{item.value}</span>
                                </div>
                                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${percent}%`,
                                            backgroundColor: color,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
