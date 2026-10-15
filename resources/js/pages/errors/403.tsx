import { ErrorShell } from '@/components/ErrorShell';
import { PERMISSION_DENIED_MESSAGE, PERMISSION_DENIED_TITLE } from '@/lib/permission-errors';

interface Error403Props {
    title?: string;
    message?: string;
}

export default function Error403({ title, message }: Error403Props) {
    return <ErrorShell status={403} title={title ?? PERMISSION_DENIED_TITLE} message={message ?? PERMISSION_DENIED_MESSAGE} />;
}
