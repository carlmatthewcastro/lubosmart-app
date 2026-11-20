import ValidatedForm from '@/components/shared/validated-form';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { type ComponentProps, useEffect, useRef, useState } from 'react';

/** Automatic GET filters only. Never use this for mutations or custody actions. */
export default function AutoFilterForm({
    children,
    processing = false,
    cancel,
    onSubmit,
    className,
    ...props
}: ComponentProps<typeof ValidatedForm> & { processing?: boolean; cancel: () => void }) {
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const composing = useRef(false);
    const [waiting, setWaiting] = useState(false);
    const clear = () => clearTimeout(timer.current);

    useEffect(() => {
        // A pending search must not pull the user back after pagination/navigation.
        const remove = router.on('before', () => {
            clear();
            setWaiting(false);
        });
        return () => {
            clear();
            remove();
        };
    }, []);

    const schedule = (form: HTMLFormElement, control: EventTarget) => {
        clear();
        cancel();
        if (composing.current) return;
        const immediate = control instanceof HTMLSelectElement || (control instanceof HTMLInputElement && control.type === 'date');
        setWaiting(true);
        // Wait for controlled field state to render before submitting its latest values.
        timer.current = setTimeout(
            () => {
                setWaiting(false);
                if (form.isConnected) form.requestSubmit();
            },
            immediate ? 0 : 350,
        );
    };

    return (
        <ValidatedForm
            {...props}
            className={cn('relative', className)}
            aria-busy={processing || waiting}
            onChange={(event) => schedule(event.currentTarget, event.target)}
            onCompositionStart={() => {
                composing.current = true;
                clear();
                cancel();
            }}
            onCompositionEnd={(event) => {
                composing.current = false;
                schedule(event.currentTarget, event.target);
            }}
            onSubmit={(event) => {
                clear();
                setWaiting(false);
                onSubmit?.(event);
            }}
        >
            {children}
            <button type="submit" className="sr-only" tabIndex={-1}>
                Update results
            </button>
            <p
                className={processing || waiting ? 'text-muted-foreground pointer-events-none absolute right-0 -bottom-4 text-xs' : 'sr-only'}
                role="status"
                aria-live="polite"
                aria-atomic="true"
            >
                {processing || waiting ? 'Updating results…' : ''}
            </p>
        </ValidatedForm>
    );
}
