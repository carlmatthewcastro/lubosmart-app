import { buttonClass, Card, Empty, Page, Pager, Select, Textarea, type Pagination } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { Link, useForm } from '@inertiajs/react';
import { ArrowUpRight, Eye, EyeOff, MessageSquare, ShieldCheck, Star } from 'lucide-react';

type Review = { id: number; product_id: number; body: string; rating: number; is_visible: boolean };
function Moderation({ review }: { review: Review }) {
    const form = useForm({ is_visible: review.is_visible ? 'visible' : 'hidden', reason: '' });
    return (
        <Card className="grid gap-6 lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1">
                        <p className="text-muted-foreground text-xs font-medium">Review #{review.id}</p>
                        <h2>
                            <Link
                                className="text-primary focus-visible:outline-ring inline-flex min-h-11 items-center gap-2 rounded-md text-base font-semibold underline-offset-4 hover:underline focus-visible:outline-2"
                                href={`/products/${review.product_id}`}
                            >
                                Product #{review.product_id}
                                <ArrowUpRight aria-hidden="true" className="size-4" />
                            </Link>
                        </h2>
                    </div>
                    <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${review.is_visible ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}
                    >
                        {review.is_visible ? <Eye aria-hidden="true" className="size-3.5" /> : <EyeOff aria-hidden="true" className="size-3.5" />}
                        {review.is_visible ? 'Visible' : 'Hidden'}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-primary flex gap-1" aria-hidden="true">
                        {Array.from({ length: 5 }, (_, index) => (
                            <Star key={index} className={`size-4 ${index < review.rating ? 'fill-current' : 'text-muted-foreground/40'}`} />
                        ))}
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                        {review.rating} / 5<span className="sr-only"> stars</span>
                    </span>
                </div>
                <blockquote className="bg-muted/40 rounded-xl border p-4 text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {review.body}
                </blockquote>
                <p className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
                    <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
                    Moderation changes visibility only. The buyer’s rating stays unchanged.
                </p>
            </div>
            <ValidatedForm
                className="grid min-w-0 content-start gap-4 border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.transform((data) => ({ ...data, is_visible: data.is_visible === 'visible' }));
                    form.patch(`/admin/product-reviews/${review.id}`, {
                        preserveScroll: true,
                        onSuccess: () => form.reset('reason'),
                    });
                }}
            >
                <Select
                    label="Review visibility"
                    reserveFeedback={false}
                    error={form.errors.is_visible}
                    value={form.data.is_visible}
                    onChange={(event) => form.setData('is_visible', event.target.value)}
                >
                    <option value="visible">Visible</option>
                    <option value="hidden">Hidden</option>
                </Select>
                <Textarea
                    label="Moderation reason (required)"
                    rows={3}
                    placeholder="Explain why this review should be visible or hidden…"
                    aria-describedby={`review-${review.id}-reason-hint`}
                    required
                    minLength={3}
                    maxLength={500}
                    value={form.data.reason}
                    onChange={(event) => form.setData('reason', event.target.value)}
                    error={form.errors.reason}
                />
                <p id={`review-${review.id}-reason-hint`} className="text-muted-foreground text-xs leading-relaxed">
                    Use 3–500 characters. This reason is recorded in the moderation history.
                </p>
                <button className={`${buttonClass} w-full sm:w-fit sm:justify-self-end`} disabled={form.processing}>
                    {form.processing ? 'Saving…' : 'Save moderation decision'}
                </button>
            </ValidatedForm>
        </Card>
    );
}
export default function ProductReviews({ reviews }: { reviews: Pagination<Review> }) {
    return (
        <Page title="Product review moderation" description="Hide abusive reviews with an auditable reason; sellers cannot change buyer ratings.">
            <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare aria-hidden="true" className="text-primary size-4" />
                {reviews.total} {reviews.total === 1 ? 'review' : 'reviews'}
            </div>
            {reviews.data.map((review) => (
                <Moderation key={review.id} review={review} />
            ))}
            {!reviews.data.length && <Empty title="No product reviews yet" description="Buyer reviews will appear here for visibility moderation." />}
            <Pager links={reviews.links} />
        </Page>
    );
}
