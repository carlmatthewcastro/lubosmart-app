import { AccountHistory } from '@/components/shared/account-history';
import Account from '@/pages/admin/account';
import { useState, type ComponentProps } from 'react';

export function SavedAccountDetails({ details, initialSection }: { details: ComponentProps<typeof Account>; initialSection: string }) {
    const [section, setSection] = useState(initialSection === 'Activity history' ? 'Activity history' : 'Personal information');
    return (
        <div className="min-w-0 p-5 sm:p-6">
            <p className="text-muted-foreground mb-4 text-sm">No registration application is available. Only saved account information is shown.</p>
            <nav aria-label="Account details sections" className="mb-4 flex gap-2 overflow-x-auto">
                {['Personal information', 'Activity history'].map((label) => (
                    <button
                        key={label}
                        type="button"
                        aria-pressed={section === label}
                        onClick={() => setSection(label)}
                        className={`focus-visible:ring-ring min-h-11 shrink-0 rounded-xl px-3 text-sm font-medium focus-visible:ring-2 ${section === label ? 'bg-accent text-primary' : 'hover:bg-muted'}`}
                    >
                        {label}
                    </button>
                ))}
            </nav>
            <section aria-label={section}>
                {section === 'Activity history' ? (
                    <>
                        <h2 className="font-semibold">Activity history</h2>
                        <AccountHistory history={details.history} />
                    </>
                ) : (
                    <Account {...details} embedded verificationOnly />
                )}
            </section>
        </div>
    );
}
