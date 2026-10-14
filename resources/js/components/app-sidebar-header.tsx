import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { NotificationCenterPopover } from '@/components/NotificationCenterPopover';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Link } from '@inertiajs/react';
import { Plus, Star, Zap } from 'lucide-react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {

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

                {/* Notifications Bell & Popover Center */}
                <NotificationCenterPopover />
            </div>
        </header>
    );
}
