import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Check, Key, Save, Users, X } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Workspaces', href: '/dashboard' },
    { title: 'RBAC & Permission Matrix', href: '/rbac' },
];

interface RbacProps {
    roles: Record<string, string>;
    roleControls: Record<string, { canEdit: boolean; canAssign: boolean }>;
    canCreateRole: boolean;
    permissionsGrouped: Record<string, { id: number; name: string; label: string; description?: string; canDelegate: boolean }[]>;
    allPermissions: { id: number; name: string; canDelegate: boolean }[];
    matrix: Record<string, string[]>;
    users: { id: number; name: string; email: string; department: string; status: string; role: string; canAssignRole: boolean }[];
}

export default function RbacPage({ roles, roleControls = {}, canCreateRole = false, permissionsGrouped = {}, allPermissions = [], matrix = {}, users = [] }: RbacProps) {
    const [selectedRole, setSelectedRole] = useState<string>(Object.keys(roles)[0] || '');
    const [newRole, setNewRole] = useState('');
    const [activeTab, setActiveTab] = useState<'matrix' | 'accounts'>('matrix');

    // Local state for role permissions being edited
    const [rolePerms, setRolePerms] = useState<Record<string, string[]>>(matrix);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

    const togglePermission = (roleKey: string, permName: string) => {
        if (!roleControls[roleKey]?.canEdit || !allPermissions.find((permission) => permission.name === permName)?.canDelegate) return;

        const current = rolePerms[roleKey] || [];
        const updated = current.includes(permName) ? current.filter((p) => p !== permName) : [...current, permName];

        setRolePerms({
            ...rolePerms,
            [roleKey]: updated,
        });
        setHasUnsavedChanges(true);
    };

    const handleSaveRole = (roleKey: string) => {
        const permNames = rolePerms[roleKey] || [];
        const permIds = allPermissions.filter((p) => permNames.includes(p.name)).map((p) => p.id);

        router.post(
            `/rbac/roles/${roleKey}/permissions`,
            {
                permission_ids: permIds,
            },
            {
                onSuccess: () => setHasUnsavedChanges(false),
                preserveScroll: true,
            },
        );
    };

    const handleUserRoleChange = (userId: number, newRole: string) => {
        router.post(
            `/rbac/users/${userId}/role`,
            {
                role: newRole,
            },
            {
                preserveScroll: true,
            },
        );
    };

    const handleCreateRole = () => {
        router.post('/rbac/roles', { name: newRole.trim() }, { onSuccess: () => setNewRole(''), preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="RBAC & Access Control Matrix" />

            <div className="flex min-h-screen flex-col bg-[#F8F9F7] text-[#191927] transition-colors dark:bg-[#161624] dark:text-white">
                {/* Header */}
                <div className="border-b border-[#ECECF0] bg-white px-6 py-4 dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-[#0073ea]" />
                                <h1 className="text-2xl font-black tracking-tight text-[#191927] dark:text-white">
                                    Role-Based Access Control (RBAC)
                                </h1>
                                <Badge
                                    variant="secondary"
                                    className="bg-[#ECECF0] text-[11px] font-semibold text-[#191927] dark:bg-[#28283E] dark:text-slate-200"
                                >
                                    Enterprise Security
                                </Badge>
                            </div>
                            <p className="mt-1 text-xs text-[#777785] dark:text-slate-400">
                                Configure registered permissions, custom roles, and account access.
                            </p>
                        </div>

                        {/* View Tabs */}
                        <div className="flex items-center gap-2 rounded-xl border border-[#ECECF0] bg-slate-50 p-1 dark:border-[#28283E] dark:bg-[#181826]">
                            <Button
                                size="sm"
                                variant={activeTab === 'matrix' ? 'secondary' : 'ghost'}
                                onClick={() => setActiveTab('matrix')}
                                className="h-7 rounded-lg text-xs font-bold dark:text-white"
                            >
                                <Key className="mr-1.5 h-3.5 w-3.5 text-[#0073ea]" />
                                Permissions Matrix
                            </Button>
                            <Button
                                size="sm"
                                variant={activeTab === 'accounts' ? 'secondary' : 'ghost'}
                                onClick={() => setActiveTab('accounts')}
                                className="h-7 rounded-lg text-xs font-bold dark:text-white"
                            >
                                <Users className="mr-1.5 h-3.5 w-3.5 text-pink-500" />
                                Accounts & Roles ({users.length})
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-6 p-6">
                    {activeTab === 'matrix' ? (
                        <div className="space-y-6">
                            {canCreateRole && (
                                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#ECECF0] bg-white p-4 dark:border-[#28283E] dark:bg-[#1E1E2F]">
                                    <Input aria-label="New role name" value={newRole} onChange={(event) => setNewRole(event.target.value)} placeholder="new_role_name" className="w-56 dark:bg-[#181826]" />
                                    <Button onClick={handleCreateRole} disabled={!newRole.trim()} className="bg-[#0073ea] text-white">Create Role</Button>
                                </div>
                            )}
                            {/* Role Selector & Save Bar */}
                            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#ECECF0] bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-[#28283E] dark:bg-[#1E1E2F]">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-[#777785] uppercase dark:text-slate-400">Configure Role:</span>
                                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                                        <SelectTrigger className="h-8 w-56 rounded-xl border-[#ECECF0] bg-slate-50 text-xs font-semibold dark:border-[#28283E] dark:bg-[#181826] dark:text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-[#ECECF0] bg-white dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white">
                                            {Object.entries(roles).map(([key, label]) => (
                                                <SelectItem key={key} value={key} className="dark:focus:bg-[#28283E] dark:focus:text-white">
                                                {label} {key === 'super_admin' ? '(Protected)' : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <span className="text-xs text-[#777785] dark:text-slate-400">
                                        {(rolePerms[selectedRole] || []).length} / {allPermissions.length} Permissions Active
                                    </span>
                                </div>

                                {roleControls[selectedRole]?.canEdit && (
                                    <Button
                                        onClick={() => handleSaveRole(selectedRole)}
                                        className="h-8 gap-1.5 rounded-xl bg-[#0073ea] text-xs font-bold text-white hover:bg-[#0060b9]"
                                    >
                                        <Save className="h-3.5 w-3.5" />
                                        <span>Save Permissions Matrix</span>
                                    </Button>
                                )}
                            </div>

                            {/* Grouped Permissions Matrix */}
                            <div className="space-y-4">
                                {Object.entries(permissionsGrouped).map(([department, perms]) => (
                                    <div
                                        key={department}
                                        className="overflow-hidden rounded-2xl border border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]"
                                    >
                                        {/* Department Header */}
                                        <div className="flex items-center justify-between border-b border-[#ECECF0] bg-slate-50/70 px-4 py-2.5 dark:border-[#28283E] dark:bg-[#181826]">
                                            <div className="flex items-center gap-2">
                                                <span className="h-3.5 w-1 rounded-full bg-[#0073ea]" />
                                                <h2 className="text-xs font-extrabold tracking-wider text-[#191927] uppercase dark:text-white">
                                                    {department} Module Permissions
                                                </h2>
                                                <Badge variant="secondary" className="bg-[#ECECF0] text-[10px] dark:bg-[#28283E] dark:text-slate-300">
                                                    {perms.length} gates
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Permissions list for this department */}
                                        <div className="divide-y divide-[#ECECF0] dark:divide-[#28283E]">
                                            {perms.map((p) => {
                                                const isGranted = (rolePerms[selectedRole] || []).includes(p.name);
                                                const canEditPermission = !!roleControls[selectedRole]?.canEdit && p.canDelegate;

                                                return (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => canEditPermission && togglePermission(selectedRole, p.name)}
                                                        className={`flex items-center justify-between p-3 text-xs transition-colors ${
                                                            isGranted
                                                                ? 'bg-blue-50/40 dark:bg-blue-900/10'
                                                                : 'hover:bg-slate-50/80 dark:hover:bg-[#181826]/70'
                                                        }`}
                                                    >
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-[#191927] dark:text-white">{p.label}</span>
                                                                <code className="rounded bg-slate-100 px-1 text-[10px] text-[#777785] dark:bg-[#181826] dark:text-slate-400">
                                                                    {p.name}
                                                                </code>
                                                            </div>
                                                            <p className="text-[11px] text-[#777785] dark:text-slate-400">{p.description}</p>
                                                        </div>

                                                        <div>
                                                            {isGranted ? (
                                                                <div className="flex items-center gap-1.5 rounded-lg bg-[#00c875] px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
                                                                    <Check className="h-3 w-3" /> Granted
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-[#28283E] dark:text-slate-400">
                                                                    <X className="h-3 w-3" /> Denied
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* ACCOUNTS & ROLES DIRECTORY */
                        <div className="overflow-hidden rounded-2xl border border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                            <div className="border-b border-[#ECECF0] bg-white px-4 py-3 dark:border-[#28283E] dark:bg-[#1E1E2F]">
                                <h2 className="text-sm font-extrabold text-[#191927] dark:text-white">User Accounts & Assigned Roles</h2>
                                <p className="text-xs text-[#777785] dark:text-slate-400">
                                    Change account roles in real-time or review granted privileges
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-[#ECECF0] bg-slate-50/70 text-[11px] font-semibold text-[#777785] dark:border-[#28283E] dark:bg-[#181826] dark:text-slate-400">
                                            <th className="p-3">User & Email</th>
                                            <th className="p-3">Department</th>
                                            <th className="p-3">Assigned Role</th>
                                            <th className="p-3 text-center">Status</th>
                                            <th className="p-3 text-center">Effective Access</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ECECF0] dark:divide-[#28283E]">
                                        {users.map((u) => (
                                            <tr key={u.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-[#181826]/70">
                                                <td className="p-3">
                                                    <div className="font-bold text-[#191927] dark:text-white">{u.name}</div>
                                                    <div className="text-[11px] text-[#777785] dark:text-slate-400">{u.email}</div>
                                                </td>
                                                <td className="p-3 font-medium text-[#777785] dark:text-slate-300">{u.department}</td>
                                                <td className="p-3">
                                                    {u.canAssignRole ? <Select value={u.role} onValueChange={(val) => handleUserRoleChange(u.id, val)}>
                                                        <SelectTrigger className="h-7 w-48 rounded-lg border-[#ECECF0] bg-slate-50 text-xs font-semibold dark:border-[#28283E] dark:bg-[#181826] dark:text-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-[#ECECF0] bg-white dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white">
                                                            {Object.entries(roles).filter(([k]) => roleControls[k]?.canAssign).map(([k, label]) => (
                                                                <SelectItem
                                                                    key={k}
                                                                    value={k}
                                                                    className="dark:focus:bg-[#28283E] dark:focus:text-white"
                                                                >
                                                                    {label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select> : <span className="font-semibold">{roles[u.role] || u.role}</span>}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className="border-emerald-500 bg-emerald-50 text-[10px] text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                                                    >
                                                        {u.status}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="font-semibold text-[#0073ea] dark:text-blue-400">
                                                        {u.role === 'super_admin'
                                                            ? 'Unrestricted (Full)'
                                                            : `${(matrix[u.role] || []).length} Permissions`}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
