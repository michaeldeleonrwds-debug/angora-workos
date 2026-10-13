import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, FileCheck } from 'lucide-react';
import { useState } from 'react';

interface Submission {
    id: number;
    submission_token: string;
    submitter_name: string;
    submitter_email?: string;
    created_at: string;
    task?: { id: number; title: string };
    client?: { id: number; name: string };
    values: Array<{
        field_key: string;
        field_label: string;
        value: string;
        meta?: any;
    }>;
}

interface Form {
    id: number;
    title: string;
    uuid: string;
    board?: { id: number; title: string };
    project?: { id: number; name: string };
}

interface Props {
    form: Form;
    submissions: {
        data: Submission[];
        links: any[];
    };
}

export default function FormSubmissions({ form, submissions }: Props) {
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(submissions.data[0] || null);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'WorkForms', href: '/forms' },
                { title: form.title, href: `/forms/${form.id}/edit` },
                { title: 'Submissions', href: '#' },
            ]}
        >
            <Head title={`Submissions: ${form.title} | Angora Work OS`} />

            <div className="mx-auto max-w-7xl space-y-6 p-6">
                <div className="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <Link href="/forms" className="text-gray-400 transition-colors hover:text-gray-600">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-[#12121E] dark:text-white">{form.title} — Submission History</h1>
                            <p className="text-xs text-gray-400">Real-time intake ledger mapped to Kanban tasks and automated notifications</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Submissions List */}
                    <div className="space-y-3 lg:col-span-1">
                        <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">Submissions ({submissions.data.length})</h3>

                        {submissions.data.length === 0 ? (
                            <div className="rounded-2xl border bg-white p-8 text-center text-xs text-gray-400 dark:bg-gray-900">
                                No submissions recorded yet.
                            </div>
                        ) : (
                            submissions.data.map((sub) => (
                                <div
                                    key={sub.id}
                                    onClick={() => setSelectedSubmission(sub)}
                                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                                        selectedSubmission?.id === sub.id
                                            ? 'border-[#00c875] bg-emerald-50/40 dark:bg-emerald-950/30'
                                            : 'border-gray-100 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900'
                                    }`}
                                >
                                    <div className="mb-1 flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{sub.submitter_name || 'Guest Submitter'}</h4>
                                        <span className="text-[10px] text-gray-400">{new Date(sub.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="truncate text-xs text-gray-400">{sub.submitter_email || 'No email provided'}</p>
                                    {sub.task && (
                                        <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                            Task #{sub.task.id}: {sub.task.title}
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Submission Detail View */}
                    <div className="lg:col-span-2">
                        <div className="min-h-[400px] rounded-[28px] border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            {!selectedSubmission ? (
                                <div className="flex h-64 flex-col items-center justify-center text-xs text-gray-400">
                                    <FileCheck className="mb-2 h-8 w-8 opacity-50" />
                                    Select a submission on the left to inspect its values.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b pb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Submission Details</h3>
                                            <p className="text-xs text-gray-400">Token: {selectedSubmission.submission_token}</p>
                                        </div>
                                        {selectedSubmission.task && (
                                            <a
                                                href={`/kanban?item=${selectedSubmission.task.id}`}
                                                className="inline-flex items-center text-xs font-semibold text-[#0085ff] hover:underline"
                                            >
                                                Open Created Task <ExternalLink className="ml-1 h-3.5 w-3.5" />
                                            </a>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 rounded-2xl bg-gray-50 p-4 text-xs dark:bg-gray-800/40">
                                        <div>
                                            <span className="block text-gray-400">Submitter:</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{selectedSubmission.submitter_name}</span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-400">Email:</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {selectedSubmission.submitter_email || 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Field-by-field answers */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold tracking-wider text-gray-400 uppercase">Field Responses</h4>
                                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {selectedSubmission.values.map((v, i) => (
                                                <div key={i} className="flex justify-between gap-4 py-2.5 text-xs">
                                                    <span className="min-w-[140px] font-medium text-gray-500">{v.field_label}:</span>
                                                    <span className="flex-1 text-right font-semibold break-words text-gray-900 dark:text-white">
                                                        {v.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
