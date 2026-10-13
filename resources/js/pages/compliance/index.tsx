import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertOctagon, Plus } from 'lucide-react';
import React, { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Compliance & Risk', href: '/compliance' },
];

interface ComplianceProps {
    policies: any[];
    risks: any[];
    incidents: any[];
    users: any[];
}

export default function CompliancePage({ policies = [], risks = [], incidents = [], users = [] }: ComplianceProps) {
    const [isRiskOpen, setIsRiskOpen] = useState(false);
    const [isIncidentOpen, setIsIncidentOpen] = useState(false);

    const [newRisk, setNewRisk] = useState({
        title: '',
        category: 'Operational',
        likelihood: 3,
        impact: 4,
        mitigation_strategy: '',
        owner_id: users[0]?.id || '',
    });

    const [newIncident, setNewIncident] = useState({
        type: 'Policy Violation',
        severity: 'Moderate',
        incident_date: new Date().toISOString().split('T')[0],
        summary: '',
        resolution_action: '',
    });

    const handleCreateRisk = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/compliance/risks', newRisk, {
            onSuccess: () => setIsRiskOpen(false),
        });
    };

    const handleCreateIncident = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/compliance/incidents', newIncident, {
            onSuccess: () => setIsIncidentOpen(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Compliance & Risk Management" />

            <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 p-4 text-[#191927] transition-colors md:p-6 lg:p-8 dark:text-white">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-[#191927] dark:text-white">Compliance & Risk Management</h1>
                            <Badge variant="outline" className="border-[#ECECF0] text-xs text-[#777785] dark:border-[#28283E] dark:text-slate-400">
                                Module 08
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#777785] md:text-sm dark:text-slate-400">
                            Enterprise risk matrix, regulatory audits (ISO 27001), corporate policies, and incident tracking.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Dialog open={isIncidentOpen} onOpenChange={setIsIncidentOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="gap-2 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                >
                                    <AlertOctagon className="h-4 w-4" />
                                    Report Incident
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>File Compliance Incident Report</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateIncident} className="space-y-4 pt-2">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Incident Type</Label>
                                            <Select value={newIncident.type} onValueChange={(val) => setNewIncident({ ...newIncident, type: val })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Data Breach">Data Breach / Security Event</SelectItem>
                                                    <SelectItem value="Safety Hazard">Workplace Safety Hazard</SelectItem>
                                                    <SelectItem value="Policy Violation">Policy Violation</SelectItem>
                                                    <SelectItem value="Fraud Alert">Financial Anomaly / Fraud</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Severity</Label>
                                            <Select
                                                value={newIncident.severity}
                                                onValueChange={(val) => setNewIncident({ ...newIncident, severity: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Low">Low</SelectItem>
                                                    <SelectItem value="Moderate">Moderate</SelectItem>
                                                    <SelectItem value="High">High</SelectItem>
                                                    <SelectItem value="Critical">Critical</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Incident Summary</Label>
                                        <Input
                                            required
                                            value={newIncident.summary}
                                            onChange={(e) => setNewIncident({ ...newIncident, summary: e.target.value })}
                                            placeholder="Details of the event..."
                                        />
                                    </div>
                                    <div>
                                        <Label>Corrective Action</Label>
                                        <Input
                                            value={newIncident.resolution_action}
                                            onChange={(e) => setNewIncident({ ...newIncident, resolution_action: e.target.value })}
                                            placeholder="Remediation steps undertaken..."
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setIsIncidentOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="bg-rose-600 text-white hover:bg-rose-700">
                                            File Report
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isRiskOpen} onOpenChange={setIsRiskOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 bg-red-600 text-white shadow-sm hover:bg-red-700">
                                    <Plus className="h-4 w-4" />
                                    Assess Risk
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Register Enterprise Risk Assessment</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateRisk} className="space-y-4 pt-2">
                                    <div>
                                        <Label>Risk Assessment Title</Label>
                                        <Input
                                            required
                                            value={newRisk.title}
                                            onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                                            placeholder="e.g. Subcontractor PCB Lead-time Variance"
                                        />
                                    </div>
                                    <div>
                                        <Label>Category</Label>
                                        <Select value={newRisk.category} onValueChange={(val) => setNewRisk({ ...newRisk, category: val })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Operational">Operational</SelectItem>
                                                <SelectItem value="Cyber Security">Cyber Security</SelectItem>
                                                <SelectItem value="Financial">Financial</SelectItem>
                                                <SelectItem value="Regulatory">Regulatory & Legal</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Likelihood (1 to 5)</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                max="5"
                                                value={newRisk.likelihood}
                                                onChange={(e) => setNewRisk({ ...newRisk, likelihood: parseInt(e.target.value) || 1 })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Impact (1 to 5)</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                max="5"
                                                value={newRisk.impact}
                                                onChange={(e) => setNewRisk({ ...newRisk, impact: parseInt(e.target.value) || 1 })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Mitigation Strategy</Label>
                                        <Input
                                            required
                                            value={newRisk.mitigation_strategy}
                                            onChange={(e) => setNewRisk({ ...newRisk, mitigation_strategy: e.target.value })}
                                            placeholder="Control measures..."
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setIsRiskOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="bg-red-600 text-white hover:bg-red-700">
                                            Save Assessment
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Risk Assessment Matrix Cards */}
                <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Enterprise Risk Assessment Matrix</CardTitle>
                        <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                            Prioritized by Likelihood x Impact (Max Score: 25)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {risks.map((r) => {
                                const isCritical = r.risk_score >= 15;
                                const isHigh = r.risk_score >= 10;
                                return (
                                    <div
                                        key={r.id}
                                        className="space-y-3 rounded-2xl border border-[#ECECF0] bg-white p-4 shadow-xs dark:border-[#28283E] dark:bg-[#181826]"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <Badge
                                                variant="secondary"
                                                className="bg-[#ECECF0] text-[10px] text-[#191927] dark:bg-[#28283E] dark:text-slate-300"
                                            >
                                                {r.category}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className={`text-xs font-bold ${
                                                    isCritical
                                                        ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                                                        : isHigh
                                                          ? 'border-amber-500 bg-amber-500/10 text-amber-600'
                                                          : 'border-blue-500 bg-blue-500/10 text-blue-600'
                                                }`}
                                            >
                                                Score: {r.risk_score}
                                            </Badge>
                                        </div>
                                        <h3 className="text-sm font-bold text-[#191927] dark:text-white">{r.title}</h3>
                                        <div className="flex justify-between text-xs text-[#777785] dark:text-slate-400">
                                            <span>Likelihood: {r.likelihood}/5</span>
                                            <span>Impact: {r.impact}/5</span>
                                        </div>
                                        <div className="rounded-xl border border-[#ECECF0] bg-slate-50 p-2.5 text-[11px] leading-relaxed text-[#777785] dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-slate-300">
                                            <span className="font-semibold text-[#191927] dark:text-white">Mitigation: </span>
                                            {r.mitigation_strategy}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Split: Active Policies Repository & Filed Incidents */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Policies */}
                    <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Corporate Policies & ISO Standards</CardTitle>
                            <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                                Active regulatory governance frameworks
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y divide-[#ECECF0] overflow-hidden rounded-xl border border-[#ECECF0] dark:divide-[#28283E] dark:border-[#28283E]">
                                {policies.map((p) => (
                                    <div
                                        key={p.id}
                                        className="space-y-1 p-3.5 text-xs transition-colors hover:bg-slate-50/80 dark:hover:bg-[#181826]/70"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{p.policy_code}</span>
                                            <Badge variant="outline" className="border-emerald-500 bg-emerald-500/10 text-emerald-600">
                                                {p.status} (v{p.version})
                                            </Badge>
                                        </div>
                                        <div className="font-semibold text-[#191927] dark:text-white">{p.title}</div>
                                        <p className="text-[11px] text-[#777785] dark:text-slate-400">{p.description}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Incidents */}
                    <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Filed Compliance Incidents</CardTitle>
                            <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                                Log of reported safety, data, and ethics events
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y divide-[#ECECF0] overflow-hidden rounded-xl border border-[#ECECF0] dark:divide-[#28283E] dark:border-[#28283E]">
                                {incidents.map((inc) => (
                                    <div
                                        key={inc.id}
                                        className="space-y-1.5 p-3.5 text-xs transition-colors hover:bg-slate-50/80 dark:hover:bg-[#181826]/70"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{inc.incident_code}</span>
                                            <Badge variant="outline" className="border-rose-400 bg-rose-500/10 text-rose-600">
                                                {inc.severity}
                                            </Badge>
                                        </div>
                                        <div className="font-semibold text-[#191927] dark:text-white">
                                            {inc.type} • {formatDate(inc.incident_date)}
                                        </div>
                                        <p className="text-[11px] text-[#777785] dark:text-slate-400">{inc.summary}</p>
                                        {inc.resolution_action && (
                                            <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                                Resolved: {inc.resolution_action}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
