import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';
import * as React from 'react';

export type ToastVariant = 'success' | 'warning' | 'error' | 'info';

export interface ToastOptions {
    title: string;
    message?: string;
    variant?: ToastVariant;
    duration?: number;
}

export interface ToastItem {
    id: number;
    title: string;
    message?: string;
    variant: ToastVariant;
}

let toasts: ToastItem[] = [];
let listeners = new Set<() => void>();
let nextId = 1;
let lastKey = '';
let lastAt = 0;

function emit(): void {
    listeners.forEach((listener) => listener());
}

export function dismissToast(id: number): void {
    if (!toasts.some((toast) => toast.id === id)) {
        return;
    }
    toasts = toasts.filter((toast) => toast.id !== id);
    emit();
}

export function showToast(options: ToastOptions): void {
    const variant = options.variant ?? 'info';
    const key = `${variant}|${options.title}|${options.message ?? ''}`;
    const now = Date.now();
    if (key === lastKey && now - lastAt < 1500) {
        return;
    }
    lastKey = key;
    lastAt = now;

    const id = nextId++;
    toasts = [...toasts, { title: options.title, message: options.message, variant, id }];
    emit();

    window.setTimeout(() => dismissToast(id), options.duration ?? (variant === 'error' ? 6000 : 4000));
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function getSnapshot(): ToastItem[] {
    return toasts;
}

export function useToasts(): ToastItem[] {
    return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useToast(): { toast: typeof showToast } {
    return { toast: showToast };
}

const variantStyles: Record<ToastVariant, { accent: string; icon: React.ElementType; iconClass: string }> = {
    success: { accent: 'border-l-emerald-500', icon: CheckCircle2, iconClass: 'text-emerald-500' },
    warning: { accent: 'border-l-amber-500', icon: AlertTriangle, iconClass: 'text-amber-500' },
    error: { accent: 'border-l-rose-500', icon: ShieldAlert, iconClass: 'text-rose-500' },
    info: { accent: 'border-l-sky-500', icon: Info, iconClass: 'text-sky-500' },
};

export function Toaster(): React.JSX.Element {
    const items = useToasts();

    return (
        <div
            aria-live="polite"
            className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col gap-2"
        >
            {items.map((toast) => {
                const style = variantStyles[toast.variant];
                const Icon = style.icon;
                return (
                    <div
                        key={toast.id}
                        role={toast.variant === 'error' ? 'alert' : 'status'}
                        className={`pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-200 rounded-lg border border-l-4 border-border bg-card p-4 text-card-foreground shadow-lg ${style.accent}`}
                    >
                        <div className="flex items-start gap-3">
                            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconClass}`} />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">{toast.title}</p>
                                {toast.message ? <p className="mt-1 text-xs text-muted-foreground">{toast.message}</p> : null}
                            </div>
                            <button
                                type="button"
                                aria-label="Dismiss notification"
                                onClick={() => dismissToast(toast.id)}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
