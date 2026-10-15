import { showToast } from '@/components/toast';

export const PERMISSION_DENIED_TITLE = 'Action Not Permitted';
export const PERMISSION_DENIED_MESSAGE = "You don't have permission to perform this action.";
export const ACTION_NOT_ALLOWED_TITLE = 'Action Not Allowed';
export const ACTION_NOT_ALLOWED_FALLBACK_MESSAGE = 'This action is not allowed right now.';

interface ErrorPayload {
    message?: unknown;
    code?: unknown;
}

let installed = false;

export function notifyPermissionDenied(): void {
    showToast({
        variant: 'error',
        title: PERMISSION_DENIED_TITLE,
        message: PERMISSION_DENIED_MESSAGE,
    });
}

export function notifyActionNotAllowed(message?: string): void {
    showToast({
        variant: 'warning',
        title: ACTION_NOT_ALLOWED_TITLE,
        message: message?.trim() || ACTION_NOT_ALLOWED_FALLBACK_MESSAGE,
    });
}

export function notifyFromStatus(status: number, payload?: ErrorPayload | null): void {
    if (status === 403) {
        notifyPermissionDenied();
        return;
    }
    if (status === 422) {
        const message = typeof payload?.message === 'string' ? payload.message : undefined;
        notifyActionNotAllowed(message);
    }
}

function toErrorPayload(data: unknown): ErrorPayload | null {
    if (typeof data === 'string') {
        try {
            const parsed: unknown = JSON.parse(data);
            return parsed && typeof parsed === 'object' ? (parsed as ErrorPayload) : null;
        } catch {
            return null;
        }
    }
    if (data && typeof data === 'object') {
        return data as ErrorPayload;
    }
    return null;
}

function isSameOriginRequest(input: RequestInfo | URL): boolean {
    try {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        return url.startsWith('/') || new URL(url, window.location.href).origin === window.location.origin;
    } catch {
        return false;
    }
}

function installFetchHandler(): void {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const response = await originalFetch(input, init);

        try {
            if ((response.status === 403 || response.status === 422) && isSameOriginRequest(input)) {
                const contentType = response.headers.get('content-type') ?? '';
                if (contentType.includes('application/json')) {
                    const payload = toErrorPayload(await response.clone().json().catch(() => null));
                    notifyFromStatus(response.status, payload);
                } else {
                    notifyFromStatus(response.status, null);
                }
            }
        } catch {
            // Notification handling must never break the original request.
        }

        return response;
    };
}

interface InertiaInvalidDetail {
    response?: {
        data?: unknown;
        status?: number;
        response?: {
            status?: number;
            data?: unknown;
        };
    };
}

function installInertiaInvalidHandler(): void {
    document.addEventListener('inertia:invalid', (event) => {
        const detail = (event as CustomEvent<InertiaInvalidDetail>).detail;
        const axiosResponse = detail?.response?.response;
        const status = axiosResponse?.status ?? detail?.response?.status;
        if (status !== 403 && status !== 422) {
            return;
        }
        // Suppress Inertia's raw "invalid response" overlay for expected
        // authorization failures; the toast replaces it and the SPA stays put.
        event.preventDefault();
        const payload = toErrorPayload(detail?.response?.data ?? axiosResponse?.data ?? null);
        notifyFromStatus(status, payload);
    });
}

export function installPermissionErrorHandlers(): void {
    if (installed || typeof window === 'undefined') {
        return;
    }
    installed = true;
    installFetchHandler();
    installInertiaInvalidHandler();
}
