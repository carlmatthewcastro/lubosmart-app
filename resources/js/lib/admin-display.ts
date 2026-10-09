export function titleCase(value: string): string {
    return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
export function activitySubject(type: string): string {
    const labels: Record<string, string> = {
        registration_application: 'Registration Application',
        user: 'User Account',
        product: 'Product Listing',
        support_case: 'Conversation',
        commerce_settings: 'Platform Rates',
        platform_content: 'Platform Content',
    };
    return labels[type] ?? titleCase(type);
}
export function activityAction(action: string): string {
    const labels: Record<string, string> = {
        hide: 'Blocked',
        warn: 'Warning Issued',
        restore: 'Restored',
        suspend: 'Suspended',
        in_review: 'In Review',
        open: 'Opened',
        reactivated: 'Reactivated',
    };
    return labels[action] ?? titleCase(action);
}
export function activityDate(value: string): string {
    return new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function activityDescription(action: string, actor: string): string {
    const verbs: Record<string, string> = {
        warn: 'Warning issued',
        hide: 'Listing blocked',
        restore: 'Listing restored',
        suspend: 'Seller suspended',
        in_review: 'Marked for review',
    };
    return (verbs[action] ?? activityAction(action)) + ' by ' + actor;
}
