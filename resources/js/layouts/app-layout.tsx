import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';

interface AppLayoutProps {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    header?: React.ReactNode;
    hideHeader?: boolean;
}

export default ({ children, breadcrumbs, header, hideHeader, ...props }: AppLayoutProps) => (
    <AppLayoutTemplate breadcrumbs={breadcrumbs} header={header} hideHeader={hideHeader} {...props}>
        {children}
    </AppLayoutTemplate>
);
