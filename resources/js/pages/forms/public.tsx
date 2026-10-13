import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head } from '@inertiajs/react';
import { AlertCircle, ArrowRight, CheckCircle2, FileCheck } from 'lucide-react';
import React, { useState } from 'react';

interface FormFieldItem {
    id: number;
    field_key: string;
    label: string;
    type: string;
    help_text?: string;
    placeholder?: string;
    default_value?: string;
    is_required: boolean;
    options?: string[];
    conditional_logic?: {
        field_key: string;
        operator: string;
        value: string;
    } | null;
}

interface Form {
    id: number;
    uuid: string;
    title: string;
    description?: string;
    success_message?: string;
    fields: FormFieldItem[];
}

interface Props {
    form: Form;
    isAuthenticated: boolean;
    currentUser?: { name: string; email: string };
}

export default function PublicForm({ form, isAuthenticated, currentUser }: Props) {
    const [answers, setAnswers] = useState<Record<string, any>>({
        submitter_name: currentUser?.name || '',
        submitter_email: currentUser?.email || '',
    });
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleInputChange = (key: string, value: any) => {
        setAnswers((prev) => ({ ...prev, [key]: value }));
    };

    // Evaluate conditional logic dynamically on client
    const isFieldVisible = (field: FormFieldItem) => {
        const logic = field.conditional_logic;
        if (!logic || !logic.field_key) return true;

        const val = answers[logic.field_key];
        if (logic.operator === 'equals') return val === logic.value;
        if (logic.operator === 'not_equals') return val !== logic.value;
        if (logic.operator === 'contains') return String(val).includes(logic.value);
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMessage(null);

        const formData = new FormData();
        Object.entries(answers).forEach(([key, val]) => {
            formData.append(key, val);
        });

        // Add idempotency token
        formData.append('_submission_token', `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

        try {
            const res = await fetch(`/f/${form.uuid}`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Submission failed. Please check required fields.');
            }

            setIsSubmitted(true);
        } catch (err: any) {
            setErrorMessage(err.message || 'An error occurred while submitting your request.');
        } finally {
            setSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8F9F7] p-6 dark:bg-[#12121E]">
                <Head title={`Submitted: ${form.title}`} />
                <div className="w-full max-w-md space-y-4 rounded-[28px] border border-gray-100 bg-white p-8 text-center shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-300">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-black text-[#12121E] dark:text-white">Submission Received!</h2>
                    <p className="text-xs text-gray-500">
                        {form.success_message || 'Thank you! Your agency project request has been logged and assigned to the production board.'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col justify-center bg-[#F8F9F7] px-4 py-12 sm:px-6 lg:px-8 dark:bg-[#12121E]">
            <Head title={form.title} />

            <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
                <div className="space-y-8 rounded-[32px] border border-gray-200/80 bg-white px-8 py-10 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                    {/* Header */}
                    <div className="border-b border-gray-100 pb-5 dark:border-gray-800">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <FileCheck className="h-3.5 w-3.5" /> Angora WorkForms
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-[#12121E] dark:text-white">{form.title}</h1>
                        {form.description && <p className="mt-1 text-xs text-gray-500">{form.description}</p>}
                    </div>

                    {errorMessage && (
                        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Submitter identification */}
                        <div className="grid grid-cols-1 gap-4 border-b border-gray-100 pb-4 sm:grid-cols-2 dark:border-gray-800">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Your Name *</Label>
                                <Input
                                    value={answers.submitter_name}
                                    onChange={(e) => handleInputChange('submitter_name', e.target.value)}
                                    placeholder="Full Name"
                                    required
                                    className="rounded-xl text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Your Email *</Label>
                                <Input
                                    type="email"
                                    value={answers.submitter_email}
                                    onChange={(e) => handleInputChange('submitter_email', e.target.value)}
                                    placeholder="name@company.com"
                                    required
                                    className="rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        {/* Dynamic fields with conditional logic */}
                        {form.fields.map((field) => {
                            if (!isFieldVisible(field)) return null;

                            return (
                                <div key={field.field_key} className="space-y-1.5">
                                    <Label className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                        {field.label} {field.is_required && <span className="text-rose-500">*</span>}
                                    </Label>

                                    {field.type === 'long_text' ? (
                                        <textarea
                                            value={answers[field.field_key] || ''}
                                            onChange={(e) => handleInputChange(field.field_key, e.target.value)}
                                            placeholder={field.placeholder || ''}
                                            required={field.is_required}
                                            rows={4}
                                            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-xs dark:border-gray-700 dark:bg-gray-800"
                                        />
                                    ) : field.type === 'dropdown' ? (
                                        <select
                                            value={answers[field.field_key] || ''}
                                            onChange={(e) => handleInputChange(field.field_key, e.target.value)}
                                            required={field.is_required}
                                            className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800"
                                        >
                                            <option value="">Select option...</option>
                                            {field.options?.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    ) : field.type === 'radio' ? (
                                        <div className="space-y-2 pt-1">
                                            {field.options?.map((opt) => (
                                                <label key={opt} className="flex cursor-pointer items-center gap-2 text-xs">
                                                    <input
                                                        type="radio"
                                                        name={field.field_key}
                                                        value={opt}
                                                        checked={answers[field.field_key] === opt}
                                                        onChange={(e) => handleInputChange(field.field_key, e.target.value)}
                                                        required={field.is_required}
                                                    />
                                                    <span>{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <Input
                                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                            value={answers[field.field_key] || ''}
                                            onChange={(e) => handleInputChange(field.field_key, e.target.value)}
                                            placeholder={field.placeholder || ''}
                                            required={field.is_required}
                                            className="rounded-xl text-xs"
                                        />
                                    )}

                                    {field.help_text && <p className="text-[10px] text-gray-400">{field.help_text}</p>}
                                </div>
                            );
                        })}

                        <Button
                            type="submit"
                            disabled={submitting}
                            className="mt-4 w-full rounded-xl bg-[#00c875] py-5 text-xs font-black text-[#12121E] hover:bg-[#00b268]"
                        >
                            {submitting ? 'Submitting...' : 'Submit Request'} <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
