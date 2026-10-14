import { money } from '@/components/shared/marketplace-ui';
import type { SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Heart, ImageIcon, LoaderCircle, ShoppingCart, Star, Store } from 'lucide-react';
import { useState } from 'react';

export type ProductCardData = {
    id?: number;
    name: string;
    description?: string | null;
    price: string;
    image_url?: string | null;
    stock?: number;
    seller?: string;
    sample?: boolean;
    originalPrice?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
};

export default function ProductCard({ product, saved = false }: { product: ProductCardData; saved?: boolean }) {
    const { auth } = usePage<SharedData>().props;
    const [failedImage, setFailedImage] = useState<string | null>(null);
    const [feedback, setFeedback] = useState('');
    const [previewLiked, setPreviewLiked] = useState(false);
    const cart = useForm({ quantity: 1, add: true });
    const favorite = useForm({ saved: !saved });
    const eligible = auth.user?.role === 'buyer' && auth.user.status === 'approved' && !!auth.user.email_verified_at;
    const live = !!product.id && !product.sample;
    const href = '/shop?search=' + encodeURIComponent(product.name.slice(0, 100));
    const discounted =
        live && Number(product.price) >= 0 && Number.isFinite(Number(product.originalPrice)) && Number(product.originalPrice) > Number(product.price);
    const discount = discounted ? Math.round((1 - Number(product.price) / Number(product.originalPrice)) * 100) : 0;
    const iconClass =
        'bg-card/95 text-primary hover:bg-accent focus-visible:ring-ring absolute top-3 right-3 flex size-11 items-center justify-center rounded-full shadow-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';
    return (
        <article className="product-card bg-card text-card-foreground group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
            <div className="bg-muted/40 relative aspect-square shrink-0 overflow-hidden">
                {product.image_url && product.image_url !== failedImage ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        width={400}
                        height={400}
                        onError={() => setFailedImage(product.image_url!)}
                        className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
                    />
                ) : (
                    <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <ImageIcon aria-hidden="true" className="size-8" />
                        <span className="text-xs">Photo unavailable</span>
                    </div>
                )}
                {!!discount && (
                    <span className="bg-primary text-primary-foreground absolute top-3 left-3 rounded-md px-2 py-1 text-xs font-semibold">
                        -{discount}%
                    </span>
                )}
                {product.sample ? (
                    <button
                        type="button"
                        className={iconClass}
                        aria-label={(previewLiked ? 'Unlike ' : 'Like ') + product.name}
                        aria-pressed={previewLiked}
                        onClick={() => setPreviewLiked((liked) => !liked)}
                    >
                        <Heart
                            aria-hidden="true"
                            className={
                                'size-5 transition-transform active:scale-125 motion-reduce:transition-none ' +
                                (previewLiked ? 'text-destructive fill-current' : '')
                            }
                        />
                    </button>
                ) : !auth.user ? (
                    <Link href={route('login')} aria-label={'Sign in to save ' + product.name} className={iconClass}>
                        <Heart aria-hidden="true" className="size-5" />
                    </Link>
                ) : (
                    <button
                        type="button"
                        className={iconClass}
                        aria-label={(saved ? 'Remove ' : 'Save ') + product.name + (saved ? ' from wishlist' : ' to wishlist')}
                        aria-pressed={saved}
                        disabled={!live || !eligible || favorite.processing}
                        title={
                            !live
                                ? 'Sample preview; save available products in the shop'
                                : !eligible
                                  ? 'Saving products is available to approved Buyer accounts'
                                  : undefined
                        }
                        onClick={() => {
                            favorite.transform(() => ({ saved: !saved }));
                            favorite.post('/wishlist/' + product.id, {
                                preserveScroll: true,
                                onSuccess: () => setFeedback(saved ? 'Removed from wishlist' : 'Saved to wishlist'),
                            });
                        }}
                    >
                        {favorite.processing ? (
                            <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
                        ) : (
                            <Heart aria-hidden="true" className={'size-5 ' + (saved ? 'text-destructive fill-current' : '')} />
                        )}
                    </button>
                )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                <h2 className="h-10 text-sm leading-5 font-semibold">
                    <span className="line-clamp-2 break-words" title={product.name}>
                        {product.name}
                    </span>
                </h2>
                <div className="text-muted-foreground flex min-h-5 flex-wrap items-center gap-x-2 text-xs leading-5">
                    {product.rating != null && product.reviewCount != null ? (
                        <span className="flex items-center gap-1">
                            <span className="text-warning flex gap-0.5" aria-hidden="true">
                                {Array.from({ length: 5 }, (_, index) => (
                                    <Star key={index} className={'size-3.5 ' + (index < Math.round(product.rating!) ? 'fill-current' : '')} />
                                ))}
                            </span>
                            {product.rating.toFixed(1)} ({product.reviewCount})
                        </span>
                    ) : (
                        <span className="flex flex-wrap items-center gap-x-1.5" aria-label="No ratings yet">
                            <span className="text-warning flex items-center gap-0.5" aria-hidden="true">
                                {Array.from({ length: 5 }, (_, index) => (
                                    <Star key={index} className="size-3 shrink-0" />
                                ))}
                            </span>
                            <span>No ratings yet</span>
                        </span>
                    )}
                </div>
                <p className="text-muted-foreground min-h-5 text-xs leading-5 tabular-nums">
                    {product.stock != null
                        ? product.stock === 0
                            ? 'Out of stock'
                            : 'Stock: ' + product.stock.toLocaleString() + ' available'
                        : 'Stock not provided'}
                </p>
                {product.seller && (
                    <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
                        <Store aria-hidden="true" className="size-3.5 shrink-0" />
                        <span className="truncate" title={product.seller}>
                            {product.seller}
                        </span>
                    </p>
                )}
                <div className="mt-auto flex min-h-11 items-center justify-between gap-2 pt-2">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums">
                        <span className="text-primary max-w-full text-lg font-bold tracking-tight break-all sm:text-xl">{money(product.price)}</span>
                        {discounted && <del className="text-muted-foreground max-w-full text-xs break-all">{money(product.originalPrice!)}</del>}
                    </div>
                    {live && eligible ? (
                        <button
                            type="button"
                            disabled={product.stock === 0 || cart.processing}
                            aria-label={'Add ' + product.name + ' to cart'}
                            onClick={() => cart.put('/cart/' + product.id, { preserveScroll: true, onSuccess: () => setFeedback('Added to cart') })}
                            className="bg-accent text-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-ring flex size-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                        >
                            {cart.processing ? (
                                <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
                            ) : (
                                <ShoppingCart aria-hidden="true" className="size-5" />
                            )}
                        </button>
                    ) : (
                        <Link
                            href={product.sample || !auth.user ? route('login') : auth.user.role === 'buyer' && !eligible ? '/application' : href}
                            aria-label={(product.sample || !auth.user ? 'Sign in to shop ' : 'View in shop ') + product.name}
                            className="bg-accent text-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-ring flex size-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none"
                        >
                            <ShoppingCart aria-hidden="true" className="size-5" />
                        </Link>
                    )}
                </div>
                <p role="status" className="text-primary text-xs">
                    {feedback}
                </p>
                {(cart.errors.quantity || favorite.errors.saved) && (
                    <p role="alert" className="text-destructive text-xs">
                        {cart.errors.quantity || favorite.errors.saved}
                    </p>
                )}
            </div>
        </article>
    );
}
