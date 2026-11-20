export { default } from '@/components/marketplace/refund-workflow';

type Location = { recipient_name?: string; phone?: string; line1?: string; barangay?: string; city?: string; province?: string };
export type ReturnRecord = {
    refund_context?: {
        buyer: string;
        order_reference: string;
        maximum_cents: number;
        default_cents: number;
        coin_credit_cents: number;
        previously_refunded_cents: number;
        remaining_cents: number;
        requires_offer: boolean;
        can_refund: boolean;
        hold_reason: string | null;
        wallet_entries: { id: number; reference: string; type: string; amount_cents: number; created_at: string }[];
    };
    allowed_actions?: string[];
    refund_method?: string | null;
    coins_refunded_cents?: number;
    cash_refunded_cents?: number;
    refund_offer?: {
        id: number;
        method: string;
        product_cents: number;
        shipping_cents: number;
        coin_restore_cents: number;
        cash_refund_cents: number;
        accepted_at: string | null;
    } | null;
    workflow_version?: number;
    evidence_count?: number;
    id: number;
    status: string;
    reason: string;
    decision_reason: string | null;
    responsibility: 'seller' | 'logistics' | 'buyer' | 'platform' | 'undetermined' | null;
    responsibility_reason: string | null;
    product_refund_cents?: number | null;
    shipping_refund_cents?: number | null;
    refund_cents?: number | null;
    refund_reference?: string | null;
    restocked: boolean;
    condition: string | null;
    pickup_address?: Location | null;
    events: { id: number; action: string; notes: string; created_at: string }[];
    seller_order: {
        id: number;
        subtotal: string;
        shipping_fee: string;
        store: { name: string };
        delivery: { tracking_reference: string | null };
        order: {
            shipping_recipient_name: string;
            shipping_phone: string;
            shipping_line1: string;
            shipping_barangay: string;
            shipping_city: string;
            shipping_province: string;
        };
        items: { id: number; product_name: string; product_image_url?: string | null; variant_name: string | null; quantity: number }[];
    };
};
