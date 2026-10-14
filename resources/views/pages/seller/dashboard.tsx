import WorkspaceDashboard, { type WorkspaceDashboardContent, type WorkspaceDashboardProps } from '@/components/workspace/dashboard';
import { ChartNoAxesCombined, Package, ShoppingBag } from 'lucide-react';

const content: WorkspaceDashboardContent = {
    title: 'Store overview',
    description: 'A clear view of your inventory, customer orders, and daily progress.',
    primary: 'Manage inventory',
    href: '/inventory',
    steps: ['Add products to your catalog', 'Prepare incoming orders', 'Mark parcels ready for pickup'],
    links: [
        { title: 'Inventory', text: 'Update products, prices, and stock.', href: '/inventory', icon: ShoppingBag },
        { title: 'Fulfillment', text: 'Prepare orders and reply to buyers.', href: '/orders', icon: Package },
        { title: 'Sales reports', text: 'View completed sales and commission.', href: '/reports', icon: ChartNoAxesCombined },
    ],
};

export default function SellerDashboard(props: WorkspaceDashboardProps) {
    return <WorkspaceDashboard {...props} role="seller" content={content} />;
}
