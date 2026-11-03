import { buttonClass, Select, Textarea } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { useForm } from '@inertiajs/react';

export type PurchaseReview = { rating: number; body: string; is_visible: boolean };
export default function ReviewForm({ itemId, name, review }: { itemId: number; name: string; review?: PurchaseReview }) {
    const form = useForm({ rating: review?.rating.toString() ?? '5', body: review?.body ?? '' });
    return (
        <details className="mt-4 rounded-xl border p-4">
            <summary className="min-h-6 cursor-pointer text-sm font-medium">
                {review ? 'Edit your review' : 'Rate your purchase'}: {name}
            </summary>
            {review && !review.is_visible && (
                <p className="text-muted-foreground mt-3 text-sm">
                    This review is hidden by moderation. Editing does not publish it again. Contact support if you need help.
                </p>
            )}
            <ValidatedForm
                className="mt-4 space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(`/order-items/${itemId}/review`, { preserveScroll: true });
                }}
            >
                <Select
                    label="Rating"
                    required
                    value={form.data.rating}
                    onChange={(event) => form.setData('rating', event.target.value)}
                    error={form.errors.rating}
                >
                    {[5, 4, 3, 2, 1].map((rating) => (
                        <option key={rating} value={rating}>
                            {rating} {rating === 1 ? 'star' : 'stars'}
                        </option>
                    ))}
                </Select>
                <Textarea
                    label="Your experience"
                    required
                    minLength={3}
                    maxLength={2000}
                    rows={3}
                    value={form.data.body}
                    onChange={(event) => form.setData('body', event.target.value)}
                    error={form.errors.body}
                />
                <button className={buttonClass} disabled={form.processing}>
                    {form.processing ? 'Saving review…' : 'Save review'}
                </button>
            </ValidatedForm>
        </details>
    );
}
