import ProductCard from '@/components/marketplace/product-card';
import { Card, Page, Pager, type Pagination } from '@/components/shared/marketplace-ui';
import type { Product } from './catalog';

export default function ProductDetails({
    product,
    reviews,
    saved = false,
}: {
    product: Product;
    saved?: boolean;
    reviews: Pagination<{ id: number; rating: number; body: string; created_at: string }>;
}) {
    return (
        <Page title={product.name} description={`Sold by ${product.store.name}`}>
            <div className="grid items-start gap-6 md:grid-cols-2">
                <ProductCard product={{ ...product, seller: product.store.name }} saved={saved} />
                <Card>
                    <h2 className="text-lg font-semibold">Product details</h2>
                    <p className="mt-4 text-sm break-words whitespace-pre-wrap">{product.description || 'The seller has not added a description.'}</p>
                    <p className="text-muted-foreground mt-4 text-sm">
                        {product.weight_grams ? `${product.weight_grams} g packed weight per item` : 'Packed weight has not been supplied.'}
                    </p>
                    <p className="text-muted-foreground mt-3 text-sm">
                        Available size/color options share the listed price and packed weight. Shipping is confirmed in your cart.
                    </p>
                </Card>
            </div>
            <Card>
                <h2 className="text-lg font-semibold">Verified purchase reviews ({reviews.total})</h2>
                {reviews.data.length ? (
                    <ul className="mt-4 divide-y">
                        {reviews.data.map((review) => (
                            <li key={review.id} className="py-4">
                                <p className="text-sm font-semibold">{review.rating} / 5 stars · Verified purchase</p>
                                <p className="mt-2 text-sm break-words whitespace-pre-wrap">{review.body}</p>
                                <time className="text-muted-foreground mt-2 block text-xs" dateTime={review.created_at}>
                                    {new Date(review.created_at).toLocaleDateString()}
                                </time>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-muted-foreground mt-4 text-sm">No reviews yet. Buyers can review items after delivery.</p>
                )}
            </Card>
            <Pager links={reviews.links} />
        </Page>
    );
}
