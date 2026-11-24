import { Button } from '@/components/ui/button';
import AccountAccessLayout from '@/layouts/auth/account-access-layout';
import { router } from '@inertiajs/react';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

export default function AccountBlocked({ message }: { message: string }) {
    const [checking, setChecking] = useState(false);
    return (
        <AccountAccessLayout
            title="Account access unavailable"
            description={message}
            registering
            verification
            accountBlocked
            beforeHeading={
                <div className="bg-destructive/10 text-destructive mb-5 flex size-12 items-center justify-center rounded-2xl">
                    <ShieldAlert aria-hidden="true" className="size-6" />
                </div>
            }
        >
            <section aria-labelledby="access-next-steps" className="bg-muted/50 rounded-xl border p-4">
                <h2 id="access-next-steps" className="text-sm font-semibold">
                    What to do next
                </h2>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                    Contact LubosMart support for help reviewing this restriction. If you are a rider, ask your logistics company to check its
                    approval and account status.
                </p>
            </section>
            <Button
                className="mt-5 w-full"
                disabled={checking}
                onClick={() => router.reload({ onStart: () => setChecking(true), onFinish: () => setChecking(false) })}
            >
                <RefreshCw aria-hidden="true" className={checking ? 'motion-safe:animate-spin' : ''} />
                {checking ? 'Checking access…' : 'Check access again'}
            </Button>
            <p role="status" className="sr-only">
                {checking ? 'Checking your account access.' : ''}
            </p>
        </AccountAccessLayout>
    );
}
