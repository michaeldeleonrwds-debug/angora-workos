import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';

export type UserAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface UserAvatarUser {
    id?: number | string;
    name?: string | null;
    avatar?: string | null;
    avatar_url?: string | null;
    email?: string | null;
    role?: string | null;
    department?: string | null;
}

export interface UserAvatarProps {
    user?: UserAvatarUser | null;
    size?: UserAvatarSize;
    className?: string;
    imageClassName?: string;
    fallbackClassName?: string;
    showStatus?: boolean;
    statusColor?: string;
    alt?: string;
}

const sizeConfig: Record<UserAvatarSize, { root: string; text: string; status: string }> = {
    xs: {
        root: 'h-5 w-5',
        text: 'text-[9px]',
        status: 'h-1.5 w-1.5 ring-1',
    },
    sm: {
        root: 'h-7 w-7',
        text: 'text-[10px]',
        status: 'h-2 w-2 ring-2',
    },
    md: {
        root: 'h-8 w-8',
        text: 'text-xs',
        status: 'h-2 w-2 ring-2',
    },
    lg: {
        root: 'h-10 w-10',
        text: 'text-sm font-bold',
        status: 'h-2.5 w-2.5 ring-2',
    },
    xl: {
        root: 'h-20 w-20',
        text: 'text-xl font-bold',
        status: 'h-4 w-4 ring-2',
    },
};

export function UserAvatar({
    user,
    size = 'md',
    className,
    imageClassName,
    fallbackClassName,
    showStatus = false,
    statusColor = 'bg-[#D8F779]',
    alt,
}: UserAvatarProps) {
    const getInitials = useInitials();
    const config = sizeConfig[size] || sizeConfig.md;
    const name = user?.name || 'User';
    const avatarSrc = user?.avatar || user?.avatar_url || undefined;
    const initials = user?.name ? getInitials(user.name) : 'U';

    return (
        <div className={cn('relative inline-flex shrink-0 items-center justify-center', className)}>
            <Avatar className={cn('overflow-hidden rounded-full border border-white/10 ring-1 ring-white/10 shadow-sm', config.root, className)}>
                {avatarSrc ? (
                    <AvatarImage
                        src={avatarSrc}
                        alt={alt || name}
                        className={cn('aspect-square h-full w-full object-cover', imageClassName)}
                    />
                ) : null}
                <AvatarFallback
                    className={cn(
                        'flex h-full w-full items-center justify-center rounded-full bg-[#28283E] font-bold text-white',
                        config.text,
                        fallbackClassName
                    )}
                >
                    {initials}
                </AvatarFallback>
            </Avatar>
            {showStatus && (
                <span
                    className={cn(
                        'absolute bottom-0 right-0 rounded-full ring-[#1E1E30]',
                        config.status,
                        statusColor
                    )}
                />
            )}
        </div>
    );
}

export default UserAvatar;
