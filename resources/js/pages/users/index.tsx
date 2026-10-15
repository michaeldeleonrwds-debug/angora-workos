import InputError from '@/components/input-error';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Ban,
    CheckCircle2,
    Clock,
    Copy,
    Filter,
    FolderKanban,
    Mail,
    Plus,
    RefreshCw,
    Search,
    Shield,
    Trash2,
    UserCheck,
    UserPlus,
    Users,
    XCircle,
} from 'lucide-react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Workspaces',
        href: '/dashboard',
    },
    {
        title: 'User Management',
        href: '/users',
    },
];

interface UserItem {
    id: number;
    can_edit: boolean;
    can_suspend: boolean;
    can_delete: boolean;
    name: string;
    email: string;
    role: string;
    department?: string;
    phone?: string;
    status: 'active' | 'inactive' | 'suspended';
    workspaces?: Array<{ id: number; name: string }>;
    managedProjects?: Array<{ id: number; name: string; code?: string }>;
    projects?: Array<{ id: number; name: string; code?: string }>;
    created_at?: string;
}

interface InvitationItem {
    id: number;
    email: string;
    token: string;
    role: string;
    workspace?: { id: number; name: string };
    board?: { id: number; title: string };
    inviter?: { id: number; name: string };
    expires_at: string;
    accepted_at: string | null;
    revoked_at: string | null;
    created_at: string;
}

interface UsersPageProps {
    users: {
        data: UserItem[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        last_page: number;
        total: number;
    };
    invitations: InvitationItem[];
    workspaces: Array<{ id: number; name: string }>;
    boards: Array<{ id: number; title: string; workspace_id: number }>;
    systemRoles: Record<string, string>;
    assignableRoles: Record<string, string>;
    filters: {
        search: string;
        role: string;
        status: string;
    };
}

export default function UsersIndex({
    users,
    invitations,
    workspaces,
    boards,
    systemRoles,
    assignableRoles,
    filters,
}: UsersPageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');

    // Dialog state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // Filter submit
    const handleFilter = (newSearch?: string, newRole?: string, newStatus?: string) => {
        router.get(
            '/users',
            {
                search: newSearch !== undefined ? newSearch : search,
                role: newRole !== undefined ? newRole : roleFilter,
                status: newStatus !== undefined ? newStatus : statusFilter,
            },
            { preserveState: true, replace: true },
        );
    };

    // Direct create form
    const createForm = useForm<{
        name: string;
        email: string;
        role: string;
        department: string;
        phone: string;
        password: string;
        workspace_ids: number[];
        [key: string]: any;
    }>({
        name: '',
        email: '',
        role: 'employee',
        department: 'Operations',
        phone: '',
        password: '',
        workspace_ids: [],
    });

    // Invite form
    const inviteForm = useForm<{
        email: string;
        role: string;
        workspace_id: string;
        board_id: string;
        [key: string]: any;
    }>({
        email: '',
        role: 'employee',
        workspace_id: '',
        board_id: '',
    });

    // Edit user form
    const editForm = useForm<{
        name: string;
        role: string;
        department: string;
        phone: string;
        status: 'active' | 'inactive' | 'suspended';
        [key: string]: any;
    }>({
        name: '',
        role: 'employee',
        department: '',
        phone: '',
        status: 'active',
    });

    const openEditModal = (user: UserItem) => {
        setEditingUser(user);
        editForm.setData({
            name: user.name,
            role: user.role,
            department: user.department || '',
            phone: user.phone || '',
            status: user.status,
        });
    };

    const handleCreateSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        createForm.post('/users', {
            onSuccess: () => {
                createForm.reset();
                setIsCreateOpen(false);
            },
        });
    };

    const handleInviteSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        inviteForm.post('/users/invite', {
            onSuccess: () => {
                inviteForm.reset();
                setIsInviteOpen(false);
            },
        });
    };

    const handleEditSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!editingUser) return;
        editForm.put(`/users/${editingUser.id}`, {
            onSuccess: () => setEditingUser(null),
        });
    };

    const handleToggleStatus = (user: UserItem, nextStatus: 'active' | 'suspended') => {
        if (!confirm(`Are you sure you want to mark ${user.name} as ${nextStatus}?`)) return;
        router.patch(`/users/${user.id}/status`, { status: nextStatus }, { preserveScroll: true });
    };

    const handleDeleteUser = (user: UserItem) => {
        if (!confirm(`Are you sure you want to permanently delete ${user.name}? This cannot be undone.`)) return;
        router.delete(`/users/${user.id}`, { preserveScroll: true });
    };

    const handleResendInvitation = (invitationId: number) => {
        router.post(`/users/invitations/${invitationId}/resend`, {}, { preserveScroll: true });
    };

    const handleRevokeInvitation = (invitationId: number) => {
        if (!confirm('Are you sure you want to revoke this invitation token?')) return;
        router.delete(`/users/invitations/${invitationId}`, { preserveScroll: true });
    };

    const copyInviteLink = (token: string) => {
        const link = `${window.location.origin}/invitations/${token}`;
        navigator.clipboard.writeText(link);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'super_admin':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
            case 'admin':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
            case 'project_manager':
            case 'account_manager':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
            case 'designer':
            case 'developer':
                return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
            case 'employee':
                return 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800';
            case 'client':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            default:
                return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                );
            case 'suspended':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                        <Ban className="h-3 w-3" /> Suspended
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Inactive
                    </span>
                );
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Management & Access — Angora Work OS" />

            <div className="flex h-full flex-1 flex-col gap-5 p-4 md:p-6">
                {/* Header Section */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight text-[#161624] dark:text-white">
                                Users & Permissions
                            </h1>
                            <Badge variant="outline" className="text-xs font-semibold">
                                {users.total} Total
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Manage organization members, system roles, direct invitations, and access scoping.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Button
                            variant="outline"
                            onClick={() => setIsInviteOpen(true)}
                            className="h-9 gap-1.5 rounded-xl border-[#ECECF0] text-xs font-semibold text-[#161624] shadow-xs hover:bg-slate-50 dark:border-[#28283E] dark:text-slate-200 dark:hover:bg-[#202035]"
                        >
                            <Mail className="h-3.5 w-3.5" />
                            Invite by Email
                        </Button>
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            className="h-9 gap-1.5 rounded-xl bg-[#161624] text-xs font-bold text-white shadow-xs hover:bg-black dark:bg-[#D8F779] dark:text-[#161624] dark:hover:bg-[#c8e967]"
                        >
                            <UserPlus className="h-3.5 w-3.5" />
                            Add User
                        </Button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-[#ECECF0] dark:border-[#28283E]">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                            activeTab === 'users'
                                ? 'border-[#161624] text-[#161624] dark:border-[#D8F779] dark:text-[#D8F779]'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        <Users className="h-3.5 w-3.5" />
                        Active Members ({users.total})
                    </button>
                    <button
                        onClick={() => setActiveTab('invitations')}
                        className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                            activeTab === 'invitations'
                                ? 'border-[#161624] text-[#161624] dark:border-[#D8F779] dark:text-[#D8F779]'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        <Mail className="h-3.5 w-3.5" />
                        Invitations ({invitations.filter((i) => !i.accepted_at && !i.revoked_at).length} Pending)
                    </button>
                </div>

                {/* Tab 1: Users Directory */}
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        {/* Filters Row */}
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ECECF0] bg-white p-3 dark:border-[#28283E] dark:bg-[#1A1A2C]">
                            <div className="relative min-w-[240px] flex-1">
                                <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        handleFilter(e.target.value, roleFilter, statusFilter);
                                    }}
                                    placeholder="Search by name, email, department..."
                                    className="h-8.5 rounded-xl pl-8 text-xs"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={roleFilter}
                                    onChange={(e) => {
                                        setRoleFilter(e.target.value);
                                        handleFilter(search, e.target.value, statusFilter);
                                    }}
                                    className="h-8.5 rounded-xl border border-input bg-card text-foreground dark:bg-[#1E1E30] dark:text-white px-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                                >
                                    <option value="" className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">All Roles</option>
                                    {Object.entries(systemRoles).map(([val, label]) => (
                                        <option key={val} value={val} className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">
                                            {label}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        handleFilter(search, roleFilter, e.target.value);
                                    }}
                                    className="h-8.5 rounded-xl border border-input bg-card text-foreground dark:bg-[#1E1E30] dark:text-white px-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                                >
                                    <option value="" className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">All Statuses</option>
                                    <option value="active" className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">Active</option>
                                    <option value="suspended" className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">Suspended</option>
                                    <option value="inactive" className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">Inactive</option>
                                </select>

                                {(search || roleFilter || statusFilter) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSearch('');
                                            setRoleFilter('');
                                            setStatusFilter('');
                                            handleFilter('', '', '');
                                        }}
                                        className="h-8.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-hidden rounded-2xl border border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1A1A2C]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b border-[#ECECF0] bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-[#28283E] dark:bg-[#12121E]/60 dark:text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3">Member</th>
                                            <th className="px-4 py-3">Role</th>
                                            <th className="px-4 py-3">Department</th>
                                            <th className="px-4 py-3">Workspaces</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ECECF0] dark:divide-[#28283E]">
                                        {users.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                                    No members found matching the specified criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            users.data.map((user) => (
                                                <tr
                                                    key={user.id}
                                                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-[#202035]/60"
                                                >
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8 border border-[#ECECF0] dark:border-[#28283E]">
                                                                <AvatarFallback className="bg-slate-100 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                                    {user.name.slice(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="font-bold text-[#161624] dark:text-slate-100">
                                                                    {user.name}
                                                                </div>
                                                                <div className="text-[11px] text-slate-400">
                                                                    {user.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span
                                                            className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${getRoleBadgeVariant(
                                                                user.role,
                                                            )}`}
                                                        >
                                                            {systemRoles[user.role] || user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                                                        {user.department || '—'}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        {user.workspaces && user.workspaces.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {user.workspaces.map((ws) => (
                                                                    <span
                                                                        key={ws.id}
                                                                        className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                                                    >
                                                                        {ws.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-400">None</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5">{getStatusBadge(user.status)}</td>
                                                    <td className="px-4 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {user.can_edit && <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openEditModal(user)}
                                                                className="h-7 rounded-lg border-[#ECECF0] px-2 text-[11px] font-semibold dark:border-[#28283E]"
                                                            >
                                                                Edit
                                                            </Button>}

                                                            {user.can_suspend && (user.status === 'active' ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleToggleStatus(user, 'suspended')}
                                                                    className="h-7 rounded-lg border-amber-200 px-2 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                                                >
                                                                    Suspend
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleToggleStatus(user, 'active')}
                                                                    className="h-7 rounded-lg border-emerald-200 px-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                                                >
                                                                    Activate
                                                                </Button>
                                                            ))}

                                                            {user.can_delete && <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteUser(user)}
                                                                className="h-7 w-7 rounded-lg p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 2: Invitations */}
                {activeTab === 'invitations' && (
                    <div className="overflow-hidden rounded-2xl border border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1A1A2C]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-[#ECECF0] bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-[#28283E] dark:bg-[#12121E]/60 dark:text-slate-400">
                                    <tr>
                                        <th className="px-4 py-3">Invited Email</th>
                                        <th className="px-4 py-3">Role</th>
                                        <th className="px-4 py-3">Resource Target</th>
                                        <th className="px-4 py-3">Invited By</th>
                                        <th className="px-4 py-3">Status / Expiry</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#ECECF0] dark:divide-[#28283E]">
                                    {invitations.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                                No invitations have been issued yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        invitations.map((inv) => {
                                            const isAccepted = !!inv.accepted_at;
                                            const isRevoked = !!inv.revoked_at;
                                            const isExpired = !isAccepted && !isRevoked && new Date(inv.expires_at) < new Date();
                                            const isPending = !isAccepted && !isRevoked && !isExpired;

                                            return (
                                                <tr
                                                    key={inv.id}
                                                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-[#202035]/60"
                                                >
                                                    <td className="px-4 py-3.5">
                                                        <div className="font-bold text-[#161624] dark:text-slate-100">
                                                            {inv.email}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400">
                                                            Issued {new Date(inv.created_at).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span
                                                            className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${getRoleBadgeVariant(
                                                                inv.role,
                                                            )}`}
                                                        >
                                                            {systemRoles[inv.role] || inv.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                                                        {inv.workspace?.name && <span>Workspace: {inv.workspace.name}</span>}
                                                        {inv.board?.title && <span> • Board: {inv.board.title}</span>}
                                                        {!inv.workspace && !inv.board && <span className="text-slate-400">Global</span>}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                                                        {inv.inviter?.name || 'Administrator'}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        {isAccepted && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                                <CheckCircle2 className="h-3 w-3" /> Accepted
                                                            </span>
                                                        )}
                                                        {isRevoked && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                                                                <XCircle className="h-3 w-3" /> Revoked
                                                            </span>
                                                        )}
                                                        {isExpired && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                                                                <Clock className="h-3 w-3" /> Expired
                                                            </span>
                                                        )}
                                                        {isPending && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                                                <Clock className="h-3 w-3" /> Pending (exp{' '}
                                                                {new Date(inv.expires_at).toLocaleDateString()})
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {isPending && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => copyInviteLink(inv.token)}
                                                                    className="h-7 gap-1 rounded-lg border-[#ECECF0] px-2 text-[11px] font-semibold dark:border-[#28283E]"
                                                                >
                                                                    <Copy className="h-3 w-3" />
                                                                    {copiedToken === inv.token ? 'Copied' : 'Link'}
                                                                </Button>
                                                            )}

                                                            {!isAccepted && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleResendInvitation(inv.id)}
                                                                    className="h-7 gap-1 rounded-lg border-[#ECECF0] px-2 text-[11px] font-semibold dark:border-[#28283E]"
                                                                >
                                                                    <RefreshCw className="h-3 w-3" />
                                                                    Resend
                                                                </Button>
                                                            )}

                                                            {isPending && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleRevokeInvitation(inv.id)}
                                                                    className="h-7 w-7 rounded-lg p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                                                                >
                                                                    <XCircle className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Direct Create User Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-md rounded-2xl p-6 dark:bg-[#1A1A2C]">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-[#161624] dark:text-white">
                            Direct Add New User
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                            Create a user with explicit credentials and role assignments.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-3.5 pt-2">
                        <div>
                            <Label className="text-xs font-semibold">Full Name</Label>
                            <Input
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                className="mt-1 h-9 rounded-xl text-xs"
                                placeholder="Alice Smith"
                                required
                            />
                            <InputError message={createForm.errors.name} />
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">Email Address</Label>
                            <Input
                                type="email"
                                value={createForm.data.email}
                                onChange={(e) => createForm.setData('email', e.target.value)}
                                className="mt-1 h-9 rounded-xl text-xs"
                                placeholder="alice@angora.internal"
                                required
                            />
                            <InputError message={createForm.errors.email} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold">System Role</Label>
                                <select
                                    value={createForm.data.role}
                                    onChange={(e) => createForm.setData('role', e.target.value)}
                                    className="mt-1 h-9 w-full rounded-xl border border-input bg-card text-foreground dark:bg-[#1E1E30] dark:text-white px-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                                >
                                    {Object.entries(assignableRoles).map(([val, label]) => (
                                        <option key={val} value={val} className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">
                                            {label}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={createForm.errors.role} />
                            </div>

                            <div>
                                <Label className="text-xs font-semibold">Department</Label>
                                <Input
                                    value={createForm.data.department}
                                    onChange={(e) => createForm.setData('department', e.target.value)}
                                    className="mt-1 h-9 rounded-xl text-xs"
                                    placeholder="Design, Tech, Ops"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">Temporary Password</Label>
                            <Input
                                type="password"
                                value={createForm.data.password}
                                onChange={(e) => createForm.setData('password', e.target.value)}
                                className="mt-1 h-9 rounded-xl text-xs"
                                placeholder="Minimum 8 characters"
                                required
                            />
                            <InputError message={createForm.errors.password} />
                        </div>

                        <DialogFooter className="pt-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}
                                className="h-9 rounded-xl text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createForm.processing}
                                className="h-9 rounded-xl bg-[#161624] text-xs font-bold text-white hover:bg-black dark:bg-[#D8F779] dark:text-[#161624]"
                            >
                                {createForm.processing ? 'Creating...' : 'Create Member'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Email Invitation Dialog */}
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogContent className="max-w-md rounded-2xl p-6 dark:bg-[#1A1A2C]">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-[#161624] dark:text-white">
                            Invite User by Email
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                            Send a secure single-use token expiring in 7 days.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleInviteSubmit} className="space-y-3.5 pt-2">
                        <div>
                            <Label className="text-xs font-semibold">Invitee Email</Label>
                            <Input
                                type="email"
                                value={inviteForm.data.email}
                                onChange={(e) => inviteForm.setData('email', e.target.value)}
                                className="mt-1 h-9 rounded-xl text-xs"
                                placeholder="colleague@agency.com"
                                required
                            />
                            <InputError message={inviteForm.errors.email} />
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">Assigned Role</Label>
                            <select
                                value={inviteForm.data.role}
                                onChange={(e) => inviteForm.setData('role', e.target.value)}
                                className="mt-1 h-9 w-full rounded-xl border border-input bg-card text-foreground dark:bg-[#1E1E30] dark:text-white px-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                            >
                                {Object.entries(assignableRoles).map(([val, label]) => (
                                    <option key={val} value={val} className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">
                                        {label}
                                    </option>
                                ))}
                            </select>
                            <InputError message={inviteForm.errors.role} />
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">Target Workspace (Optional)</Label>
                            <select
                                value={inviteForm.data.workspace_id}
                                onChange={(e) => inviteForm.setData('workspace_id', e.target.value)}
                                className="mt-1 h-9 w-full rounded-xl border border-input bg-card text-foreground dark:bg-[#1E1E30] dark:text-white px-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                            >
                                <option value="" className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">None (Global / Unassigned)</option>
                                {workspaces.map((ws) => (
                                    <option key={ws.id} value={ws.id} className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">
                                        {ws.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">Target Board (Optional)</Label>
                            <select
                                value={inviteForm.data.board_id}
                                onChange={(e) => inviteForm.setData('board_id', e.target.value)}
                                className="mt-1 h-9 w-full rounded-xl border border-input bg-card text-foreground dark:bg-[#1E1E30] dark:text-white px-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                            >
                                <option value="" className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">None</option>
                                {boards.map((b) => (
                                    <option key={b.id} value={b.id} className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">
                                        {b.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <DialogFooter className="pt-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsInviteOpen(false)}
                                className="h-9 rounded-xl text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={inviteForm.processing}
                                className="h-9 rounded-xl bg-[#161624] text-xs font-bold text-white hover:bg-black dark:bg-[#D8F779] dark:text-[#161624]"
                            >
                                {inviteForm.processing ? 'Generating...' : 'Send Invitation'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            {editingUser && (
                <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                    <DialogContent className="max-w-md rounded-2xl p-6 dark:bg-[#1A1A2C]">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold text-[#161624] dark:text-white">
                                Edit User Profile & Role
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                                Updating access for {editingUser.email}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleEditSubmit} className="space-y-3.5 pt-2">
                            <div>
                                <Label className="text-xs font-semibold">Full Name</Label>
                                <Input
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    className="mt-1 h-9 rounded-xl text-xs"
                                    required
                                />
                                <InputError message={editForm.errors.name} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold">Role</Label>
                                    <select
                                        value={editForm.data.role}
                                        onChange={(e) => editForm.setData('role', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-xl border border-input bg-card text-foreground dark:bg-[#1E1E30] dark:text-white px-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                                    >
                                        {!assignableRoles[editForm.data.role] && <option value={editForm.data.role}>{systemRoles[editForm.data.role] || editForm.data.role}</option>}
                                        {Object.entries(assignableRoles).map(([val, label]) => (
                                            <option key={val} value={val} className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={editForm.errors.role} />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Account Status</Label>
                                    <select
                                        value={editForm.data.status}
                                        onChange={(e) => editForm.setData('status', e.target.value as any)}
                                        className="mt-1 h-9 w-full rounded-xl border border-input bg-card text-foreground dark:bg-[#1E1E30] dark:text-white px-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                                    >
                                        <option value="active" className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">Active</option>
                                        <option value="suspended" className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">Suspended</option>
                                        <option value="inactive" className="bg-white text-slate-900 dark:bg-[#1E1E30] dark:text-white">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs font-semibold">Department</Label>
                                <Input
                                    value={editForm.data.department}
                                    onChange={(e) => editForm.setData('department', e.target.value)}
                                    className="mt-1 h-9 rounded-xl text-xs"
                                />
                            </div>

                            <DialogFooter className="pt-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingUser(null)}
                                    className="h-9 rounded-xl text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="h-9 rounded-xl bg-[#161624] text-xs font-bold text-white hover:bg-black dark:bg-[#D8F779] dark:text-[#161624]"
                                >
                                    {editForm.processing ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </AppLayout>
    );
}
