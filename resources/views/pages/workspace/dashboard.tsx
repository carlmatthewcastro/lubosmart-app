import WorkspaceDashboard, { type WorkspaceDashboardContent, type WorkspaceDashboardProps } from '@/components/workspace/dashboard';
import BuyerDashboard from '@/pages/buyer/dashboard';
import CourierDashboard from '@/pages/courier/dashboard';
import SellerDashboard from '@/pages/seller/dashboard';
import { ChartNoAxesCombined, ClipboardCheck, Truck } from 'lucide-react';

// Sorting Center requests use logistics/dashboard. Keep the legacy fallback for this page.
const sortingCenterContent: WorkspaceDashboardContent = {
    title: 'Center overview',
    description: 'Move every parcel forward with a clear, organized dispatch workflow.',
    primary: 'Open parcel operations',
    href: '/deliveries',
    steps: ['Receive ready seller parcels', 'Assign an approved courier', 'Receive collected cash'],
    links: [
        { title: 'Parcel operations', text: 'Receive, assign, and monitor deliveries.', href: '/deliveries', icon: Truck },
        { title: 'Courier applications', text: 'Review couriers joining your center.', href: '/reviews', icon: ClipboardCheck },
        { title: 'Center reports', text: 'Follow completed parcels and sales.', href: '/reports', icon: ChartNoAxesCombined },
    ],
};

// Laravel keeps rendering workspace/dashboard for these roles; URLs and page props stay the same.
export default function Dashboard(props: WorkspaceDashboardProps) {
    switch (props.role) {
        case 'buyer':
            return <BuyerDashboard {...props} />;
        case 'seller':
            return <SellerDashboard {...props} />;
        case 'courier':
            return <CourierDashboard {...props} />;
        case 'sorting_center':
            return <WorkspaceDashboard {...props} content={sortingCenterContent} />;
    }
}
