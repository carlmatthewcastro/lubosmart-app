import { Card, money, secondaryClass } from '@/components/shared/marketplace-ui';

export type PublicVoucher = {
    id: number;
    store_id: number;
    code: string;
    amount_cents: number;
    minimum_cents: number;
    expires_at: string;
    eligible: boolean | null;
    discount_cents: number | null;
};
export default function PublicVouchers({
    vouchers,
    onSelect,
    selectedCode,
    busy = false,
}: {
    vouchers: PublicVoucher[];
    onSelect?: (voucher: PublicVoucher) => void;
    selectedCode?: string;
    busy?: boolean;
}) {
    if (!vouchers.length) return null;
    const best = vouchers.find((v) => v.eligible);
    return (
        <Card>
            <h2 className="text-lg font-semibold">Shop vouchers</h2>
            <p className="text-muted-foreground mt-2 text-sm">
                Seller-funded merchandise discounts. Choose one voucher at checkout; shipping stays unchanged.
            </p>
            <ul className="mt-4 space-y-3">
                {vouchers.map((v) => (
                    <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                        <div className="min-w-0 break-words">
                            <p className="text-sm font-medium">
                                {money(v.amount_cents / 100)} off · minimum {money(v.minimum_cents / 100)}
                                {best?.id === v.id && onSelect ? ' · Recommended' : ''}
                            </p>
                            <p className="text-muted-foreground mt-1 text-xs">
                                {v.code} · Expires {new Date(v.expires_at).toLocaleDateString('en-PH')}
                            </p>
                        </div>
                        {onSelect && (
                            <button
                                type="button"
                                className={secondaryClass}
                                aria-label={`Select ${money(v.amount_cents / 100)} off voucher ${v.code}`}
                                aria-pressed={selectedCode === v.code}
                                disabled={busy || !v.eligible}
                                onClick={() => onSelect(v)}
                            >
                                {selectedCode === v.code ? 'Selected' : v.eligible ? 'Select voucher' : 'Not eligible for this bag'}
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </Card>
    );
}
