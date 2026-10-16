import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    Bell,
    Briefcase,
    Cpu,
    Database,
    FileText,
    FolderArchive,
    HeartPulse,
    Image as ImageIcon,
    LayoutDashboard,
    Lock,
    Mail,
    Palette,
    Puzzle,
    Radio,
    Shield,
    Sparkles,
    User,
} from 'lucide-react';
import React from 'react';

interface SettingsLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
    headerActions?: React.ReactNode;
}

export default function SettingsLayout({
    children,
    title,
    description,
    headerActions,
}: SettingsLayoutProps) {
    const page = usePage<SharedData>();
    const currentPath = page.url.split('?')[0];
    const user = page.props.auth?.user;
    const isClient = user?.role === 'client' || (user as any)?.is_client === true || (user as any)?.primary_role === 'external_user';
    const canManageSystem = page.props.auth?.capabilities?.canManageSystemSettings === true;
    const canManageWorkspace = page.props.auth?.capabilities?.canManageWorkspace === true;
    const canAccessDataSecurity = page.props.auth?.capabilities?.canAccessDataSecurity === true;

    const navSections = [
        ...(!isClient && (canManageWorkspace || canManageSystem)
            ? [
                  {
                      heading: 'Overview',
                      items: [
                          {
                              title: 'Settings Overview',
                              url: '/settings',
                              icon: LayoutDashboard,
                              isActive: currentPath === '/settings',
                          },
                      ],
                  },
              ]
            : []),
        {
            heading: 'Personal',
            items: [
                {
                    title: 'Profile',
                    url: '/settings/profile',
                    icon: User,
                    isActive: currentPath === '/settings/profile',
                },
                {
                    title: 'Password & Security',
                    url: '/settings/password',
                    icon: Lock,
                    isActive: currentPath === '/settings/password',
                },
                {
                    title: 'Appearance',
                    url: '/settings/appearance',
                    icon: Palette,
                    isActive: currentPath === '/settings/appearance',
                },
                {
                    title: 'Notifications',
                    url: '/settings/notifications',
                    icon: Bell,
                    isActive: currentPath === '/settings/notifications',
                },
            ],
        },
        ...(canManageWorkspace
            ? [
                  {
                      heading: 'Workspace',
                      items: [
                          {
                              title: 'General Settings',
                              url: '/settings/workspace',
                              icon: Briefcase,
                              isActive: currentPath === '/settings/workspace',
                          },
                          {
                              title: 'Branding',
                              url: '/settings/branding',
                              icon: Sparkles,
                              isActive: currentPath === '/settings/branding',
                          },
                      ],
                  },
              ]
            : []),
        ...(canManageSystem
            ? [
                  {
                      heading: 'System',
                      items: [
                          {
                              title: 'Email / SMTP',
                              url: '/settings/system/smtp',
                              icon: Mail,
                              isActive: currentPath === '/settings/system/smtp',
                          },
                          {
                              title: 'Storage / S3',
                              url: '/settings/system/storage',
                              icon: Database,
                              isActive: currentPath === '/settings/system/storage',
                          },
                          {
                              title: 'WebSockets / Reverb',
                              url: '/settings/system/reverb',
                              icon: Radio,
                              isActive: currentPath === '/settings/system/reverb',
                          },
                          {
                              title: 'Image Optimization',
                              url: '/settings/system/optimization',
                              icon: ImageIcon,
                              isActive: currentPath === '/settings/system/optimization',
                          },
                          {
                              title: 'Background Jobs & Queues',
                              url: '/settings/system/queues',
                              icon: Cpu,
                              isActive: currentPath === '/settings/system/queues',
                          },
                          {
                              title: 'System Health',
                              url: '/settings/system/health',
                              icon: HeartPulse,
                              isActive: currentPath === '/settings/system/health',
                          },
                      ],
                  },
              ]
            : []),
        ...(canAccessDataSecurity
            ? [
                  {
                      heading: 'Data & Security',
                      items: [
                          {
                              title: 'File Manager',
                              url: '/settings/data/files',
                              icon: FolderArchive,
                              isActive: currentPath.startsWith('/media') || currentPath === '/settings/data/files',
                          },
                          {
                              title: 'Audit Logs',
                              url: '/settings/data/audit-logs',
                              icon: FileText,
                              isActive: currentPath.startsWith('/audit-logs') || currentPath === '/settings/data/audit-logs',
                          },
                          {
                              title: 'Security Policies',
                              url: '/settings/data/security',
                              icon: Shield,
                              isActive: currentPath === '/settings/data/security',
                          },
                          {
                              title: 'Integrations Hub',
                              url: '/settings/data/integrations',
                              icon: Puzzle,
                              isActive: currentPath.startsWith('/integrations') || currentPath === '/settings/data/integrations',
                          },
                      ],
                  },
              ]
            : []),
    ];

    return (
        <div className="flex min-h-full flex-col bg-[#F8F9F7] transition-colors dark:bg-[#161624]">
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Top Header */}
                <div className="mb-8 flex flex-col gap-2 border-b border-[#ECECF0] pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-[#28283E]">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[#191927] sm:text-3xl dark:text-white">
                            {title || 'Settings Center'}
                        </h1>
                        <p className="mt-1 text-sm text-[#777785] dark:text-slate-400">
                            {description || 'Manage your personal preferences, workspace configuration, and system parameters'}
                        </p>
                    </div>
                    {headerActions && <div className="flex items-center gap-3">{headerActions}</div>}
                </div>

                {/* Two-Column Responsive Shell */}
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                    {/* Left Category Navigation */}
                    <aside className="w-full shrink-0 lg:w-64">
                        <nav className="flex flex-col gap-6 rounded-2xl border border-[#ECECF0] bg-white p-3 shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                            {navSections.map((section) => (
                                <div key={section.heading} className="space-y-1">
                                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                        {section.heading}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        {section.items.map((item) => (
                                            <Link
                                                key={item.url}
                                                href={item.url}
                                                prefetch
                                                className={cn(
                                                    'group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150',
                                                    item.isActive
                                                        ? 'bg-[#0073ea] font-semibold text-white shadow-xs'
                                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white',
                                                )}
                                            >
                                                <item.icon
                                                    className={cn(
                                                        'h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-105',
                                                        item.isActive
                                                            ? 'text-white'
                                                            : 'text-slate-400 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white',
                                                    )}
                                                />
                                                <span className="truncate">{item.title}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </aside>

                    {/* Right Settings Content */}
                    <main className="min-w-0 flex-1">
                        <div className="rounded-2xl border border-[#ECECF0] bg-white p-6 shadow-xs sm:p-8 dark:border-[#28283E] dark:bg-[#1E1E2F]">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
