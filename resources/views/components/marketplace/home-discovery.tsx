import ProductCard, { type ProductCardData } from '@/components/marketplace/product-card';

type DiscoveryProduct = ProductCardData & { key: string; category: string };
const homepageProducts: DiscoveryProduct[] = [
    {
        key: 'handbag',
        name: 'Caramel Leather Shoulder Bag',
        price: '1500.00',
        image_url: '/images/products/samples/premium-handbag.png',
        category: 'Bags & accessories',
        sample: true,
    },
    {
        key: 'headphones',
        name: 'Lavender Wireless Headphones',
        price: '2999.00',
        image_url: '/images/products/samples/premium-headphones.png',
        category: 'Electronics',
        sample: true,
    },
    {
        key: 'sneakers',
        name: 'Everyday Cream Sneakers',
        price: '1800.00',
        image_url: '/images/products/samples/premium-sneakers.png',
        category: 'Shoes',
        sample: true,
    },
    {
        key: 'coffee',
        name: 'Roasted Coffee Beans',
        price: '350.00',
        image_url: '/images/products/samples/premium-coffee.png',
        category: 'Food & beverages',
        sample: true,
    },
];
export default function HomeDiscovery({ products, favoriteIds }: { products: DiscoveryProduct[]; favoriteIds: number[] }) {
    const cards = products.length ? products.slice(0, 4) : homepageProducts;
    return (
        <div className="product-grid mt-6">
            {cards.map((product) => (
                <ProductCard key={product.key} product={product} saved={product.id != null && favoriteIds.includes(product.id)} />
            ))}
        </div>
    );
}
