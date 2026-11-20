import { buttonClass, Field, Select, Textarea } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function ReturnRequest({ eligible, days = 7 }: { days?: number; eligible: { id: number; store: { name: string } }[] }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        seller_order_id: String(eligible[0]?.id ?? ''),
        reason_kind: 'other',
        reason: '',
        description: '',
        evidence: [] as File[],
    });
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={buttonClass}>Request a return</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Request a return</DialogTitle>
                    <DialogDescription>
                        Return the whole seller parcel. The standard window is {days} days; contact support for exceptions. Damage or
                        incorrect-product claims need photo evidence.
                    </DialogDescription>
                </DialogHeader>
                <ValidatedForm
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.transform((data) => ({ ...data, reason: data.description }));
                        form.post('/returns', {
                            forceFormData: true,
                            onSuccess: () => {
                                setOpen(false);
                                form.reset();
                            },
                        });
                    }}
                >
                    <Select
                        label="Delivered parcel"
                        value={form.data.seller_order_id}
                        onChange={(e) => form.setData('seller_order_id', e.target.value)}
                        error={form.errors.seller_order_id}
                    >
                        {eligible.map((p) => (
                            <option key={p.id} value={p.id}>
                                Parcel #{p.id} · {p.store.name}
                            </option>
                        ))}
                    </Select>
                    <Select label="Return reason" value={form.data.reason_kind} onChange={(e) => form.setData('reason_kind', e.target.value)}>
                        <option value="other">Other issue</option>
                        <option value="damaged">Damaged goods</option>
                        <option value="wrong_product">Incorrect product</option>
                    </Select>
                    <Textarea
                        label="Describe the issue"
                        required
                        minLength={10}
                        maxLength={2000}
                        value={form.data.description}
                        onChange={(e) => form.setData('description', e.target.value)}
                        error={form.errors.description ?? form.errors.reason}
                    />
                    <Field
                        label="Supporting photos (up to 5, JPG or PNG, 5 MB each)"
                        type="file"
                        accept="image/jpeg,image/png"
                        multiple
                        onChange={(e) => form.setData('evidence', Array.from(e.target.files ?? []))}
                        error={form.errors.evidence}
                    />
                    <button className={buttonClass} disabled={form.processing}>
                        {form.processing ? 'Submitting request…' : 'Submit return request'}
                    </button>
                </ValidatedForm>
            </DialogContent>
        </Dialog>
    );
}
