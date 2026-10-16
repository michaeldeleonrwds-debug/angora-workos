import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Mail, Check, AlertCircle, Sparkles } from 'lucide-react';
import { csrfHeaders } from '@/lib/utils';

interface NotificationPref {
    category: string;
    in_app_enabled: boolean;
    email_enabled: boolean;
}

interface NotificationPreferencesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const CATEGORY_META: Record<string, { label: string; desc: string }> = {
    mentions: {
        label: 'Mentions & Replies',
        desc: 'Receive alerts when team members @mention you or reply to your updates.',
    },
    assignments: {
        label: 'Task Assignments',
        desc: 'Get notified when you are assigned as Designer, AM, or task owner.',
    },
    reviews: {
        label: 'Review & Approvals',
        desc: 'Alerts for review submissions, deliverable approvals, and requested revisions.',
    },
    deadlines: {
        label: 'Deadlines & Reminders',
        desc: 'Timely reminders for upcoming due dates, milestone shifts, and overdue items.',
    },
    automations: {
        label: 'Board Automations',
        desc: 'Status transitions and rule triggers automated by board logic.',
    },
    system: {
        label: 'System & Workspace',
        desc: 'General workspace member activity and team announcements.',
    },
};

export function NotificationPreferencesModal({ open, onOpenChange }: NotificationPreferencesModalProps) {
    const [preferences, setPreferences] = useState<NotificationPref[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (open) {
            fetchPreferences();
        }
    }, [open]);

    const fetchPreferences = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/notifications/preferences', {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const data = await res.json();
                setPreferences(data.preferences || []);
            }
        } catch (err) {
            console.error('Failed to load notification preferences:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = (category: string, type: 'in_app' | 'email') => {
        setPreferences((prev) =>
            prev.map((p) => {
                if (p.category === category) {
                    return {
                        ...p,
                        [type === 'in_app' ? 'in_app_enabled' : 'email_enabled']:
                            !p[type === 'in_app' ? 'in_app_enabled' : 'email_enabled'],
                    };
                }
                return p;
            })
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            const res = await fetch('/notifications/preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...csrfHeaders(),
                },
                body: JSON.stringify({ preferences }),
            });

            if (res.ok) {
                setSaveSuccess(true);
                setTimeout(() => {
                    setSaveSuccess(false);
                    onOpenChange(false);
                }, 800);
            }
        } catch (err) {
            console.error('Failed to update preferences:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl border-[#ECECF0] bg-white p-6 shadow-2xl dark:border-[#2A2A3D] dark:bg-[#1A1A2A]">
                <DialogHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Notification Preferences</span>
                    </div>
                    <DialogTitle className="text-base font-bold text-[#191927] dark:text-white">
                        Delivery Channels & Frequency
                    </DialogTitle>
                    <DialogDescription className="text-xs text-[#777785] dark:text-slate-400">
                        Choose which events trigger instant in-app bells and email notifications. For native Windows / Chrome desktop alerts, visit{' '}
                        <a href="/settings/notifications" className="text-[#0073ea] hover:underline dark:text-[#579bfc]">
                            Desktop & Push Settings
                        </a>.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-8 text-center text-xs text-[#777785] dark:text-slate-400">
                        Loading preferences...
                    </div>
                ) : (
                    <div className="divide-y divide-[#ECECF0] dark:divide-[#2A2A3D] max-h-[380px] overflow-y-auto pr-1">
                        {preferences.map((pref) => {
                            const meta = CATEGORY_META[pref.category] || {
                                label: pref.category.charAt(0).toUpperCase() + pref.category.slice(1),
                                desc: 'Updates related to this category.',
                            };

                            return (
                                <div key={pref.category} className="py-3 flex items-start justify-between gap-3">
                                    <div className="space-y-0.5 max-w-[260px]">
                                        <p className="text-xs font-semibold text-[#191927] dark:text-white">
                                            {meta.label}
                                        </p>
                                        <p className="text-[11px] leading-tight text-[#777785] dark:text-slate-400">
                                            {meta.desc}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 pt-0.5">
                                        {/* In-app toggle */}
                                        <button
                                            type="button"
                                            title="In-App Bell"
                                            onClick={() => handleToggle(pref.category, 'in_app')}
                                            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                                                pref.in_app_enabled
                                                    ? 'border-[#0073ea] bg-[#0073ea] text-white shadow-2xs'
                                                    : 'border-[#ECECF0] bg-slate-100 text-slate-400 dark:border-[#2A2A3D] dark:bg-[#252538]'
                                            }`}
                                        >
                                            <Bell className="h-3.5 w-3.5" />
                                        </button>

                                        {/* Email toggle */}
                                        <button
                                            type="button"
                                            title="Email Alert"
                                            onClick={() => handleToggle(pref.category, 'email')}
                                            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                                                pref.email_enabled
                                                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs'
                                                    : 'border-[#ECECF0] bg-slate-100 text-slate-400 dark:border-[#2A2A3D] dark:bg-[#252538]'
                                            }`}
                                        >
                                            <Mail className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <DialogFooter className="flex items-center justify-between border-t border-[#ECECF0] pt-4 dark:border-[#2A2A3D]">
                    <div className="flex items-center gap-3 text-[11px] text-[#777785] dark:text-slate-400">
                        <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-[#0073ea]" /> In-App
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-600" /> Email
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl text-xs h-8"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="rounded-xl bg-[#0073ea] hover:bg-[#0060c0] text-xs h-8 font-semibold text-white gap-1.5"
                        >
                            {saveSuccess ? (
                                <>
                                    <Check className="h-3.5 w-3.5 text-white" />
                                    <span>Saved!</span>
                                </>
                            ) : isSaving ? (
                                'Saving...'
                            ) : (
                                'Save Preferences'
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
