import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        url: '/settings/profile',
        icon: null,
    },
    {
        title: 'Password',
        url: '/settings/password',
        icon: null,
    },
    {
        title: 'Appearance',
        url: '/settings/appearance',
        icon: null,
    },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const currentPath = window.location.pathname;

    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-6 text-[#191927] transition-colors dark:text-white">
            <Heading title="Settings" description="Manage your profile and account settings" />

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {sidebarNavItems.map((item) => (
                            <Button
                                key={item.url}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn(
                                    'w-full justify-start rounded-xl font-medium text-[#777785] hover:bg-slate-100 hover:text-[#191927] dark:text-slate-400 dark:hover:bg-[#1E1E2F] dark:hover:text-white',
                                    {
                                        'bg-[#D8F779] font-semibold text-[#191927] hover:bg-[#cbf066] hover:text-[#191927] dark:bg-[#D8F779] dark:text-[#191927]':
                                            currentPath === item.url,
                                    },
                                )}
                            >
                                <Link href={item.url} prefetch>
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 border-[#ECECF0] md:hidden dark:border-[#28283E]" />

                <div className="flex-1 rounded-2xl border border-[#ECECF0] bg-white p-6 shadow-xs md:max-w-2xl dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <section className="max-w-xl space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
