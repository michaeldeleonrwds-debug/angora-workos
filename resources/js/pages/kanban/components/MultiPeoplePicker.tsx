import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Check, Search, User as UserIcon, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { User } from '../types';

interface MultiPeoplePickerProps {
    selectedUserIds: number[];
    users: User[];
    onChange: (userIds: number[]) => void;
    placeholder?: string;
    maxDisplay?: number;
    align?: 'start' | 'center' | 'end';
    badgeLabel?: string;
    badgeColor?: string;
    showNames?: boolean;
    compact?: boolean;
    disabled?: boolean;
}

export default function MultiPeoplePicker({
    selectedUserIds = [],
    users = [],
    onChange,
    placeholder = 'Unassigned',
    maxDisplay = 2,
    align = 'center',
    badgeLabel,
    badgeColor,
    showNames = true,
    compact = false,
    disabled = false,
}: MultiPeoplePickerProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const assignedUsers = useMemo(() => {
        return selectedUserIds
            .map((id) => users.find((u) => u.id === id))
            .filter((u): u is User => Boolean(u));
    }, [selectedUserIds, users]);

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(
            (u) =>
                u.name.toLowerCase().includes(q) ||
                (u.email && u.email.toLowerCase().includes(q)) ||
                (u.department && u.department.toLowerCase().includes(q)) ||
                (u.role && u.role.toLowerCase().includes(q)),
        );
    }, [users, searchQuery]);

    const handleToggleUser = (userId: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (selectedUserIds.includes(userId)) {
            onChange(selectedUserIds.filter((id) => id !== userId));
        } else {
            onChange([...selectedUserIds, userId]);
        }
    };

    const handleClearAll = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onChange([]);
    };

    const displayedUsers = assignedUsers.slice(0, maxDisplay);
    const extraCount = assignedUsers.length - maxDisplay;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <button
                    type="button"
                    disabled={disabled}
                    className={`group flex max-w-full items-center justify-center gap-1.5 overflow-hidden rounded-lg p-1 transition-colors select-none focus:outline-none ${
                        disabled ? 'cursor-default opacity-80' : 'hover:bg-muted/70'
                    }`}
                    title={
                        assignedUsers.length > 0
                            ? `${badgeLabel ? `${badgeLabel}: ` : ''}${assignedUsers.map((u) => u.name).join(', ')}`
                            : placeholder
                    }
                >
                    {badgeLabel && (
                        <span
                            className="mr-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white"
                            style={{ backgroundColor: badgeColor || '#64748b' }}
                        >
                            {badgeLabel}
                        </span>
                    )}

                    {assignedUsers.length === 0 ? (
                        <div className="flex items-center gap-1.5">
                            <div className="border-border text-muted-foreground flex h-6 w-6 items-center justify-center rounded-full border border-dashed">
                                <UserIcon className="h-3.5 w-3.5" />
                            </div>
                            {showNames && !compact && (
                                <span className="text-muted-foreground max-w-[80px] truncate text-xs font-normal">
                                    {placeholder}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <div className="flex -space-x-1.5 overflow-hidden">
                                {displayedUsers.map((u) => (
                                    <div
                                        key={u.id}
                                        className="bg-primary/20 text-primary border-background flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-black ring-1 ring-border"
                                        title={u.name}
                                    >
                                        {u.name.charAt(0).toUpperCase()}
                                    </div>
                                ))}
                                {extraCount > 0 && (
                                    <div className="bg-muted text-muted-foreground border-background flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-bold ring-1 ring-border">
                                        +{extraCount}
                                    </div>
                                )}
                            </div>

                            {showNames && !compact && assignedUsers.length === 1 && (
                                <span className="max-w-[80px] truncate text-xs font-medium">
                                    {assignedUsers[0].name.split(' ')[0]}
                                </span>
                            )}

                            {showNames && !compact && assignedUsers.length > 1 && (
                                <span className="text-muted-foreground text-[11px] font-semibold">
                                    {assignedUsers.length} people
                                </span>
                            )}
                        </div>
                    )}
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align={align}
                className="w-64 rounded-2xl p-2 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Header */}
                <div className="relative mb-2 px-1">
                    <Search className="text-muted-foreground absolute top-2.5 left-3 h-3.5 w-3.5" />
                    <input
                        type="text"
                        placeholder="Search team member..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-muted/50 border-border focus:border-primary focus:bg-background h-8 w-full rounded-xl border pr-2 pl-8 text-xs focus:outline-none"
                    />
                </div>

                {/* Quick Clear Action */}
                {selectedUserIds.length > 0 && (
                    <div className="mb-1 flex items-center justify-between px-2 py-1">
                        <span className="text-muted-foreground text-[11px] font-medium">
                            {selectedUserIds.length} selected
                        </span>
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="text-muted-foreground hover:text-red-500 flex items-center gap-1 text-[11px] font-semibold transition-colors"
                        >
                            <X className="h-3 w-3" />
                            <span>Clear all</span>
                        </button>
                    </div>
                )}

                <DropdownMenuSeparator />

                {/* Users List */}
                <div className="max-h-56 space-y-0.5 overflow-y-auto py-1">
                    {filteredUsers.length === 0 ? (
                        <div className="text-muted-foreground py-4 text-center text-xs">
                            No team members found
                        </div>
                    ) : (
                        filteredUsers.map((u) => {
                            const isSelected = selectedUserIds.includes(u.id);
                            return (
                                <button
                                    key={u.id}
                                    type="button"
                                    onClick={(e) => handleToggleUser(u.id, e)}
                                    className={`hover:bg-muted/80 flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors ${
                                        isSelected ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <div
                                            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                                isSelected
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="truncate">
                                            <div className="truncate text-xs">{u.name}</div>
                                            {u.department && (
                                                <div className="text-muted-foreground truncate text-[10px]">
                                                    {u.department}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div
                                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                                            isSelected
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-border'
                                        }`}
                                    >
                                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
