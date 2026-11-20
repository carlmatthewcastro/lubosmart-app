import { buttonClass, secondaryClass, Textarea } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { useForm } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { useId, useState } from 'react';

export type PurchaseReview = { rating: number; body: string; is_visible: boolean };
export function ReviewEditor({
    itemId,
    name,
    review,
    onCancel,
    onSaved,
}: {
    itemId: number;
    name: string;
    review?: PurchaseReview;
    onCancel: () => void;
    onSaved?: () => void;
}) {
    const form = useForm({ rating: review?.rating.toString() ?? '5', body: review?.body ?? '' });
    const ratingId = useId();
    return (
        <ValidatedForm
            className="space-y-4"
            onSubmit={(event) => {
                event.preventDefault();
                form.post(`/order-items/${itemId}/review`, { preserveScroll: true, onSuccess: () => onSaved?.() });
            }}
        >
            <fieldset aria-describedby={form.errors.rating ? `${ratingId}-error` : undefined} disabled={form.processing}>
                <legend className="sr-only">Rating for {name}</legend>
                <div className="flex flex-wrap justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                        <label key={rating} className="relative flex size-11 cursor-pointer items-center justify-center rounded-md">
                            <input
                                className="peer sr-only"
                                type="radio"
                                name={ratingId}
                                value={rating}
                                checked={form.data.rating === String(rating)}
                                onChange={() => form.setData('rating', String(rating))}
                                required
                                aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}`}
                            />
                            <Star
                                aria-hidden="true"
                                className={`peer-focus-visible:ring-ring size-8 rounded-sm peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 ${rating <= Number(form.data.rating) ? 'fill-warning text-warning' : 'text-muted-foreground'}`}
                            />
                        </label>
                    ))}
                </div>
                <p className="mt-1 text-center text-sm">{['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][Number(form.data.rating)]}</p>
                {form.errors.rating && (
                    <p id={`${ratingId}-error`} className="text-destructive mt-2 text-sm">
                        {form.errors.rating}
                    </p>
                )}
            </fieldset>
            {review && !review.is_visible && (
                <p className="text-muted-foreground text-sm">
                    This review is hidden by moderation. Editing does not publish it again. Contact support if you need help.
                </p>
            )}
            <Textarea
                label="Your experience"
                required
                minLength={3}
                maxLength={2000}
                rows={4}
                value={form.data.body}
                onChange={(event) => form.setData('body', event.target.value)}
                error={form.errors.body}
                disabled={form.processing}
            />
            <p className="text-muted-foreground text-right text-xs tabular-nums">{form.data.body.length}/2000 characters</p>
            <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className={secondaryClass} disabled={form.processing} onClick={onCancel}>
                    Cancel
                </button>
                <button className={buttonClass} disabled={form.processing}>
                    {form.processing ? 'Saving review…' : 'Save review'}
                </button>
            </div>
        </ValidatedForm>
    );
}
export default function ReviewForm({ itemId, name, review }: { itemId: number; name: string; review?: PurchaseReview }) {
    const [open, setOpen] = useState(false);
    return (
        <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="mt-4 rounded-xl border p-4">
            <summary className="min-h-11 cursor-pointer text-sm font-medium">
                {review ? 'Edit your review' : 'Rate your purchase'}: {name}
            </summary>
            {open && (
                <div className="mt-4">
                    <ReviewEditor itemId={itemId} name={name} review={review} onCancel={() => setOpen(false)} onSaved={() => setOpen(false)} />
                </div>
            )}
        </details>
    );
}
