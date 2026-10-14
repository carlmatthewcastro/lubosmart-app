import WorkspaceDashboard, { type WorkspaceDashboardContent, type WorkspaceDashboardProps } from '@/components/workspace/dashboard';
import { Package, ShoppingBag } from 'lucide-react';

const content: WorkspaceDashboardContent = {
    title: 'Your shopping space',
    description: 'Little finds. Local favorites. Everything you need, closer to home.',
    primary: 'Discover products',
    href: '/shop',
    steps: ['Discover something you love', 'Choose an address & check out', 'Track your delivery'],
    links: [
        { title: 'Shopping bag', text: 'Review items and place a COD order.', href: '/cart', icon: ShoppingBag },
        { title: 'Your orders', text: 'Follow parcels and message your sellers.', href: '/orders', icon: Package },
    ],
};

export default function BuyerDashboard(props: WorkspaceDashboardProps) {
    return <WorkspaceDashboard {...props} role="buyer" content={content} />;
}
