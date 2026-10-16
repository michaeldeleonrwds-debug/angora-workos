import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { NotificationOnboardingPrompt } from '@/components/NotificationOnboardingPrompt';
import { useNotificationTitle } from '@/hooks/use-notification-title';
import { type BreadcrumbItem } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
    header,
    hideHeader = false,
}: {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    header?: React.ReactNode;
    hideHeader?: boolean;
}) {
    useNotificationTitle();

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                {!hideHeader && (header ?? <AppSidebarHeader breadcrumbs={breadcrumbs} />)}
                {children}
            </AppContent>
            <NotificationOnboardingPrompt />
        </AppShell>
    );
}
