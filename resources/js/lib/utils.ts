import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format ISO or date strings (e.g. 2026-10-14T00:00:00.000000Z or 2026-10-14)
 * into a clean readable date string like "Oct 14, 2026".
 */
export function formatDate(dateVal: string | Date | null | undefined, fallback: string = '-'): string {
    if (!dateVal) return fallback;
    try {
        const str = typeof dateVal === 'string' ? dateVal : dateVal.toISOString();
        // If it starts with YYYY-MM-DD, parse parts directly to avoid UTC timezone day-shifts
        const datePart = str.split('T')[0];
        const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1;
            const day = parseInt(match[3], 10);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            if (!isNaN(year) && month >= 0 && month <= 11 && !isNaN(day)) {
                return `${day} ${months[month]} ${year}`;
            }
        }
        const d = new Date(str);
        if (isNaN(d.getTime())) return str;
        const day = d.getDate();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
        return String(dateVal);
    }
}

/**
 * Format datetime strings into a clean readable format like "Oct 14, 2026, 08:30 AM"
 */
export function formatDateTime(dateVal: string | Date | null | undefined, fallback: string = '-'): string {
    if (!dateVal) return fallback;
    try {
        const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
        if (isNaN(d.getTime())) return String(dateVal);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return String(dateVal);
    }
}

/**
 * Format time strings (e.g. "17:00", "09:30:00") or Date objects into 12-hour AM/PM format (e.g. "5:00 PM", "9:30 AM")
 */
export function formatTime(timeVal: string | Date | null | undefined, fallback: string = '-'): string {
    if (!timeVal) return fallback;
    try {
        if (typeof timeVal === 'string') {
            const trimmed = timeVal.trim();
            // Check for HH:mm or HH:mm:ss format
            const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
            if (match) {
                let hour = parseInt(match[1], 10);
                const minute = match[2];
                const ampm = hour >= 12 ? 'PM' : 'AM';
                hour = hour % 12;
                if (hour === 0) hour = 12;
                return `${hour}:${minute} ${ampm}`;
            }
        }
        const d = typeof timeVal === 'string' ? new Date(timeVal) : timeVal;
        if (isNaN(d.getTime())) return String(timeVal);
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
        return String(timeVal);
    }
}

/**
 * Retrieve CSRF token from document meta tag.
 */
export function getCsrfToken(): string {
    if (typeof document === 'undefined') return '';
    const meta = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
    return meta || '';
}

/**
 * Retrieve XSRF cookie value (decoded).
 */
export function getXsrfCookie(): string {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Return headers with CSRF tokens for fetch requests.
 */
export function csrfHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'X-Requested-With': 'XMLHttpRequest',
    };

    const xsrf = getXsrfCookie();
    if (xsrf) {
        headers['X-XSRF-TOKEN'] = xsrf;
    }

    const token = getCsrfToken();
    if (token) {
        headers['X-CSRF-TOKEN'] = token;
    }

    return headers;
}

/**
 * Calculate the exact remaining time or overdue duration from now to the target due date & time.
 * Returns human-readable relative time string:
 * e.g. "Due in 5h 30m", "Due in 45m", "Due in 1d 8h", "Overdue by 2h 15m"
 */
export function getExactTimeRemaining(
    dueDate: string | null | undefined,
    dueTime?: string | null | undefined
): {
    formattedRemaining: string;
    isOverdue: boolean;
    totalMinutes: number;
    hours: number;
    days: number;
} | null {
    if (!dueDate) return null;

    try {
        const datePart = String(dueDate).split('T')[0];
        const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;

        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);

        let hours = 23;
        let minutes = 59;
        let seconds = 59;

        if (dueTime) {
            const timeTrimmed = String(dueTime).trim();
            const timeMatch = timeTrimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
            if (timeMatch) {
                hours = parseInt(timeMatch[1], 10);
                minutes = parseInt(timeMatch[2], 10);
                seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
            }
        }

        const dueTarget = new Date(year, month, day, hours, minutes, seconds);
        const now = new Date();
        const diffMs = dueTarget.getTime() - now.getTime();
        const isOverdue = diffMs < 0;
        const absMs = Math.abs(diffMs);

        const totalMinutes = Math.floor(absMs / (1000 * 60));
        const totalHours = Math.floor(totalMinutes / 60);
        const diffDays = Math.floor(totalHours / 24);
        const remHours = totalHours % 24;
        const remMinutes = totalMinutes % 60;

        let timeStr = '';
        if (diffDays > 0) {
            timeStr = remHours > 0 ? `${diffDays}d ${remHours}h` : `${diffDays}d`;
        } else if (totalHours > 0) {
            timeStr = remMinutes > 0 ? `${totalHours}h ${remMinutes}m` : `${totalHours}h`;
        } else if (totalMinutes > 0) {
            timeStr = `${totalMinutes}m`;
        } else {
            timeStr = '< 1m';
        }

        return {
            formattedRemaining: isOverdue ? `Overdue by ${timeStr}` : `Due in ${timeStr}`,
            isOverdue,
            totalMinutes,
            hours: totalHours,
            days: diffDays,
        };
    } catch {
        return null;
    }
}
