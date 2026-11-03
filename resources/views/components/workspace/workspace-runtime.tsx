import { notify } from '@/components/shared/action-feedback';
import type { SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

type Status = { cartQuantity: number; queues: Record<string, number>; revisions: Record<string, string> };
const WorkspaceContext = createContext<Status | null>(null);
export const useWorkspaceStatus = () => useContext(WorkspaceContext);
const announcedStatuses = new Set<string>();
const rememberStatus = (key: string) => {
    announcedStatuses.add(key);
    if (announcedStatuses.size > 100) announcedStatuses.delete(announcedStatuses.values().next().value!);
};
const pageProps: Record<string, string[]> = {
    'marketplace/catalog': ['products', 'favoriteIds'],
    'marketplace/cart': ['items', 'addresses', 'shippingFee', 'logisticsPricing'],
    'marketplace/orders': ['orders', 'messages', 'reviews'],
    'marketplace/inventory': ['products', 'store'],
    'marketplace/deliveries': ['deliveries', 'available', 'riders', 'areas', 'cod'],
    'marketplace/reports': ['records', 'totals', 'adjustments'],
    'buyer/dashboard': ['stats', 'records'],
    'seller/dashboard': ['queues', 'productCount', 'completedProceeds', 'activeCount', 'recentOrders', 'store'],
    'rider/dashboard': ['queues', 'pendingCod', 'activeCount', 'recentParcels'],
    'logistics/dashboard': ['metrics', 'applications', 'recentParcels', 'centers', 'setupChecklist'],
    'logistics/parcels': ['deliveries', 'available', 'riders', 'areas', 'cod'],
    'logistics/scan': ['deliveries', 'available', 'riders', 'areas', 'cod'],
    'logistics/reports': ['records', 'totals', 'adjustments', 'metrics'],
    'seller/vouchers': ['vouchers'],
    'finance/returns': ['returns', 'eligible', 'riders'],
    'finance/settlements': ['parcels', 'totals', 'balances'],
    'finance/rider-payments': ['entries', 'work', 'riders', 'totals'],
    'finance/seller-costs': ['costs', 'totals'],
    'support/index': ['cases'],
    'support/show': ['case', 'messages'],
    'marketplace/product': ['product', 'reviews'],
    'logistics/riders/index': ['riders'],
    'logistics/rider-coverage': ['riders', 'assignments', 'centers'],
    'logistics/shipping-rates': ['rates', 'centers', 'pricingEnabled'],
    'management/registrations/index': ['applications'],
};
const relevantRevisions = (component: string): string[] => {
    if (component === 'marketplace/cart') return ['cart', 'catalog', 'addresses', 'shipping'];
    if (component === 'marketplace/catalog' || component === 'marketplace/product') return ['catalog', 'wishlist'];
    if (component === 'marketplace/inventory' || component === 'seller/vouchers') return ['catalog'];
    if (component.startsWith('support/')) return ['support'];
    if (component === 'finance/returns') return ['returns', 'orders', 'deliveries', 'coverage'];
    if (component.startsWith('finance/')) return ['finance', 'returns', 'orders', 'deliveries'];
    if (component.startsWith('management/') || component.startsWith('logistics/rider') || component === 'logistics/shipping-rates')
        return ['coverage', 'queues'];
    return ['orders', 'deliveries', 'queues', 'finance', 'returns', 'coverage'];
};

/** Visible, online tabs poll compact scoped data; only changed page data is reloaded. */
export function WorkspaceRuntime({ children }: { children: ReactNode }) {
    const page = usePage<SharedData>();
    const enabled =
        ['buyer', 'seller', 'rider', 'logistics'].includes(page.props.auth.user?.role ?? '') &&
        page.props.auth.user?.status === 'approved' &&
        !!page.props.auth.user?.email_verified_at;
    const [status, setStatus] = useState<Status | null>(null);
    const currentPage = useRef(page);
    currentPage.current = page;
    useEffect(() => {
        if (!enabled) return;
        let active = true;
        let previous: Status | null = null;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let controller: AbortController | null = null;
        let delay = 4000;
        let visiting = false;
        let method = 'get';
        let retryRefresh = false;
        let pollAgain = false;
        const initial = currentPage.current.props.status;
        const initialKey = `${currentPage.current.props.auth.user.id}:${currentPage.current.url}:${initial}`;
        if (initial && !announcedStatuses.has(initialKey)) {
            rememberStatus(initialKey);
            notify(initial);
        }
        const refreshPage = () => {
            if (visiting || document.querySelector('[role="dialog"]')) {
                retryRefresh = true;
                return;
            }
            const keys = pageProps[currentPage.current.component]?.filter((key) => key in currentPage.current.props) ?? [];
            if (keys.length) {
                retryRefresh = false;
                router.reload({ only: keys });
            }
        };
        const poll = async () => {
            clearTimeout(timer);
            if (!active) return;
            if (controller) {
                pollAgain = true;
                return;
            }
            if (document.hidden || !navigator.onLine) {
                timer = setTimeout(poll, 4000);
                return;
            }
            controller = new AbortController();
            try {
                const response = await fetch('/workspace/status', {
                    headers: { Accept: 'application/json' },
                    cache: 'no-store',
                    signal: controller.signal,
                });
                if (response.redirected || [401, 403, 409, 419].includes(response.status)) {
                    active = false;
                    return;
                }
                if (!response.ok) {
                    delay =
                        response.status === 429
                            ? Math.max(5000, Number(response.headers.get('Retry-After') ?? 30) * 1000)
                            : Math.min(delay * 2, 60000);
                    return;
                }
                const next = (await response.json()) as Status;
                if (!active) return;
                setStatus(next);
                const changed =
                    previous && relevantRevisions(currentPage.current.component).some((key) => previous!.revisions[key] !== next.revisions[key]);
                previous = next;
                delay = 4000;
                if (changed || retryRefresh) refreshPage();
            } catch {
                delay = Math.min(delay * 2, 60000);
            } finally {
                controller = null;
                if (active) timer = setTimeout(poll, pollAgain ? 0 : delay);
                pollAgain = false;
            }
        };
        const resume = () => {
            if (!document.hidden && navigator.onLine) void poll();
        };
        const stopStart = router.on('start', (event) => {
            visiting = true;
            method = event.detail.visit.method;
        });
        const stopFinish = router.on('finish', () => {
            visiting = false;
            void poll();
        });
        const stopSuccess = router.on('success', (event) => {
            if (method !== 'get') {
                const message = typeof event.detail.page.props.status === 'string' ? event.detail.page.props.status : 'Changes saved.';
                rememberStatus(`${currentPage.current.props.auth.user.id}:${event.detail.page.url}:${message}`);
                notify(message);
            }
        });
        const stopError = router.on('error', (event) => {
            if (method !== 'get') notify(Object.values(event.detail.errors).flat().join(' ') || 'Please check the highlighted fields.', 'error');
        });
        document.addEventListener('visibilitychange', resume);
        window.addEventListener('online', resume);
        window.addEventListener('focus', resume);
        void poll();
        return () => {
            active = false;
            clearTimeout(timer);
            controller?.abort();
            stopStart();
            stopFinish();
            stopSuccess();
            stopError();
            document.removeEventListener('visibilitychange', resume);
            window.removeEventListener('online', resume);
            window.removeEventListener('focus', resume);
        };
    }, [enabled, page.props.auth.user?.id]);
    return <WorkspaceContext.Provider value={status}>{children}</WorkspaceContext.Provider>;
}
