import { useAuthRequestFeedback } from '@/hooks/use-auth-request-feedback';
import { router } from '@inertiajs/react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type Tone = 'error' | 'warning' | 'success';
export const AuthNotificationContext = createContext<((key: string, message?: string, tone?: Tone) => void) | null>(null);

export default function AuthNotificationProvider({ children }: { children: ReactNode }) {
    const [processing, setProcessing] = useState(false);
    const { requestError, setRequestError } = useAuthRequestFeedback(processing);
    useEffect(() => {
        const start = router.on('start', () => {
            setRequestError('');
            setProcessing(true);
        });
        const finish = router.on('finish', () => setProcessing(false));
        return () => {
            start();
            finish();
        };
    }, [setRequestError]);
    const messages = useRef(new Map<string, { message: string; tone: Tone }>());
    const [message, setMessage] = useState('');
    const [tone, setTone] = useState<Tone>('error');
    const pending = useRef(false);
    const report = useCallback((key: string, value?: string, tone: Tone = 'error') => {
        if (value) messages.current.set(key, { message: value, tone });
        else messages.current.delete(key);
        if (pending.current) return;
        pending.current = true;
        queueMicrotask(() => {
            pending.current = false;
            const entries = [...messages.current.values()];
            const errors = entries.filter((entry) => entry.tone !== 'success');
            const active = errors.length ? errors : entries;
            const text = [...new Set(active.map((entry) => entry.message))].join(' ');
            if (text) {
                setMessage(text);
                setTone(active[0].tone);
            }
        });
    }, []);
    useEffect(() => {
        report('request-error', requestError);
    }, [report, requestError]);
    useEffect(
        () => () => {
            messages.current.clear();
        },
        [],
    );
    return (
        <AuthNotificationContext.Provider value={report}>
            {children}
            {message && (
                <div
                    role={tone === 'success' ? 'status' : 'alert'}
                    aria-atomic="true"
                    className={`fixed top-8 right-4 left-4 z-50 flex max-h-[40dvh] items-start gap-3 overflow-y-auto rounded-xl border p-4 shadow-lg ${tone === 'error' ? 'border-destructive/30 bg-card text-destructive' : 'bg-card text-card-foreground'}`}
                >
                    {tone === 'success' ? (
                        <CircleCheck aria-hidden="true" className="text-success mt-0.5 size-5 shrink-0" />
                    ) : (
                        <CircleAlert aria-hidden="true" className="text-destructive mt-0.5 size-5 shrink-0" />
                    )}
                    <p className="min-w-0 flex-1 text-sm leading-relaxed [overflow-wrap:anywhere]">{message}</p>
                    <button
                        type="button"
                        aria-label="Dismiss notification"
                        className={`focus-visible:outline-ring -m-2 flex size-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 ${tone === 'error' ? 'hover:bg-destructive/10' : 'hover:bg-accent'}`}
                        onClick={() => setMessage('')}
                    >
                        <X aria-hidden="true" className="size-4" />
                    </button>
                </div>
            )}
        </AuthNotificationContext.Provider>
    );
}
