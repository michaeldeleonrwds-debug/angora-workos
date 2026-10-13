import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Bell, Plus, Star, Zap } from 'lucide-react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { unreadNotificationsCount = 0, recentNotifications = [] } = usePage<SharedData>().props as any;

    return (
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-[#ECECF0] bg-[#F8F9F7]/95 px-6 backdrop-blur-md transition-colors md:px-8 dark:border-[#28283E] dark:bg-[#161624]/95">
            {/* Left: Sidebar trigger & Board Breadcrumb */}
            <div className="flex items-center gap-3">
                <SidebarTrigger className="-ml-1 h-8 w-8 rounded-xl text-[#191927] transition-colors hover:bg-black/5 dark:text-white dark:hover:bg-white/10" />
                <div className="hidden items-center gap-2 sm:flex">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                    <Star className="h-3.5 w-3.5 cursor-pointer text-slate-400 transition-colors hover:text-amber-400" />
                </div>
            </div>

            {/* Right: Monday + New Item, Theme & Notifications */}
            <div className="flex items-center gap-2 md:gap-3">
                {/* Monday.com New Item Button */}
                <Link
                    href="/kanban"
                    className="flex items-center gap-1.5 rounded-full bg-[#0073ea] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#0060c0]"
                >
                    <Plus className="h-3.5 w-3.5 text-white" />
                    <span>New Item</span>
                </Link>

                {/* Eduplex Soft Pastel Automations Chip */}
                <div className="hidden items-center gap-1.5 rounded-full bg-[#E9DDFB] px-3 py-1 text-xs font-semibold text-[#5B309A] lg:flex dark:bg-[#3D2C5E] dark:text-[#D8B4FE]">
                    <Zap className="h-3.5 w-3.5 text-[#5B309A] dark:text-[#D8B4FE]" />
                    <span>Automations</span>
                    <span className="py-0.2 rounded-full bg-white/90 px-1.5 text-[10px] font-bold text-[#5B309A] dark:bg-[#281D42] dark:text-[#E9DDFB]">
                        12 Active
                    </span>
                </div>

                {/* Theme Toggle (Light / Dark / System) */}
                <AppearanceToggleDropdown />

                {/* Notifications Bell */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="relative h-9 w-9 rounded-xl border border-[#ECECF0] bg-white text-[#191927] shadow-xs transition-all hover:bg-slate-50 dark:border-[#2A2A3D] dark:bg-[#1E1E2F] dark:text-white dark:hover:bg-[#252538]"
                        >
                            <Bell className="h-4 w-4 text-[#191927] dark:text-white" />
                            {unreadNotificationsCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#e2445c] text-[10px] font-bold text-white shadow-xs">
                                    {unreadNotificationsCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="w-80 rounded-2xl border-[#ECECF0] bg-white p-2.5 shadow-xl dark:border-[#2A2A3D] dark:bg-[#1E1E2F]"
                    >
                        <DropdownMenuLabel className="flex items-center justify-between text-xs font-bold text-[#191927] dark:text-white">
                            <span>Notifications & Updates</span>
                            {unreadNotificationsCount > 0 && (
                                <span className="text-[10px] font-normal text-[#777785] dark:text-slate-400">{unreadNotificationsCount} unread</span>
                            )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-[#ECECF0] dark:bg-[#2A2A3D]" />
                        {recentNotifications.length === 0 ? (
                            <div className="p-4 text-center text-xs text-[#777785] dark:text-slate-400">No recent notifications</div>
                        ) : (
                            recentNotifications.map((notif: any) => (
                                <DropdownMenuItem
                                    key={notif.id}
                                    className="flex flex-col items-start gap-1 rounded-xl p-2.5 text-xs hover:bg-slate-50 dark:hover:bg-[#252538]"
                                >
                                    <div className="flex items-center gap-1.5 font-semibold text-[#191927] dark:text-white">
                                        <span className="h-2 w-2 rounded-full bg-[#D8F779]" />
                                        {notif.title}
                                    </div>
                                    <p className="text-[11px] leading-snug text-[#777785] dark:text-slate-400">{notif.message}</p>
                                </DropdownMenuItem>
                            ))
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
