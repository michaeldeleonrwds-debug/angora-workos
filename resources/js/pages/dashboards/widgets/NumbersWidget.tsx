import { AlertCircle, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import React from 'react';

interface NumbersWidgetProps {
    title: string;
    data?: {
        value?: string | number;
        label?: string;
        trend?: number;
        restricted?: boolean;
    };
}

export const NumbersWidget: React.FC<NumbersWidgetProps> = ({ title, data }) => {
    if (data?.restricted) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-center text-gray-400">
                <AlertCircle className="mb-2 h-8 w-8 text-amber-500" />
                <p className="font-semibold text-gray-800 dark:text-gray-200">Access Restricted</p>
                <p className="mt-1 text-xs text-gray-400">You do not have department permission to view this metric.</p>
            </div>
        );
    }

    const value = data?.value ?? '0';
    const label = data?.label ?? title;
    const trend = data?.trend ?? 0;
    const isPositive = trend >= 0;

    return (
        <div className="flex h-full flex-col justify-between p-2">
            <div>
                <p className="mb-1 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">{label}</p>
                <div className="text-3xl font-extrabold tracking-tight text-[#12121E] lg:text-4xl dark:text-white">{value}</div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium">
                <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 ${
                        isPositive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                    }`}
                >
                    {isPositive ? <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" /> : <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />}
                    {Math.abs(trend)}%
                </span>
                <span className="text-[11px] text-gray-400">vs previous cycle</span>
            </div>
        </div>
    );
};
