import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { CheckSquare, ChevronDown, FolderKanban, Kanban, LayoutDashboard, Plus } from 'lucide-react';
import AppLogo from './app-logo';

interface NavItem {
    title: string;
    url: string;
    icon: any;
    badge?: string;
    color?: string;
}

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
        color: '#0073ea',
    },
    {
        title: 'Boards & Tasks',
        url: '/kanban',
        icon: CheckSquare,
        color: '#00c875',
    },
];

export function AppSidebar() {
    const page = usePage<SharedData>();
    const { state, isMobile } = useSidebar();
    const isCollapsed = state === 'collapsed' && !isMobile;

    return (
        <Sidebar collapsible="icon" variant="inset" className="border-none bg-transparent text-white">
            {/* Header: Logo & Workspace Selector */}
            <SidebarHeader className="border-b border-white/[0.08] p-3.5 pb-3 group-data-[collapsible=icon]:border-b-0 group-data-[collapsible=icon]:p-2">
                <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
                    <Link href="/dashboard" className="flex items-center justify-center">
                        <AppLogo />
                    </Link>
                </div>

                {/* Monday Workspace Selector */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="mt-2.5 flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-xs text-slate-200 transition-all group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:mt-2 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 hover:bg-white/[0.08]">
                            <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#0073ea] text-[10px] font-black text-white shadow-xs">
                                    M
                                </span>
                                <span className="text-xs font-semibold text-white group-data-[collapsible=icon]:hidden">Main Workspace</span>
                            </div>
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-data-[collapsible=icon]:hidden" />
                        </div>
                    </TooltipTrigger>
                    {isCollapsed && (
                        <TooltipContent
                            side="right"
                            align="center"
                            className="z-50 rounded-lg border border-[#353550] bg-[#1E1E30] px-3 py-1.5 text-xs text-white shadow-xl"
                        >
                            Main Workspace
                        </TooltipContent>
                    )}
                </Tooltip>
            </SidebarHeader>

            <SidebarContent className="px-2.5 py-2.5 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-2">
                {/* Section Header */}
                <div className="px-2.5 pt-2 pb-1.5 group-data-[collapsible=icon]:hidden">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400/80 uppercase">Work OS</span>
                </div>

                {/* Primary Navigation Items */}
                <div className="flex flex-col gap-1 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1.5">
                    {mainNavItems.map((item) => {
                        const isActive = page.url === item.url || (item.url !== '/dashboard' && page.url.startsWith(item.url));

                        const linkContent = (
                            <Link
                                key={item.title}
                                href={item.url}
                                className={`group/item flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition-all duration-150 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 ${
                                    isActive
                                        ? 'bg-[#0073ea] font-bold text-white shadow-sm'
                                        : 'text-slate-300/90 hover:bg-white/[0.07] hover:text-white'
                                }`}
                            >
                                <item.icon
                                    className={`h-4 w-4 shrink-0 transition-transform duration-150 group-hover/item:scale-105 ${
                                        isActive ? 'text-white' : 'text-slate-400 group-hover/item:text-white'
                                    }`}
                                />
                                <span className="truncate font-medium group-data-[collapsible=icon]:hidden">{item.title}</span>
                            </Link>
                        );

                        if (isCollapsed) {
                            return (
                                <Tooltip key={item.title}>
                                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                                    <TooltipContent
                                        side="right"
                                        align="center"
                                        className="z-50 rounded-lg border border-[#353550] bg-[#1E1E30] px-3 py-1.5 text-xs text-white shadow-xl"
                                    >
                                        <span className="font-semibold">{item.title}</span>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }

                        return linkContent;
                    })}
                </div>

                {/* Boards Quick Section */}
                <div className="mt-5 px-2.5 pt-2 pb-1.5 group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-wider text-slate-400/80 uppercase">Workspaces & Boards</span>
                        <Link
                            href="/kanban"
                            className="rounded p-0.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                            title="New Board or Task"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>

                <div className="flex flex-col gap-1 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1.5">
                    <Link
                        href="/kanban"
                        className="group/item flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-slate-300/90 transition-all duration-150 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 hover:bg-white/[0.07] hover:text-white"
                    >
                        <FolderKanban className="h-4 w-4 shrink-0 text-[#00c875] group-hover/item:scale-105" />
                        <span className="truncate font-medium group-data-[collapsible=icon]:hidden">Sprint & Task Board</span>
                    </Link>
                    <Link
                        href="/kanban"
                        className="group/item flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-slate-300/90 transition-all duration-150 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 hover:bg-white/[0.07] hover:text-white"
                    >
                        <Kanban className="h-4 w-4 shrink-0 text-[#fdab3d] group-hover/item:scale-105" />
                        <span className="truncate font-medium group-data-[collapsible=icon]:hidden">Active Workflow</span>
                    </Link>
                </div>
            </SidebarContent>

            <SidebarFooter className="border-t border-white/[0.08] bg-[#19192A]/50 p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-t-0 group-data-[collapsible=icon]:p-1.5">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
