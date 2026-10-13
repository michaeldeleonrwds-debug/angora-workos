import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';

export function UserInfo({ user, showEmail = false }: { user: User; showEmail?: boolean }) {
    const getInitials = useInitials();
    const roleString = typeof user.role === 'string' ? user.role : '';
    const roleLabel = roleString ? roleString.replace('_', ' ') : 'Team Member';

    return (
        <>
            <div className="relative shrink-0">
                <Avatar className="h-8 w-8 overflow-hidden rounded-full ring-1 ring-white/15">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-full border border-white/10 bg-[#28283E] text-xs font-bold text-white">
                        {getInitials(user.name)}
                    </AvatarFallback>
                </Avatar>
                <span className="absolute right-0 bottom-0 h-2 w-2 rounded-full bg-[#D8F779] ring-2 ring-[#1E1E30]" />
            </div>
            <div className="grid min-w-0 flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold text-white">{user.name}</span>
                <span className="truncate text-[10px] text-slate-400 capitalize">{showEmail ? user.email : roleLabel}</span>
            </div>
        </>
    );
}
