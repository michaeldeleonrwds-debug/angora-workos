import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlignLeft,
    ArrowLeft,
    Calendar,
    CheckSquare,
    ChevronDown,
    Eye,
    Globe,
    List,
    Mail,
    Phone,
    Plus,
    Save,
    Star,
    Trash2,
    Type,
    UploadCloud,
} from 'lucide-react';
import { useState } from 'react';

interface FormFieldItem {
    id?: number;
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
    maps_to_column?: string;
    position: number;
}

interface Form {
    id: number;
    uuid: string;
    title: string;
    description?: string;
    category: string;
    visibility: string;
    is_published: boolean;
    board_id?: number;
    project_id?: number;
    fields: FormFieldItem[];
    board?: { id: number; title: string; board_columns?: Array<{ key: string; title: string }> };
    project?: { id: number; name: string };
}

interface Props {
    form: Form;
    boards: Array<{ id: number; title: string; board_columns?: Array<{ key: string; title: string }> }>;
    projects: Array<{ id: number; name: string; code: string }>;
}

const FIELD_PALETTE = [
    { type: 'short_text', label: 'Short Text', icon: Type },
    { type: 'long_text', label: 'Long Text', icon: AlignLeft },
    { type: 'email', label: 'Email', icon: Mail },
    { type: 'phone', label: 'Phone', icon: Phone },
    { type: 'date', label: 'Date', icon: Calendar },
    { type: 'dropdown', label: 'Dropdown', icon: List },
    { type: 'radio', label: 'Single Choice', icon: CheckSquare },
    { type: 'checkbox', label: 'Multiple Choice', icon: CheckSquare },
    { type: 'file_upload', label: 'File Upload', icon: UploadCloud },
    { type: 'url', label: 'Website Link', icon: Globe },
    { type: 'rating', label: 'Rating (1-5)', icon: Star },
];

export default function FormBuilder({ form, boards, projects }: Props) {
    const [fields, setFields] = useState<FormFieldItem[]>(form.fields || []);
    const [selectedFieldIdx, setSelectedFieldIdx] = useState<number | null>(0);
    const [isSaving, setIsSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

    const addField = (fieldType: string, label: string) => {
        const newKey = `field_${fieldType}_${Date.now()}`;
        const newField: FormFieldItem = {
            field_key: newKey,
            label: label,
            type: fieldType,
            is_required: false,
            options: ['dropdown', 'radio', 'checkbox'].includes(fieldType) ? ['Option 1', 'Option 2'] : undefined,
            position: fields.length,
        };

        const updated = [...fields, newField];
        setFields(updated);
        setSelectedFieldIdx(updated.length - 1);
    };

    const removeField = (index: number) => {
        const updated = fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, position: i }));
        setFields(updated);
        setSelectedFieldIdx(null);
    };

    const updateSelectedField = (props: Partial<FormFieldItem>) => {
        if (selectedFieldIdx === null) return;
        const updated = [...fields];
        updated[selectedFieldIdx] = { ...updated[selectedFieldIdx], ...props };
        setFields(updated);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch(`/forms/${form.id}/fields/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({ fields }),
            });
            router.reload();
        } catch (e) {
            console.error('Failed to sync fields', e);
        } finally {
            setIsSaving(false);
        }
    };

    const selectedField = selectedFieldIdx !== null ? fields[selectedFieldIdx] : null;

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'WorkForms', href: '/forms' },
                { title: form.title, href: `/forms/${form.id}/edit` },
                { title: 'Builder', href: '#' },
            ]}
        >
            <Head title={`Builder: ${form.title} | Angora Work OS`} />

            <div className="flex h-[calc(100vh-65px)] flex-col">
                {/* Top Control Bar */}
                <div className="z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <Link href="/forms" className="text-gray-400 transition-colors hover:text-gray-600">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h2 className="text-lg leading-tight font-extrabold text-[#12121E] dark:text-white">{form.title}</h2>
                            <p className="text-[11px] text-gray-400">Drag-and-drop live canvas with conditional branch logic & column mapping</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center rounded-xl bg-gray-100 p-0.5 text-xs dark:bg-gray-800">
                            <button
                                onClick={() => setPreviewMode('desktop')}
                                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                                    previewMode === 'desktop' ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white' : 'text-gray-500'
                                }`}
                            >
                                Desktop
                            </button>
                            <button
                                onClick={() => setPreviewMode('mobile')}
                                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                                    previewMode === 'mobile' ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white' : 'text-gray-500'
                                }`}
                            >
                                Mobile
                            </button>
                        </div>

                        <a href={`/f/${form.uuid}`} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm" className="rounded-xl text-xs">
                                <Eye className="mr-1 h-3.5 w-3.5" /> Public Preview
                            </Button>
                        </a>

                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="rounded-xl bg-[#00c875] text-xs font-bold text-[#12121E] shadow-sm hover:bg-[#00b268]"
                        >
                            <Save className="mr-1 h-3.5 w-3.5" /> {isSaving ? 'Saving...' : 'Publish Changes'}
                        </Button>
                    </div>
                </div>

                {/* 3-Column Studio Layout */}
                <div className="flex flex-1 overflow-hidden">
                    {/* LEFT PALETTE: Available Field Types */}
                    <div className="w-72 space-y-3 overflow-y-auto border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <h4 className="px-1 text-xs font-bold tracking-wider text-gray-400 uppercase">Available Field Types</h4>
                        <div className="grid grid-cols-1 gap-2">
                            {FIELD_PALETTE.map((item) => (
                                <button
                                    key={item.type}
                                    onClick={() => addField(item.type, item.label)}
                                    className="group flex items-center gap-2.5 rounded-2xl border border-gray-100 bg-gray-50/60 p-3 text-left text-xs font-semibold text-gray-800 transition-all hover:border-[#00c875] hover:bg-emerald-50/40 dark:border-gray-800/80 dark:bg-gray-800/40 dark:text-gray-200 dark:hover:bg-emerald-950/20"
                                >
                                    <item.icon className="h-4 w-4 text-gray-400 group-hover:text-[#00c875]" />
                                    <span>{item.label}</span>
                                    <Plus className="ml-auto h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CENTER CANVAS: Live Form Canvas */}
                    <div className="flex flex-1 justify-center overflow-y-auto bg-[#F8F9F7] p-6 dark:bg-[#12121E]">
                        <div
                            className={`w-full transition-all duration-300 ${
                                previewMode === 'mobile' ? 'max-w-md' : 'max-w-2xl'
                            } h-fit space-y-6 rounded-[28px] border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900`}
                        >
                            <div className="space-y-1 border-b pb-4">
                                <h1 className="text-2xl font-black text-[#12121E] dark:text-white">{form.title}</h1>
                                {form.description && <p className="text-xs text-gray-500">{form.description}</p>}
                            </div>

                            {fields.length === 0 ? (
                                <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center text-xs text-gray-400 dark:border-gray-800">
                                    Click any field on the left palette to add it to your form.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {fields.map((f, idx) => (
                                        <div
                                            key={f.field_key}
                                            onClick={() => setSelectedFieldIdx(idx)}
                                            className={`group relative cursor-pointer rounded-2xl border p-4 transition-all ${
                                                selectedFieldIdx === idx
                                                    ? 'border-[#00c875] bg-emerald-50/10 ring-2 ring-[#00c875]/20 dark:bg-emerald-950/20'
                                                    : 'border-gray-100 hover:border-gray-300 dark:border-gray-800'
                                            }`}
                                        >
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <Label className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                    {f.label} {f.is_required && <span className="text-rose-500">*</span>}
                                                </Label>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeField(idx);
                                                    }}
                                                    className="p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-rose-500"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>

                                            {/* Form Field Input Skeleton */}
                                            {f.type === 'long_text' ? (
                                                <div className="h-16 w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2 text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-800/40">
                                                    {f.placeholder || 'Long text response...'}
                                                </div>
                                            ) : f.type === 'dropdown' ? (
                                                <div className="flex h-9 w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-800/40">
                                                    <span>Select option...</span>
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                </div>
                                            ) : f.type === 'file_upload' ? (
                                                <div className="flex h-20 w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 text-xs text-gray-400 dark:border-gray-700">
                                                    <UploadCloud className="mb-1 h-5 w-5 text-gray-400" />
                                                    <span>Drag & drop files or click to upload</span>
                                                </div>
                                            ) : (
                                                <div className="flex h-9 w-full items-center rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-800/40">
                                                    {f.placeholder || 'Enter value...'}
                                                </div>
                                            )}

                                            {f.help_text && <p className="mt-1 text-[10px] text-gray-400">{f.help_text}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Button className="w-full rounded-xl bg-[#00c875] py-5 text-xs font-bold text-[#12121E]">Submit Request</Button>
                        </div>
                    </div>

                    {/* RIGHT INSPECTOR: Selected Field Properties */}
                    <div className="w-80 space-y-5 overflow-y-auto border-l border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                        <h4 className="text-xs font-bold tracking-wider text-gray-400 uppercase">Field Properties</h4>

                        {!selectedField ? (
                            <p className="text-xs text-gray-400">Select any field in the center canvas to configure its properties.</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Field Label</Label>
                                    <Input
                                        value={selectedField.label}
                                        onChange={(e) => updateSelectedField({ label: e.target.value })}
                                        className="rounded-xl text-xs"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Placeholder Text</Label>
                                    <Input
                                        value={selectedField.placeholder || ''}
                                        onChange={(e) => updateSelectedField({ placeholder: e.target.value })}
                                        className="rounded-xl text-xs"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Help Text / Subtext</Label>
                                    <Input
                                        value={selectedField.help_text || ''}
                                        onChange={(e) => updateSelectedField({ help_text: e.target.value })}
                                        className="rounded-xl text-xs"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="req_check"
                                        checked={selectedField.is_required}
                                        onChange={(e) => updateSelectedField({ is_required: e.target.checked })}
                                        className="rounded text-[#00c875]"
                                    />
                                    <label htmlFor="req_check" className="cursor-pointer text-xs font-medium">
                                        Mandatory / Required Field
                                    </label>
                                </div>

                                {/* Board Column Mapping */}
                                <div className="space-y-1 border-t pt-3">
                                    <Label className="text-xs font-semibold">Maps to Task Column</Label>
                                    <select
                                        value={selectedField.maps_to_column || ''}
                                        onChange={(e) => updateSelectedField({ maps_to_column: e.target.value })}
                                        className="w-full rounded-xl border border-gray-300 bg-white p-2 text-xs dark:border-gray-700 dark:bg-gray-800"
                                    >
                                        <option value="">Do not map directly</option>
                                        <option value="title">Task Title</option>
                                        <option value="description">Task Description</option>
                                        <option value="priority">Priority</option>
                                        <option value="due_date">Due Date</option>
                                        {form.board?.board_columns?.map((bc) => (
                                            <option key={bc.key} value={bc.key}>
                                                Board Column: {bc.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Options Editor for Dropdown / Radio / Checkbox */}
                                {['dropdown', 'radio', 'checkbox'].includes(selectedField.type) && (
                                    <div className="space-y-2 border-t pt-3">
                                        <Label className="text-xs font-semibold">Choice Options (comma separated)</Label>
                                        <textarea
                                            value={(selectedField.options || []).join(', ')}
                                            onChange={(e) => updateSelectedField({ options: e.target.value.split(',').map((s) => s.trim()) })}
                                            rows={3}
                                            className="w-full rounded-xl border border-gray-300 bg-white p-2 text-xs dark:border-gray-700 dark:bg-gray-800"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
