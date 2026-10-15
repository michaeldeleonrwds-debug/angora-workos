import { ErrorShell } from '@/components/ErrorShell';
import { ACTION_NOT_ALLOWED_FALLBACK_MESSAGE, ACTION_NOT_ALLOWED_TITLE } from '@/lib/permission-errors';

interface Error422Props {
    title?: string;
    message?: string;
}

export default function Error422({ title, message }: Error422Props) {
    return <ErrorShell status={422} title={title ?? ACTION_NOT_ALLOWED_TITLE} message={message ?? ACTION_NOT_ALLOWED_FALLBACK_MESSAGE} />;
}
