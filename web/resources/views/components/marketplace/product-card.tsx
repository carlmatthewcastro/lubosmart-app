import { money, Select } from '@/components/shared/marketplace-ui';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import type { SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Heart, ImageIcon, LoaderCircle, ShoppingCart, Star, Store } from 'lucide-react';
import { useState } from 'react';
import '../../../css/product-cards.css';

export type ProductCardData = {
    id?: number;
    name: string;
    description?: string | null;
    price: string;
    image_url?: string | null;
    stock?: number;
    seller?: string;
    categoryLabel?: string;
    sample?: boolean;
    originalPrice?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    variants?: { id: number; name: string; stock: number; is_active: boolean }[];
    reviews_avg_rating?: number | string | null;
    reviews_count?: number;
};

export default function ProductCard({
    product,
    saved = false,
    compact = false,
    listView = false,
}: {
    product: ProductCardData;
    saved?: boolean;
    compact?: boolean;
    listView?: boolean;
}) {
    const { auth } = usePage<SharedData>().props;
    const [failedImage, setFailedImage] = useState<string | null>(null);
    const [feedback, setFeedback] = useState('');
    const [previewLiked, setPreviewLiked] = useState(false);
    const [variantDialogOpen, setVariantDialogOpen] = useState(false);
    const cart = useForm({ quantity: 1, add: true, product_variant_id: '' });
    const variants = product.variants?.filter((variant) => variant.is_active) ?? [];
    const selectedVariant = variants.find((variant) => String(variant.id) === cart.data.product_variant_id);
    const hasVariants = !!product.variants?.length;
    const stock = hasVariants ? (selectedVariant?.stock ?? 0) : product.stock;
    const displayedStock = hasVariants ? variants.reduce((total, variant) => total + variant.stock, 0) : product.stock;
    const rating = product.reviews_avg_rating != null ? Number(product.reviews_avg_rating) : product.rating;
    const reviewCount = product.reviews_count ?? product.reviewCount;
    const favorite = useForm({ saved: !saved });
    const eligible = auth.user?.role === 'buyer' && auth.user.status === 'approved' && !!auth.user.email_verified_at;
    const live = !!product.id && !product.sample;
    const href = '/shop?search=' + encodeURIComponent(product.name.slice(0, 100));
    const discounted =
        live && Number(product.price) >= 0 && Number.isFinite(Number(product.originalPrice)) && Number(product.originalPrice) > Number(product.price);
    const discount = discounted ? Math.round((1 - Number(product.price) / Number(product.originalPrice)) * 100) : 0;
    const iconClass = compact
        ? 'bg-card/95 text-primary hover:bg-accent focus-visible:ring-ring absolute top-3 right-3 flex size-11 items-center justify-center rounded-full shadow-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
        : 'bg-card/95 text-primary hover:bg-accent focus-visible:ring-ring absolute top-2 right-2 flex size-10 items-center justify-center rounded-lg border focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';
    const ratingContent = (
        <div className="text-muted-foreground flex min-h-5 flex-wrap items-center gap-x-2 text-xs leading-5">
            {rating != null && reviewCount != null && reviewCount > 0 ? (
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-warning flex gap-0.5" aria-hidden="true">
                        {Array.from({ length: 5 }, (_, index) => (
                            <Star key={index} className={'size-3.5 ' + (index < Math.round(rating) ? 'fill-current' : '')} />
                        ))}
                    </span>
                    <span className="whitespace-nowrap">
                        {rating.toFixed(1)} ({reviewCount})
                    </span>
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
    );
    return (
        <article
            data-product-card
            className={
                compact
                    ? 'product-card bg-card text-card-foreground group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none'
                    : 'product-card bg-card text-card-foreground group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border transition-shadow duration-200 hover:shadow-sm motion-reduce:transition-none'
            }
        >
            <div className="product-card-image relative aspect-square shrink-0 overflow-hidden">
                <div className="product-card-photo">
                    {product.image_url && product.image_url !== failedImage ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            width={400}
                            height={400}
                            onError={() => setFailedImage(product.image_url!)}
                            className="h-full w-full object-contain object-center"
                        />
                    ) : (
                        <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <ImageIcon aria-hidden="true" className="size-8" />
                            <span className="text-xs">Photo unavailable</span>
                        </div>
                    )}
                </div>
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
            {listView && <div className="product-image-rating">{ratingContent}</div>}
            <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                {product.categoryLabel && (
                    <span className="bg-accent text-primary w-fit rounded-full px-2 py-1 text-xs font-semibold">{product.categoryLabel}</span>
                )}
                <h2 className="h-10 text-sm leading-5 font-semibold">
                    <Link href={live ? `/products/${product.id}` : href} className="line-clamp-2 break-words hover:underline" title={product.name}>
                        {product.name}
                    </Link>
                </h2>
                <div className="product-card-variants">
                    {!!variants.length && (
                        <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
                            <DialogTrigger asChild>
                                <button
                                    type="button"
                                    className="text-primary bg-accent focus-visible:ring-ring min-h-6 max-w-full truncate rounded px-2 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
                                    aria-label={'Select size or color for ' + product.name}
                                >
                                    {selectedVariant ? selectedVariant.name : 'Options available'}
                                </button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Select size / color</DialogTitle>
                                    <DialogDescription>{product.name} — choose an available option.</DialogDescription>
                                </DialogHeader>
                                <Select
                                    label="Size / color"
                                    reserveFeedback={false}
                                    value={cart.data.product_variant_id}
                                    error={cart.errors.product_variant_id}
                                    onChange={(event) => cart.setData('product_variant_id', event.target.value)}
                                >
                                    <option value="">Choose an option</option>
                                    {variants.map((variant) => (
                                        <option key={variant.id} value={variant.id} disabled={!variant.stock}>
                                            {variant.name} ({variant.stock} available)
                                        </option>
                                    ))}
                                </Select>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button disabled={!selectedVariant || selectedVariant.stock === 0}>Done</Button>
                                    </DialogClose>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
                {!listView && ratingContent}
                <div className="flex min-h-5 flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <p className="text-muted-foreground text-xs leading-5 tabular-nums">
                        {compact && product.sample
                            ? 'Sample preview'
                            : displayedStock != null
                              ? displayedStock === 0
                                  ? 'Out of stock'
                                  : displayedStock.toLocaleString() + ' in stock'
                              : 'Stock not provided'}
                    </p>
                </div>
                {product.seller && (
                    <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
                        <Store aria-hidden="true" className="size-3.5 shrink-0" />
                        <span className="truncate" title={product.seller}>
                            {product.seller}
                        </span>
                    </p>
                )}
                <div className={'mt-auto flex min-h-11 gap-2 pt-2 ' + (compact ? 'flex-col items-stretch' : 'items-center justify-between')}>
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums">
                        <span className="text-primary max-w-full text-lg font-bold tracking-tight break-all sm:text-xl">{money(product.price)}</span>
                        {discounted && <del className="text-muted-foreground max-w-full text-xs break-all">{money(product.originalPrice!)}</del>}
                    </div>
                    {live && eligible ? (
                        <button
                            type="button"
                            disabled={(hasVariants ? displayedStock === 0 : stock === 0) || cart.processing}
                            aria-label={'Add ' + product.name + ' to cart'}
                            onClick={() => {
                                if (hasVariants && !selectedVariant) {
                                    setVariantDialogOpen(true);
                                    return;
                                }
                                cart.put('/cart/' + product.id, { preserveScroll: true, onSuccess: () => setFeedback('Added to cart') });
                            }}
                            className={
                                compact
                                    ? 'reference-button w-full'
                                    : 'bg-accent text-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-ring flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none'
                            }
                        >
                            {cart.processing ? (
                                <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
                            ) : (
                                <ShoppingCart aria-hidden="true" className="size-5" />
                            )}
                            {compact && <span>{cart.processing ? 'Adding...' : 'Add to Cart'}</span>}
                        </button>
                    ) : (
                        <Link
                            href={product.sample || !auth.user ? route('login') : auth.user.role === 'buyer' && !eligible ? '/application' : href}
                            aria-label={(product.sample || !auth.user ? 'Sign in to shop ' : 'View in shop ') + product.name}
                            className={
                                compact
                                    ? 'reference-button w-full'
                                    : 'bg-accent text-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-ring flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none'
                            }
                        >
                            <ShoppingCart aria-hidden="true" className="size-5" />
                            {compact && <span>{product.sample || !auth.user ? 'Sign in to shop' : 'View in shop'}</span>}
                        </Link>
                    )}
                </div>
                <p role="status" className="text-primary text-xs">
                    {feedback}
                </p>
                {(cart.errors.quantity || cart.errors.product_variant_id || favorite.errors.saved) && (
                    <p role="alert" className="text-destructive text-xs">
                        {cart.errors.quantity || cart.errors.product_variant_id || favorite.errors.saved}
                    </p>
                )}
            </div>
        </article>
    );
}
