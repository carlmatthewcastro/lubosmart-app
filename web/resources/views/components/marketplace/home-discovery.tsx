import ProductCard, { type ProductCardData } from '@/components/marketplace/product-card';
import { Empty } from '@/components/shared/marketplace-ui';

type DiscoveryProduct = ProductCardData & { key: string; category: string };
export default function HomeDiscovery({ products, favoriteIds }: { products: DiscoveryProduct[]; favoriteIds: number[] }) {
    const featured = products.slice(0, 15);
    if (!featured.length)
        return (
            <Empty
                title="New products are on their way"
                description="There are no featured products available right now. Browse the marketplace or check back soon."
                href="/shop"
                label="Browse marketplace"
            />
        );
    return (
        <div className="product-grid mt-6">
            {featured.map((product) => (
                <ProductCard compact key={product.key} product={product} saved={product.id != null && favoriteIds.includes(product.id)} />
            ))}
        </div>
    );
}
