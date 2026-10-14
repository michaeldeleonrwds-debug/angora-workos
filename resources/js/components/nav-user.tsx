import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useIsMobile } from '@/hooks/use-mobile';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ChevronsUpDown } from 'lucide-react';

export function NavUser() {
    const { auth } = usePage<SharedData>().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();
    const isCollapsed = state === 'collapsed' && !isMobile;

    const triggerButton = (
        <SidebarMenuButton
            size="lg"
            className="group rounded-xl text-white transition-all group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:overflow-visible group-data-[collapsible=icon]:p-0 hover:bg-white/[0.08] hover:text-white data-[state=open]:bg-white/[0.08]"
        >
            <UserInfo user={auth.user} />
            <ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-slate-400 group-hover:text-white group-data-[collapsible=icon]:hidden" />
        </SidebarMenuButton>
    );

    return (
        <SidebarMenu>
            <SidebarMenuItem className="flex justify-center">
                <DropdownMenu>
                    {isCollapsed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent
                                side="right"
                                align="center"
                                className="z-50 rounded-lg border border-[#353550] bg-[#1E1E30] px-3 py-1.5 text-xs text-white shadow-xl"
                            >
                                <span>{auth.user?.name}</span>
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
                    )}
                    <DropdownMenuContent
                        className="w-56 rounded-2xl border border-white/10 bg-[#1E1E30] text-white shadow-2xl"
                        align="end"
                        side={isMobile ? 'bottom' : isCollapsed ? 'right' : 'bottom'}
                        sideOffset={12}
                    >
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
