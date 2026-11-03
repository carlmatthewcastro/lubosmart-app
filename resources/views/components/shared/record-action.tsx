import { buttonClass, Field, secondaryClass, Select, Textarea } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { SharedData } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

export type ActionField = {
    key: string;
    label: string;
    type?: 'text' | 'number' | 'textarea' | 'select' | 'date';
    value?: string;
    options?: { value: string; label: string }[];
    min?: string;
    max?: string;
    maxLength?: number;
    required?: boolean;
};

export default function RecordAction({
    title,
    description,
    url,
    method = 'post',
    fields,
    action,
}: {
    title: string;
    description: string;
    url: string;
    method?: 'post' | 'patch';
    fields: ActionField[];
    action?: string;
}) {
    const form = useForm<Record<string, string>>(Object.fromEntries(fields.map((field) => [field.key, field.value ?? ''])));
    const { auth } = usePage<SharedData>().props;
    const [open, setOpen] = useState(false);
    const content = (
        <ValidatedForm
            className="mt-4 space-y-4"
            onSubmit={(event) => {
                event.preventDefault();
                form.transform((data) => ({
                    ...data,
                    ...(action ? { action } : {}),
                    ...(Object.hasOwn(data, 'restock') ? { restock: data.restock === 'yes' } : {}),
                }));
                form[method](url, { preserveScroll: true, onSuccess: () => setOpen(false) });
            }}
        >
            {fields.map((field) => {
                const common = {
                    label: field.label,
                    required: field.required !== false,
                    value: form.data[field.key],
                    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
                        form.setData(field.key, event.target.value),
                    error: form.errors[field.key],
                };
                return field.type === 'select' ? (
                    <Select key={field.key} {...common}>
                        <option value="">Choose an option</option>
                        {field.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                ) : field.type === 'textarea' ? (
                    <Textarea key={field.key} {...common} rows={3} maxLength={field.maxLength ?? 500} />
                ) : (
                    <Field
                        key={field.key}
                        {...common}
                        type={field.type ?? 'text'}
                        min={field.min}
                        max={field.max}
                        step={field.type === 'number' ? '0.01' : undefined}
                        maxLength={field.maxLength ?? 100}
                    />
                );
            })}
            {Object.entries(form.errors)
                .filter(([key]) => !fields.some((field) => field.key === key))
                .map(([key, error]) => (
                    <p key={key} role="alert" className="text-destructive text-sm">
                        {error}
                    </p>
                ))}
            <button className={buttonClass} disabled={form.processing}>
                {form.processing ? 'Recording…' : `Confirm: ${title.toLowerCase()}`}
            </button>
        </ValidatedForm>
    );
    if (auth.user.role !== 'admin')
        return (
            <Dialog
                open={open}
                onOpenChange={(value) => {
                    if (!form.processing) setOpen(value);
                }}
            >
                <DialogTrigger asChild>
                    <button type="button" className={`${secondaryClass} mt-4`}>
                        {title}
                    </button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>
                    {content}
                </DialogContent>
            </Dialog>
        );
    return (
        <details className="mt-4 rounded-xl border p-4">
            <summary className="min-h-6 cursor-pointer text-sm font-semibold">{title}</summary>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{description}</p>
            {content}
        </details>
    );
}
