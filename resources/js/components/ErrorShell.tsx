import { Button } from '@/components/ui/button';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import * as React from 'react';

interface ErrorShellProps {
    status: number;
    title: string;
    message: string;
}

function goBack(): void {
    if (window.history.length > 1) {
        window.history.back();
        return;
    }
    window.location.assign('/dashboard');
}

export function ErrorShell({ status, title, message }: ErrorShellProps): React.JSX.Element {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-lg">
                <p className="text-xs font-semibold tracking-[0.3em] text-muted-foreground">ANGORA</p>
                <p className="mt-6 text-6xl font-bold text-muted-foreground/40">{status}</p>
                <h1 className="mt-4 text-xl font-semibold">{title}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{message}</p>
                <div className="mt-8 flex items-center justify-center gap-3">
                    <Button type="button" variant="outline" onClick={goBack}>
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </Button>
                    <Button asChild>
                        <a href="/dashboard">
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}
