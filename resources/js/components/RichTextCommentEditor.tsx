import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Mention from '@tiptap/extension-mention';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Code,
    Link as LinkIcon,
    Image as ImageIcon,
    AtSign,
    Undo,
    Redo,
    RemoveFormatting,
    Palette,
    Send,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { csrfHeaders, getCsrfToken } from '@/lib/utils';
import { User } from '@/pages/kanban/types';
import { createPortal } from 'react-dom';
import { UserAvatar } from '@/components/UserAvatar';

const ANGORA_COLORS = [
    { label: 'Default', value: '' },
    { label: 'Blue', value: '#0073ea' },
    { label: 'Purple', value: '#a25ddc' },
    { label: 'Green', value: '#00ca72' },
    { label: 'Coral', value: '#e2445c' },
    { label: 'Orange', value: '#ff642e' },
    { label: 'Slate', value: '#676879' },
];

interface RichTextCommentEditorProps {
    taskId: number;
    users?: User[];
    onSubmit: (html: string) => Promise<void> | void;
    placeholder?: string;
    isSubmitting?: boolean;
    buttonLabel?: string;
    isReply?: boolean;
    onCancel?: () => void;
    autoFocus?: boolean;
    isClientUser?: boolean;
}

export function RichTextCommentEditor({
    taskId,
    users = [],
    onSubmit,
    placeholder = 'Write an update, paste screenshots, or use @mention for team members...',
    isSubmitting = false,
    buttonLabel = 'Update',
    isReply = false,
    onCancel,
    autoFocus = false,
    isClientUser = false,
}: RichTextCommentEditorProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Mention state
    const [mentionState, setMentionState] = useState<{
        isOpen: boolean;
        query: string;
        range: any;
        clientRect?: (() => DOMRect | null) | null;
        command: ((attrs: any) => void) | null;
        selectedIndex: number;
    }>({
        isOpen: false,
        query: '',
        range: null,
        clientRect: null,
        command: null,
        selectedIndex: 0,
    });

    // Filter available users for mentions
    const filteredUsers = React.useMemo(() => {
        let pool = users;
        // In client-facing mode, never suggest internal-only developer/designer users
        if (isClientUser) {
            pool = pool.filter(
                (u) =>
                    u.role === 'client' ||
                    u.role === 'super_admin' ||
                    u.role === 'admin' ||
                    u.role === 'project_manager' ||
                    u.role === 'account_manager'
            );
        }

        const q = (mentionState.query || '').toLowerCase().trim();
        if (!q) return pool.slice(0, 8);
        return pool
            .filter(
                (u) =>
                    u.name.toLowerCase().includes(q) ||
                    (u.department && u.department.toLowerCase().includes(q)) ||
                    (u.role && u.role.toLowerCase().includes(q))
            )
            .slice(0, 8);
    }, [users, isClientUser, mentionState.query]);

    // Handle image upload to backend
    const uploadImage = async (file: File): Promise<string | null> => {
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file (JPEG, PNG, GIF, WEBP).');
            return null;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('Image must be under 10MB.');
            return null;
        }

        setIsUploadingImage(true);
        try {
            const token = getCsrfToken();
            const formData = new FormData();
            formData.append('image', file);
            if (token) {
                formData.append('_token', token);
            }

            const res = await fetch(`/kanban/tasks/${taskId}/comments/upload-image`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(token ? { 'X-CSRF-TOKEN': token } : {}),
                },
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Image upload failed');
            }

            const data = await res.json();
            return data.url;
        } catch (err: any) {
            console.error('Failed to upload inline image:', err);
            alert(err.message || 'Failed to upload image. Please try again.');
            return null;
        } finally {
            setIsUploadingImage(false);
        }
    };

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [2, 3],
                },
                codeBlock: {
                    HTMLAttributes: {
                        class: 'bg-muted/80 rounded-xl p-3 font-mono text-xs my-2 border border-border/60 overflow-x-auto',
                    },
                },
                blockquote: {
                    HTMLAttributes: {
                        class: 'border-l-3 border-primary/60 pl-3 italic text-muted-foreground my-2',
                    },
                },
                bulletList: {
                    HTMLAttributes: {
                        class: 'list-disc pl-5 space-y-1 my-2',
                    },
                },
                orderedList: {
                    HTMLAttributes: {
                        class: 'list-decimal pl-5 space-y-1 my-2',
                    },
                },
            }),
            Underline,
            TextStyle,
            Color,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline font-medium hover:opacity-80 transition-opacity',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                },
            }),
            Image.configure({
                inline: true,
                allowBase64: false,
                HTMLAttributes: {
                    class: 'rounded-xl max-h-80 max-w-full object-contain border border-border shadow-2xs my-2.5 cursor-pointer',
                },
            }),
            Mention.configure({
                HTMLAttributes: {
                    class: 'mention-node inline-flex items-center font-bold px-1.5 py-0.5 rounded-md text-xs text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors mx-0.5',
                },
                suggestion: {
                    items: ({ query }) => {
                        return users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()));
                    },
                    render: () => {
                        return {
                            onStart: (props) => {
                                setMentionState({
                                    isOpen: true,
                                    query: props.query,
                                    range: props.range,
                                    clientRect: props.clientRect,
                                    command: props.command,
                                    selectedIndex: 0,
                                });
                            },
                            onUpdate: (props) => {
                                setMentionState((prev) => ({
                                    ...prev,
                                    query: props.query,
                                    range: props.range,
                                    clientRect: props.clientRect,
                                    command: props.command,
                                }));
                            },
                            onKeyDown: (props) => {
                                if (props.event.key === 'ArrowDown') {
                                    setMentionState((prev) => ({
                                        ...prev,
                                        selectedIndex: (prev.selectedIndex + 1) % Math.max(1, filteredUsers.length),
                                    }));
                                    return true;
                                }
                                if (props.event.key === 'ArrowUp') {
                                    setMentionState((prev) => ({
                                        ...prev,
                                        selectedIndex:
                                            (prev.selectedIndex + filteredUsers.length - 1) %
                                            Math.max(1, filteredUsers.length),
                                    }));
                                    return true;
                                }
                                if (props.event.key === 'Enter') {
                                    if (filteredUsers.length > 0 && mentionState.command) {
                                        const selectedUser = filteredUsers[mentionState.selectedIndex] || filteredUsers[0];
                                        mentionState.command({
                                            id: selectedUser.id,
                                            label: selectedUser.name,
                                        });
                                        return true;
                                    }
                                }
                                if (props.event.key === 'Escape') {
                                    setMentionState((prev) => ({ ...prev, isOpen: false }));
                                    return true;
                                }
                                return false;
                            },
                            onExit: () => {
                                setMentionState((prev) => ({ ...prev, isOpen: false }));
                            },
                        };
                    },
                },
            }),
        ],
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[70px] max-h-[360px] overflow-y-auto text-sm leading-relaxed text-foreground px-1 py-1.5',
                placeholder,
            },
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (!items) return false;

                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.type.startsWith('image/')) {
                        const file = item.getAsFile();
                        if (file) {
                            event.preventDefault();
                            uploadImage(file).then((url) => {
                                if (url && editor) {
                                    editor.chain().focus().setImage({ src: url, alt: file.name }).run();
                                }
                            });
                            return true;
                        }
                    }
                }
                return false;
            },
            handleDrop: (view, event) => {
                const files = event.dataTransfer?.files;
                if (!files || files.length === 0) return false;

                const file = files[0];
                if (file.type.startsWith('image/')) {
                    event.preventDefault();
                    uploadImage(file).then((url) => {
                        if (url && editor) {
                            editor.chain().focus().setImage({ src: url, alt: file.name }).run();
                        }
                    });
                    return true;
                }
                return false;
            },
        },
        onFocus: () => setIsFocused(true),
    });

    const selectMentionUser = (user: User) => {
        if (mentionState.command) {
            mentionState.command({ id: user.id, label: user.name });
        } else if (editor) {
            editor
                .chain()
                .focus()
                .insertContent({
                    type: 'mention',
                    attrs: { id: user.id, label: user.name },
                })
                .insertContent(' ')
                .run();
        }
        setMentionState((prev) => ({ ...prev, isOpen: false }));
    };

    const handleFilePickerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = await uploadImage(file);
        if (url && editor) {
            editor.chain().focus().setImage({ src: url, alt: file.name }).run();
        }
        e.target.value = '';
    };

    const handleApplyLink = () => {
        if (!editor) return;
        const url = linkUrl.trim();
        if (url === '') {
            editor.chain().focus().unsetLink().run();
        } else {
            const formatted = /^https?:\/\//i.test(url) ? url : `https://${url}`;
            editor.chain().focus().setLink({ href: formatted }).run();
        }
        setIsLinkPopoverOpen(false);
        setLinkUrl('');
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!editor || isSubmitting || isUploadingImage) return;

        const html = editor.getHTML();
        const text = editor.getText().trim();
        const hasImages = html.includes('<img');

        if (!text && !hasImages) return;

        await onSubmit(html);
        editor.commands.clearContent();
        setIsFocused(false);
    };

    if (!editor) return null;

    // Calculate mention popup position with smart flip & edge bounds
    let popupStyle: React.CSSProperties = { display: 'none' };
    if (mentionState.isOpen && mentionState.clientRect && typeof window !== 'undefined') {
        const rect = mentionState.clientRect();
        if (rect) {
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;
            const openAbove = spaceBelow < 240 && spaceAbove > spaceBelow;

            const left = Math.min(Math.max(12, rect.left), Math.max(12, viewportWidth - 280));
            const availableHeight = openAbove ? Math.max(120, spaceAbove - 24) : Math.max(120, spaceBelow - 24);

            popupStyle = {
                position: 'fixed',
                ...(openAbove
                    ? { bottom: `${Math.max(8, viewportHeight - rect.top + 6)}px` }
                    : { top: `${Math.min(viewportHeight - 120, rect.bottom + 6)}px` }),
                left: `${left}px`,
                maxHeight: `${Math.min(224, availableHeight)}px`,
                zIndex: 99999,
            };
        }
    }

    return (
        <div
            className={`group relative rounded-2xl border transition-all ${
                isFocused
                    ? 'border-primary/50 bg-card shadow-xs ring-1 ring-primary/20'
                    : 'border-border/80 bg-card/70 hover:border-border shadow-2xs'
            }`}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleFilePickerChange}
                className="hidden"
            />

            {/* Expandable Top Formatting Toolbar */}
            <div
                className={`flex flex-wrap items-center gap-0.5 border-b border-border/40 px-3 py-1.5 transition-all ${
                    isFocused || isReply ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                }`}
            >
                {/* Text Formatting */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`rounded-lg p-1.5 text-xs transition-colors ${
                        editor.isActive('bold')
                            ? 'bg-primary/15 text-primary font-bold'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title="Bold (Ctrl+B)"
                >
                    <Bold className="h-3.5 w-3.5" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`rounded-lg p-1.5 text-xs transition-colors ${
                        editor.isActive('italic')
                            ? 'bg-primary/15 text-primary font-bold'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title="Italic (Ctrl+I)"
                >
                    <Italic className="h-3.5 w-3.5" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`rounded-lg p-1.5 text-xs transition-colors ${
                        editor.isActive('underline')
                            ? 'bg-primary/15 text-primary font-bold'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title="Underline (Ctrl+U)"
                >
                    <UnderlineIcon className="h-3.5 w-3.5" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`rounded-lg p-1.5 text-xs transition-colors ${
                        editor.isActive('strike')
                            ? 'bg-primary/15 text-primary font-bold'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title="Strikethrough"
                >
                    <Strikethrough className="h-3.5 w-3.5" />
                </button>

                <span className="mx-1 h-3.5 w-px bg-border/60" />

                {/* Headings */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`rounded-lg p-1.5 text-xs transition-colors ${
                        editor.isActive('heading', { level: 2 })
                            ? 'bg-primary/15 text-primary font-bold'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title="Heading 2"
                >
                    <Heading2 className="h-3.5 w-3.5" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`rounded-lg p-1.5 text-xs transition-colors ${
                        editor.isActive('heading', { level: 3 })
                            ? 'bg-primary/15 text-primary font-bold'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title="Heading 3"
                >
                    <Heading3 className="h-3.5 w-3.5" />
                </button>

                <span className="mx-1 h-3.5 w-px bg-border/60" />

                {/* Lists & Blocks */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`rounded-lg p-1.5 text-xs transition-colors ${
                        editor.isActive('bulletList')
                            ? 'bg-primary/15 text-primary font-bold'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title="Bullet List"
                >
                    <List className="h-3.5 w-3.5" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`rounded-lg p-1.5 text-xs transition-colors ${
                        editor.isActive('orderedList')
                            ? 'bg-primary/15 text-primary font-bold'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title="Numbered List"
                >
                    <ListOrdered className="h-3.5 w-3.5" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`rounded-lg p-1.5 text-xs transition-colors ${
                        editor.isActive('blockquote')
                            ? 'bg-primary/15 text-primary font-bold'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title="Blockquote"
                >
                    <Quote className="h-3.5 w-3.5" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className={`rounded-lg p-1.5 text-xs transition-colors ${
                        editor.isActive('codeBlock')
                            ? 'bg-primary/15 text-primary font-bold'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title="Code Block"
                >
                    <Code className="h-3.5 w-3.5" />
                </button>

                <span className="mx-1 h-3.5 w-px bg-border/60" />

                {/* Hyperlink */}
                <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className={`rounded-lg p-1.5 text-xs transition-colors ${
                                editor.isActive('link')
                                    ? 'bg-primary/15 text-primary font-bold'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                            title="Insert Link"
                        >
                            <LinkIcon className="h-3.5 w-3.5" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3 rounded-xl shadow-lg border-border" side="bottom" align="start">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Insert Web Link
                            </label>
                            <Input
                                type="url"
                                placeholder="https://example.com"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                className="h-8 text-xs"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleApplyLink();
                                    }
                                }}
                            />
                            <div className="flex justify-end gap-1.5 pt-1">
                                {editor.isActive('link') && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs text-red-500 hover:text-red-600"
                                        onClick={() => {
                                            editor.chain().focus().unsetLink().run();
                                            setIsLinkPopoverOpen(false);
                                        }}
                                    >
                                        Remove
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    className="h-7 text-xs font-semibold px-3"
                                    onClick={handleApplyLink}
                                >
                                    Apply
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Color Palette */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="rounded-lg p-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Text Color"
                        >
                            <Palette className="h-3.5 w-3.5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-36 p-1.5 rounded-xl border-border" align="start">
                        {ANGORA_COLORS.map((c) => (
                            <DropdownMenuItem
                                key={c.label}
                                onClick={() => {
                                    if (!c.value) {
                                        editor.chain().focus().unsetColor().run();
                                    } else {
                                        editor.chain().focus().setColor(c.value).run();
                                    }
                                }}
                                className="flex items-center gap-2 text-xs py-1.5 cursor-pointer"
                            >
                                <span
                                    className="h-3 w-3 rounded-full border border-border shrink-0"
                                    style={{ backgroundColor: c.value || '#191927' }}
                                />
                                <span>{c.label}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Clear Formatting */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                    className="rounded-lg p-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Clear Formatting"
                >
                    <RemoveFormatting className="h-3.5 w-3.5" />
                </button>

                <div className="ml-auto flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        className="rounded-lg p-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        className="rounded-lg p-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Editor Content Area */}
            <div className="p-3">
                <EditorContent editor={editor} />
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between border-t border-border/40 px-3 py-2 text-xs">
                <div className="flex items-center gap-1.5">
                    {/* @ Mention Button */}
                    <button
                        type="button"
                        onClick={() => {
                            editor.chain().focus().insertContent('@').run();
                        }}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                    >
                        <AtSign className="h-3.5 w-3.5 text-primary" />
                        <span>Mention</span>
                    </button>

                    {/* Image Upload Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-primary transition-colors disabled:opacity-50"
                        title="Attach screenshot or image"
                    >
                        {isUploadingImage ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        ) : (
                            <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                        )}
                        <span>{isUploadingImage ? 'Uploading...' : 'Image'}</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onCancel}
                            className="h-8 text-xs font-medium"
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSubmit()}
                        disabled={isSubmitting || isUploadingImage}
                        className="h-8 gap-1.5 px-4 text-xs font-bold"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Send className="h-3 w-3" />
                        )}
                        <span>{buttonLabel}</span>
                    </Button>
                </div>
            </div>

            {/* Mention Suggestions Floating Popup (Portaled to document.body so it is never clipped by drawer or editor overflow) */}
            {mentionState.isOpen && filteredUsers.length > 0 && typeof document !== 'undefined'
                ? createPortal(
                    <div
                        style={popupStyle}
                        className="w-64 overflow-y-auto rounded-xl border border-white/10 bg-[#1E1E30] text-white p-1 shadow-2xl animate-in fade-in-50 zoom-in-95"
                    >
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
                            Mention Person
                        </div>
                        {filteredUsers.map((u, idx) => (
                            <button
                                key={u.id}
                                type="button"
                                onClick={() => selectMentionUser(u)}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                                    idx === mentionState.selectedIndex
                                        ? 'bg-primary/20 text-white font-bold'
                                        : 'text-slate-200 hover:bg-white/10'
                                }`}
                            >
                                <UserAvatar user={u} size="xs" />
                                <div className="flex flex-col min-w-0">
                                    <span className="truncate">{u.name}</span>
                                    {u.department && (
                                        <span className="text-[10px] text-slate-400 truncate font-normal">
                                            {u.department}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>,
                    document.body
                )
                : null}
        </div>
    );
}
