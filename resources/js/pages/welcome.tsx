import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    CheckSquare,
    DollarSign,
    Factory,
    FolderArchive,
    LogIn,
    Megaphone,
    ShieldCheck,
    TrendingUp,
    Users,
    Workflow,
} from 'lucide-react';

const rolePersonas = [
    { email: 'super_admin@angora.internal', role: 'Super Admin', dept: 'Executive', desc: 'Unrestricted full access to all systems and logs' },
    {
        email: 'admin.manager@angora.internal',
        role: 'Admin / Manager',
        dept: 'Operations',
        desc: 'Cross-department operations, team oversight and approvals',
    },
    { email: 'dept.user@angora.internal', role: 'Dept User', dept: 'Engineering', desc: 'Engineering sprint tasks, code reviews, and IT workflows' },
    { email: 'hr.staff@angora.internal', role: 'HR Staff', dept: 'Human Resources', desc: 'Employee records, attendance, and leave approvals' },
    {
        email: 'production.staff@angora.internal',
        role: 'Production Staff',
        dept: 'Production & QC',
        desc: 'Work orders, shop floor progress, and QA inspections',
    },
    { email: 'sales.staff@angora.internal', role: 'Sales Staff', dept: 'Sales', desc: 'CRM pipeline, client accounts, quotations, and targets' },
    {
        email: 'marketing.staff@angora.internal',
        role: 'Marketing Staff',
        dept: 'Marketing',
        desc: 'Campaign tracking, editorial schedule, and ROI metrics',
    },
    { email: 'finance.staff@angora.internal', role: 'Finance Staff', dept: 'Finance', desc: 'Budgets, expense claims approval, AP & AR ledgers' },
    { email: 'team.member@angora.internal', role: 'Team Member', dept: 'General Staff', desc: 'Personal task tracking and board collaboration' },
    {
        email: 'external.user@angora.internal',
        role: 'External User',
        dept: 'Partner / Client',
        desc: 'Client portal view for quotations and service tickets',
    },
];

export default function Welcome() {
    const { auth, availablePersonas = [] } = usePage<SharedData>().props as any;

    const handleQuickLogin = (email: string) => {
        router.post('/login', {
            email,
            password: 'password123',
            remember: true,
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
            <Head title="Angora Enterprise — Multi-Tools Integrated Platform" />

            {/* Top Navbar */}
            <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-black text-white shadow-md shadow-blue-500/20">
                            AG
                        </div>
                        <div>
                            <span className="text-base font-extrabold tracking-tight text-white">ANGORA</span>
                            <span className="ml-2 text-xs font-medium text-slate-400">Enterprise Platform</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {auth?.user ? (
                            <Button asChild className="bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700">
                                <Link href="/dashboard">Go to Dashboard &rarr;</Link>
                            </Button>
                        ) : (
                            <>
                                <Button asChild variant="ghost" className="text-slate-300 hover:text-white">
                                    <Link href="/login">Log in</Link>
                                </Button>
                                <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                                    <Link href="/register">Sign Up</Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20">
                <div className="mx-auto max-w-3xl space-y-4 text-center">
                    <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 px-3 py-1 font-mono text-xs text-blue-400">
                        ARCHITECTURE OVERVIEW • 10 INTEGRATED DEPARTMENTS
                    </Badge>
                    <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">Multi-Tools Integrated Enterprise Platform</h1>
                    <p className="text-base leading-relaxed text-slate-300 sm:text-lg">
                        A scalable, secure, and maintainable enterprise platform connecting Kanban, HR, Production, Sales CRM, Marketing, Finance,
                        Operations, Compliance, and Documents into one unified operational nervous system.
                    </p>
                </div>

                {/* 1-Click Persona Quick Access */}
                <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm sm:p-8">
                    <div className="mb-6 flex flex-col justify-between gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                                <LogIn className="h-5 w-5 text-blue-400" />
                                Instant Persona Switcher & Test Login (10 Roles)
                            </h2>
                            <p className="text-xs text-slate-400">
                                Click any persona below to authenticate instantly with its designated role and departmental permissions.
                            </p>
                        </div>
                        <Badge variant="secondary" className="self-start font-mono text-xs sm:self-auto">
                            Password: password123
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {rolePersonas.map((p) => (
                            <button
                                key={p.email}
                                onClick={() => handleQuickLogin(p.email)}
                                className="group flex flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-left shadow-sm transition-all hover:border-blue-500/50 hover:bg-slate-800/80"
                            >
                                <div className="mb-1 flex w-full items-center justify-between">
                                    <span className="text-xs font-bold text-white transition-colors group-hover:text-blue-400">{p.role}</span>
                                    <ArrowRight className="h-3 w-3 text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:text-blue-400" />
                                </div>
                                <span className="mb-1 text-[10px] font-medium text-blue-400/90">{p.dept}</span>
                                <span className="line-clamp-2 text-[11px] leading-snug text-slate-400">{p.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* The 10 Modules Showcase */}
                <div className="mt-16">
                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-bold text-white">Full Departmental Module Architecture</h2>
                        <p className="mt-1 text-xs text-slate-400">
                            Cross-cutting RBAC security, audit logging, and MariaDB + Redis data persistence
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                                <CheckSquare className="h-4 w-4" /> 01. Kanban
                            </div>
                            <h3 className="text-sm font-semibold text-white">Task Management</h3>
                            <p className="text-xs text-slate-400">Board stages, priority badges, personal tasks, and sprint timelines.</p>
                        </div>

                        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-pink-400">
                                <Users className="h-4 w-4" /> 02. HR Management
                            </div>
                            <h3 className="text-sm font-semibold text-white">People Operations</h3>
                            <p className="text-xs text-slate-400">Employee directory, attendance logs, leave approvals, and appraisals.</p>
                        </div>

                        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                                <Factory className="h-4 w-4" /> 03. Production
                            </div>
                            <h3 className="text-sm font-semibold text-white">Manufacturing & QC</h3>
                            <p className="text-xs text-slate-400">Work orders, batch progress, defect tolerances, and line deviations.</p>
                        </div>

                        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                                <TrendingUp className="h-4 w-4" /> 04. Sales & CRM
                            </div>
                            <h3 className="text-sm font-semibold text-white">Deals & Invoicing</h3>
                            <p className="text-xs text-slate-400">Opportunity pipeline stages, client accounts, quotes, and quotas.</p>
                        </div>

                        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
                                <Megaphone className="h-4 w-4" /> 05. Marketing
                            </div>
                            <h3 className="text-sm font-semibold text-white">Campaigns & Content</h3>
                            <p className="text-xs text-slate-400">Multi-channel campaigns, editorial calendar, and lead ROI tracking.</p>
                        </div>

                        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                                <DollarSign className="h-4 w-4" /> 06. Finance
                            </div>
                            <h3 className="text-sm font-semibold text-white">Budgets & AP/AR</h3>
                            <p className="text-xs text-slate-400">Fiscal caps, expense claim approvals, and liquidity ledgers.</p>
                        </div>

                        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                                <Workflow className="h-4 w-4" /> 07. Operations
                            </div>
                            <h3 className="text-sm font-semibold text-white">Workflows & Tickets</h3>
                            <p className="text-xs text-slate-400">Cross-department workflows, SLA tracking, and facility maintenance.</p>
                        </div>

                        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                                <ShieldCheck className="h-4 w-4" /> 08. Compliance
                            </div>
                            <h3 className="text-sm font-semibold text-white">Risk Matrix & ISO</h3>
                            <p className="text-xs text-slate-400">Risk assessments, policies repository, and incident remediations.</p>
                        </div>

                        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-violet-400">
                                <FolderArchive className="h-4 w-4" /> 09. Documents
                            </div>
                            <h3 className="text-sm font-semibold text-white">Enterprise Vault</h3>
                            <p className="text-xs text-slate-400">Categorized repository, version revisions, and recycle bin.</p>
                        </div>

                        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
                                <BarChart3 className="h-4 w-4" /> 10. Analytics
                            </div>
                            <h3 className="text-sm font-semibold text-white">BI & Audit Trail</h3>
                            <p className="text-xs text-slate-400">Executive KPI telemetry, CSV exports, and immutable audit logs.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
