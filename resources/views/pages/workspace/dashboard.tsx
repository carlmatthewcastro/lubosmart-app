import WorkspaceDashboard, { type WorkspaceDashboardContent, type WorkspaceDashboardProps } from '@/components/workspace/dashboard';
import BuyerDashboard from '@/pages/buyer/dashboard';
import { ChartNoAxesCombined, ClipboardCheck, Truck } from 'lucide-react';

// Logistics requests use logistics/dashboard. Keep the legacy fallback for this page.
const logisticsCenterContent: WorkspaceDashboardContent = {
    title: 'Center overview',
    description: 'Move every parcel forward with a clear, organized dispatch workflow.',
    primary: 'Open parcel operations',
    href: '/deliveries',
    steps: ['Receive ready seller parcels', 'Assign an approved rider', 'Receive collected cash'],
    links: [
        { title: 'Parcel operations', text: 'Receive, assign, and monitor deliveries.', href: '/deliveries', icon: Truck },
        { title: 'Rider applications', text: 'Review riders joining your center.', href: '/reviews', icon: ClipboardCheck },
        { title: 'Center reports', text: 'Follow completed parcels and sales.', href: '/reports', icon: ChartNoAxesCombined },
    ],
};

// Seller, Rider, and Logistics requests render their dedicated dashboards.
export default function Dashboard(props: WorkspaceDashboardProps) {
    switch (props.role) {
        case 'buyer':
            return <BuyerDashboard {...props} />;
        case 'logistics':
            return <WorkspaceDashboard {...props} content={logisticsCenterContent} />;
    }
}
