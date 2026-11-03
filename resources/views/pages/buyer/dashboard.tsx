import WorkspaceDashboard, { type WorkspaceDashboardContent, type WorkspaceDashboardProps } from '@/components/workspace/dashboard';
import { Heart, MapPin, MessageCircle, Package, ShoppingBag } from 'lucide-react';

const content: WorkspaceDashboardContent = {
    title: 'Your shopping space',
    description: 'Little finds. Local favorites. Everything you need, closer to home.',
    primary: 'Discover products',
    href: '/shop',
    steps: ['Discover something you love', 'Choose an address & check out', 'Track your delivery'],
    links: [
        { title: 'Shopping bag', text: 'Review items and place a COD order.', href: '/cart', icon: ShoppingBag },
        { title: 'Your orders', text: 'Follow parcels and message your sellers.', href: '/orders', icon: Package },
        { title: 'Saved products', text: 'Return to products in your wishlist.', href: '/wishlist', icon: Heart },
        { title: 'Delivery addresses', text: 'Manage your saved recipients and addresses.', href: '/settings/addresses', icon: MapPin },
        { title: 'Delivery issues', text: 'Check parcels that need follow-up.', href: '/orders?stage=issues', icon: Package },
        { title: 'Help and complaints', text: 'Contact support about an order or delivery.', href: '/support', icon: MessageCircle },
    ],
};

export default function BuyerDashboard(props: WorkspaceDashboardProps) {
    return <WorkspaceDashboard {...props} role="buyer" content={content} />;
}
