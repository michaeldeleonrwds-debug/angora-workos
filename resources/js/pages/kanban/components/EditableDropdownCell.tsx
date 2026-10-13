import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Check, ChevronDown, Plus } from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface EditableDropdownCellProps {
    value?: string;
    options: string[];
    onSelect: (val: string) => void;
    placeholder?: string;
}

export default function EditableDropdownCell({
    value = '',
    options = [],
    onSelect,
    placeholder = 'Select',
}: EditableDropdownCellProps) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const displayVal = value && value !== '-' ? value : placeholder;
    const isSelected = Boolean(value && value !== '-');

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        const q = search.toLowerCase();
        return options.filter((o) => o.toLowerCase().includes(q));
    }, [options, search]);

    const isCustomMatch =
        search.trim().length > 0 &&
        !options.some((o) => o.toLowerCase() === search.trim().toLowerCase());

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="bg-muted/40 hover:bg-muted/70 text-foreground flex w-full items-center justify-between gap-1 truncate rounded px-2 py-1 text-center text-xs font-semibold transition-colors"
                >
                    <span className={`truncate ${!isSelected ? 'text-muted-foreground/60 font-normal' : ''}`}>
                        {displayVal}
                    </span>
                    <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-52 rounded-xl p-1.5 shadow-lg">
                <div className="p-1 pb-1.5">
                    <input
                        type="text"
                        placeholder="Search or enter type..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && search.trim()) {
                                e.preventDefault();
                                onSelect(search.trim());
                                setSearch('');
                                setIsOpen(false);
                            }
                        }}
                        autoFocus
                        className="bg-background border-border placeholder:text-muted-foreground/60 w-full rounded-md border px-2 py-1 text-xs focus:border-primary focus:outline-none"
                    />
                </div>

                {isCustomMatch && (
                    <DropdownMenuItem
                        onClick={() => {
                            onSelect(search.trim());
                            setSearch('');
                            setIsOpen(false);
                        }}
                        className="bg-primary/10 text-primary hover:bg-primary/20 mb-1 cursor-pointer rounded-lg px-2 py-1.5 text-xs font-bold"
                    >
                        <Plus className="mr-1.5 h-3 w-3 shrink-0" />
                        <span className="truncate">Use &quot;{search.trim()}&quot;</span>
                    </DropdownMenuItem>
                )}

                <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {filteredOptions.map((opt) => (
                        <DropdownMenuItem
                            key={opt}
                            onClick={() => {
                                onSelect(opt);
                                setSearch('');
                                setIsOpen(false);
                            }}
                            className={`flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs ${
                                opt === value ? 'bg-muted font-bold text-primary' : ''
                            }`}
                        >
                            <span className="truncate">{opt}</span>
                            {opt === value && <Check className="h-3 w-3 shrink-0 text-primary" />}
                        </DropdownMenuItem>
                    ))}
                    {filteredOptions.length === 0 && !isCustomMatch && (
                        <div className="text-muted-foreground py-2 text-center text-xs italic">
                            No matching options
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
