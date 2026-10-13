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
import { Eye, MousePointerClick, Plus, Sparkles, TrendingUp } from 'lucide-react';
import React, { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Marketing Management', href: '/marketing' },
];

interface MarketingProps {
    campaigns: any[];
    contents: any[];
    team: any[];
}

export default function MarketingPage({ campaigns = [], contents = [], team = [] }: MarketingProps) {
    const [isCampaignOpen, setIsCampaignOpen] = useState(false);
    const [isContentOpen, setIsContentOpen] = useState(false);

    const [newCampaign, setNewCampaign] = useState({
        name: '',
        channel: 'Social Media',
        budget: 25000,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        target_audience: 'Enterprise Decision Makers',
    });

    const [newContent, setNewContent] = useState({
        campaign_id: campaigns[0]?.id || '',
        title: '',
        format: 'Blog Post',
        platform: 'LinkedIn',
        scheduled_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        copy_notes: '',
    });

    const handleCreateCampaign = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/marketing/campaigns', newCampaign, {
            onSuccess: () => setIsCampaignOpen(false),
        });
    };

    const handleCreateContent = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/marketing/contents', newContent, {
            onSuccess: () => setIsContentOpen(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Marketing Management" />

            <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 p-4 text-[#191927] transition-colors md:p-6 lg:p-8 dark:text-white">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-[#191927] dark:text-white">Marketing Management</h1>
                            <Badge variant="outline" className="border-[#ECECF0] text-xs text-[#777785] dark:border-[#28283E] dark:text-slate-400">
                                Module 05
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-[#777785] md:text-sm dark:text-slate-400">
                            Multi-channel campaigns, lead acquisition, content scheduling, and ROI performance metrics.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Dialog open={isContentOpen} onOpenChange={setIsContentOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="gap-2 rounded-xl border-[#ECECF0] bg-white text-[#191927] dark:border-[#28283E] dark:bg-[#1E1E2F] dark:text-white"
                                >
                                    <Sparkles className="h-4 w-4 text-orange-500" />
                                    Schedule Content
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Content to Editorial Calendar</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateContent} className="space-y-4 pt-2">
                                    <div>
                                        <Label>Content Title</Label>
                                        <Input
                                            required
                                            value={newContent.title}
                                            onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                                            placeholder="e.g., Guide to IoT Edge Computing"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Format</Label>
                                            <Select value={newContent.format} onValueChange={(val) => setNewContent({ ...newContent, format: val })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Blog Post">Blog Post</SelectItem>
                                                    <SelectItem value="Video">Video</SelectItem>
                                                    <SelectItem value="Whitepaper">Whitepaper</SelectItem>
                                                    <SelectItem value="Case Study">Case Study</SelectItem>
                                                    <SelectItem value="Newsletter">Newsletter</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Platform</Label>
                                            <Select
                                                value={newContent.platform}
                                                onValueChange={(val) => setNewContent({ ...newContent, platform: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                                                    <SelectItem value="YouTube">YouTube</SelectItem>
                                                    <SelectItem value="Blog">Company Blog</SelectItem>
                                                    <SelectItem value="X">X (Twitter)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Scheduled Date</Label>
                                        <Input
                                            type="date"
                                            value={newContent.scheduled_date}
                                            onChange={(e) => setNewContent({ ...newContent, scheduled_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setIsContentOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="bg-orange-600 text-white hover:bg-orange-700">
                                            Save Content
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isCampaignOpen} onOpenChange={setIsCampaignOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 bg-orange-600 text-white shadow-sm hover:bg-orange-700">
                                    <Plus className="h-4 w-4" />
                                    New Campaign
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Launch Marketing Campaign</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateCampaign} className="space-y-4 pt-2">
                                    <div>
                                        <Label>Campaign Name</Label>
                                        <Input
                                            required
                                            value={newCampaign.name}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                            placeholder="e.g., Global Industrial IoT Sprint"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Channel</Label>
                                            <Select
                                                value={newCampaign.channel}
                                                onValueChange={(val) => setNewCampaign({ ...newCampaign, channel: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Social Media">Social Media</SelectItem>
                                                    <SelectItem value="Search Ads">Search Ads (PPC)</SelectItem>
                                                    <SelectItem value="Events">Events & Conferences</SelectItem>
                                                    <SelectItem value="Email">Email Marketing</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Budget Allocation ($)</Label>
                                            <Input
                                                type="number"
                                                required
                                                value={newCampaign.budget}
                                                onChange={(e) => setNewCampaign({ ...newCampaign, budget: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label>Start Date</Label>
                                            <Input
                                                type="date"
                                                value={newCampaign.start_date}
                                                onChange={(e) => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>End Date</Label>
                                            <Input
                                                type="date"
                                                value={newCampaign.end_date}
                                                onChange={(e) => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Target Audience</Label>
                                        <Input
                                            value={newCampaign.target_audience}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, target_audience: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setIsCampaignOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" className="bg-orange-600 text-white hover:bg-orange-700">
                                            Create Campaign
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Campaigns Overview */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {campaigns.map((camp) => {
                        const spendPercent = camp.budget > 0 ? Math.round((camp.spend / camp.budget) * 100) : 0;
                        return (
                            <Card
                                key={camp.id}
                                className="space-y-4 rounded-2xl border-[#ECECF0] bg-white p-5 shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <Badge variant="outline" className="mb-1 border-orange-500 bg-orange-500/10 text-xs text-orange-600">
                                            {camp.channel}
                                        </Badge>
                                        <h3 className="text-base font-bold text-[#191927] dark:text-white">{camp.name}</h3>
                                        <p className="text-xs text-[#777785] dark:text-slate-400">{camp.target_audience}</p>
                                    </div>
                                    <Badge variant="secondary" className="bg-[#ECECF0] text-xs text-[#191927] dark:bg-[#28283E] dark:text-slate-300">
                                        {camp.status}
                                    </Badge>
                                </div>

                                {/* Budget Utilization */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-[#191927] dark:text-white">
                                        <span>
                                            Budget: ${Number(camp.spend).toLocaleString()} / ${Number(camp.budget).toLocaleString()}
                                        </span>
                                        <span className="text-[#777785] dark:text-slate-300">{spendPercent}% Utilized</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                        <div className="h-2 rounded-full bg-orange-500" style={{ width: `${spendPercent}%` }} />
                                    </div>
                                </div>

                                {/* Telemetry Metrics Grid */}
                                <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#ECECF0] bg-slate-50 p-3 text-center dark:border-[#28283E] dark:bg-[#181826]">
                                    <div>
                                        <div className="flex items-center justify-center gap-1 text-xs text-[#777785] dark:text-slate-400">
                                            <Eye className="h-3 w-3" /> Views
                                        </div>
                                        <div className="mt-0.5 text-sm font-bold text-[#191927] dark:text-white">
                                            {Number(camp.impressions).toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-center gap-1 text-xs text-[#777785] dark:text-slate-400">
                                            <MousePointerClick className="h-3 w-3" /> Leads
                                        </div>
                                        <div className="mt-0.5 text-sm font-bold text-blue-600 dark:text-blue-400">{camp.leads_generated}</div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-center gap-1 text-xs text-[#777785] dark:text-slate-400">
                                            <TrendingUp className="h-3 w-3" /> Conversions
                                        </div>
                                        <div className="mt-0.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">{camp.conversions}</div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Editorial Content Calendar */}
                <Card className="rounded-2xl border-[#ECECF0] bg-white shadow-xs dark:border-[#28283E] dark:bg-[#1E1E2F]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold text-[#191927] dark:text-white">Content Planning & Editorial Schedule</CardTitle>
                        <CardDescription className="text-xs text-[#777785] dark:text-slate-400">
                            Publishing pipeline across marketing channels
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-[#ECECF0] overflow-hidden rounded-xl border border-[#ECECF0] dark:divide-[#28283E] dark:border-[#28283E]">
                            {contents.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3.5 text-xs transition-colors hover:bg-slate-50/80 dark:hover:bg-[#181826]/70"
                                >
                                    <div className="space-y-1">
                                        <div className="font-semibold text-[#191927] dark:text-white">{item.title}</div>
                                        <div className="flex items-center gap-2 text-[#777785] dark:text-slate-400">
                                            <span>Platform: {item.platform}</span>
                                            <span>• Format: {item.format}</span>
                                            <span>• Scheduled: {formatDate(item.scheduled_date)}</span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="border-blue-500 bg-blue-500/10 text-blue-600">
                                        {item.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
