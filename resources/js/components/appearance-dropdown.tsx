import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { HTMLAttributes } from 'react';

export default function AppearanceToggleDropdown({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    const getCurrentIcon = () => {
        switch (appearance) {
            case 'dark':
                return <Moon className="h-4 w-4 text-[#D8F779]" />;
            case 'light':
                return <Sun className="h-4 w-4 text-amber-500" />;
            default:
                return <Monitor className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <div className={className} {...props}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-xl border border-[#ECECF0] bg-white text-[#191927] shadow-xs transition-all hover:bg-slate-50 dark:border-[#2C2C40] dark:bg-[#1E1E2F] dark:text-white dark:hover:bg-[#252538]"
                        title="Toggle theme (Light / Dark / System)"
                    >
                        {getCurrentIcon()}
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-36 rounded-2xl border-[#ECECF0] bg-white p-1.5 shadow-xl dark:border-[#2C2C40] dark:bg-[#1E1E2F]"
                >
                    <DropdownMenuItem
                        onClick={() => updateAppearance('light')}
                        className={`flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all ${
                            appearance === 'light'
                                ? 'bg-slate-100 font-bold text-[#191927] dark:bg-[#28283E] dark:text-white'
                                : 'text-[#191927] hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-[#252538]'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <Sun className="h-4 w-4 text-amber-500" />
                            Light
                        </span>
                        {appearance === 'light' && <Check className="h-3.5 w-3.5 text-[#191927] dark:text-white" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => updateAppearance('dark')}
                        className={`flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all ${
                            appearance === 'dark'
                                ? 'bg-slate-100 font-bold text-[#191927] dark:bg-[#28283E] dark:text-white'
                                : 'text-[#191927] hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-[#252538]'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <Moon className="h-4 w-4 text-[#D8F779]" />
                            Dark
                        </span>
                        {appearance === 'dark' && <Check className="h-3.5 w-3.5 text-[#191927] dark:text-white" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => updateAppearance('system')}
                        className={`flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all ${
                            appearance === 'system'
                                ? 'bg-slate-100 font-bold text-[#191927] dark:bg-[#28283E] dark:text-white'
                                : 'text-[#191927] hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-[#252538]'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-blue-500" />
                            System
                        </span>
                        {appearance === 'system' && <Check className="h-3.5 w-3.5 text-[#191927] dark:text-white" />}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
