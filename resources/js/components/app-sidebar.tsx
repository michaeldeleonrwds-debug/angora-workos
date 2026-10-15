import { NavUser } from '@/components/nav-user';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Check, CheckSquare, ChevronDown, FolderKanban, Kanban, LayoutDashboard, Plus, Users } from 'lucide-react';
import AppLogo from './app-logo';

interface NavItem {
    title: string;
    url: string;
    icon: any;
    badge?: string;
    color?: string;
}

interface WorkspaceItem {
    id: number;
    name: string;
    color?: string;
    icon?: string;
    boards_count?: number;
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

    const canManageUsers = page.props.auth?.capabilities?.canManageUsers === true;

    const navItems: NavItem[] = [
        ...mainNavItems,
        ...(canManageUsers
            ? [
                  {
                      title: 'User Management',
                      url: '/users',
                      icon: Users,
                      color: '#a25ddc',
                  },
              ]
            : []),
    ];

    const userWorkspaces = ((page.props as any).userWorkspaces as WorkspaceItem[]) || [];
    const activeWorkspaceId = ((page.props as any).activeWorkspaceId as number) || userWorkspaces[0]?.id;
    const currentWorkspace = userWorkspaces.find((w) => w.id === activeWorkspaceId) || userWorkspaces[0] || {
        id: 1,
        name: 'Main Workspace',
        color: '#0073ea',
    };

    const handleSwitchWorkspace = (workspaceId: number) => {
        router.visit(`/kanban?workspace=${workspaceId}`, {
            preserveScroll: true,
        });
    };

    const workspaceSelectorTrigger = (
        <div className="mt-2.5 flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-xs text-slate-200 transition-all group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:mt-2 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 hover:bg-white/[0.08] select-none focus:outline-none">
            <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black text-white shadow-xs"
                    style={{ backgroundColor: currentWorkspace.color || '#0073ea' }}
                >
                    {currentWorkspace.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-xs font-semibold text-white truncate group-data-[collapsible=icon]:hidden">
                    {currentWorkspace.name}
                </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 group-data-[collapsible=icon]:hidden ml-1" />
        </div>
    );

    return (
        <Sidebar collapsible="icon" variant="inset" className="border-none bg-transparent text-white">
            {/* Header: Logo & Workspace Selector */}
            <SidebarHeader className="border-b border-white/[0.08] p-3.5 pb-3 group-data-[collapsible=icon]:border-b-0 group-data-[collapsible=icon]:p-2">
                <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
                    <Link href="/dashboard" className="flex items-center justify-center">
                        <AppLogo />
                    </Link>
                </div>

                {/* Workspace Selector with Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        {workspaceSelectorTrigger}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side={isCollapsed ? 'right' : 'bottom'}
                        align="start"
                        sideOffset={6}
                        className="w-56 rounded-2xl border border-white/10 bg-[#1E1E30] text-white shadow-2xl p-1.5 z-50"
                    >
                        <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                            Workspaces
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10 my-1" />
                        {userWorkspaces.length === 0 ? (
                            <div className="px-2 py-1.5 text-xs text-slate-400 italic">No workspaces available</div>
                        ) : (
                            userWorkspaces.map((w) => {
                                const isSelected = w.id === currentWorkspace.id;
                                return (
                                    <DropdownMenuItem
                                        key={w.id}
                                        onClick={() => handleSwitchWorkspace(w.id)}
                                        className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'bg-white/10 font-bold text-white'
                                                : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <span
                                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black text-white"
                                                style={{ backgroundColor: w.color || '#0073ea' }}
                                            >
                                                {w.name.charAt(0).toUpperCase()}
                                            </span>
                                            <span className="truncate">{w.name}</span>
                                        </div>
                                        {isSelected && <Check className="h-3.5 w-3.5 text-[#00c875] shrink-0 ml-1.5" />}
                                    </DropdownMenuItem>
                                );
                            })
                        )}
                        <DropdownMenuSeparator className="bg-white/10 my-1" />
                        <DropdownMenuItem asChild>
                            <Link
                                href="/kanban"
                                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/[0.07] cursor-pointer"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Create / Manage Boards</span>
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarHeader>

            <SidebarContent className="px-2.5 py-2.5 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-2">
                {/* Section Header */}
                <div className="px-2.5 pt-2 pb-1.5 group-data-[collapsible=icon]:hidden">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400/80 uppercase">Work OS</span>
                </div>

                {/* Primary Navigation Items */}
                <div className="flex flex-col gap-1 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1.5">
                    {navItems.map((item) => {
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
