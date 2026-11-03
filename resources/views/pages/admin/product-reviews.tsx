import { buttonClass, Card, Page, Pager, Select, Textarea, type Pagination } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Link, useForm } from '@inertiajs/react';

type Review = { id: number; product_id: number; body: string; rating: number; is_visible: boolean };
function Moderation({ review }: { review: Review }) {
    const form = useForm({ is_visible: review.is_visible ? 'visible' : 'hidden', reason: '' });
    return (
        <Card>
            <Link className="text-primary underline" href={`/products/${review.product_id}`}>
                Product #{review.product_id}
            </Link>
            <p className="mt-3 text-sm font-semibold">
                {review.rating} / 5 · {review.is_visible ? 'Visible' : 'Hidden'}
            </p>
            <p className="mt-3 text-sm break-words whitespace-pre-wrap">{review.body}</p>
            <ValidatedForm
                className="mt-4 space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.transform((data) => ({ ...data, is_visible: data.is_visible === 'visible' }));
                    form.patch(`/admin/product-reviews/${review.id}`, {
                        preserveScroll: true,
                        onSuccess: () => form.reset('reason'),
                    });
                }}
            >
                <Select label="Review visibility" value={form.data.is_visible} onChange={(event) => form.setData('is_visible', event.target.value)}>
                    <option value="visible">Visible</option>
                    <option value="hidden">Hidden</option>
                </Select>
                <Textarea
                    label="Moderation reason"
                    required
                    minLength={3}
                    maxLength={500}
                    value={form.data.reason}
                    onChange={(event) => form.setData('reason', event.target.value)}
                    error={form.errors.reason}
                />
                <button className={buttonClass} disabled={form.processing}>
                    {form.processing ? 'Saving…' : 'Save moderation decision'}
                </button>
            </ValidatedForm>
        </Card>
    );
}
export default function ProductReviews({ reviews }: { reviews: Pagination<Review> }) {
    return (
        <Page title="Product review moderation" description="Hide abusive reviews with an auditable reason; sellers cannot change buyer ratings.">
            <p className="text-muted-foreground text-sm">{reviews.total} reviews</p>
            {reviews.data.map((review) => (
                <Moderation key={review.id} review={review} />
            ))}
            {!reviews.data.length && <Card>No product reviews yet.</Card>}
            <Pager links={reviews.links} />
        </Page>
    );
}
