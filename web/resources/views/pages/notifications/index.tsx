import { Page } from '@/components/shared/marketplace-ui';
import { NotificationList } from '@/components/shared/notification-inbox';

export default function Notifications() {
    return (
        <Page title="Notifications" description="Order updates and tasks for your account.">
            <section aria-label="Your notifications" className="bg-card overflow-hidden rounded-2xl border">
                <NotificationList />
            </section>
        </Page>
    );
}
