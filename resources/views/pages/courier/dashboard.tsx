import WorkspaceDashboard, { type WorkspaceDashboardContent, type WorkspaceDashboardProps } from '@/components/workspace/dashboard';
import { ChartNoAxesCombined, Truck } from 'lucide-react';

const content: WorkspaceDashboardContent = {
    title: 'Ready for your next delivery',
    description: 'Your assigned parcels, delivery details, and COD responsibilities in one place.',
    primary: 'View my deliveries',
    href: '/deliveries',
    steps: ['Confirm parcel pickup', 'Start your delivery route', 'Upload proof & collect COD'],
    links: [
        { title: 'My deliveries', text: 'Pick up, deliver, and record proof.', href: '/deliveries', icon: Truck },
        { title: 'Delivery history', text: 'Review your completed parcels.', href: '/reports', icon: ChartNoAxesCombined },
    ],
};

export default function CourierDashboard(props: WorkspaceDashboardProps) {
    return <WorkspaceDashboard {...props} role="courier" content={content} />;
}
