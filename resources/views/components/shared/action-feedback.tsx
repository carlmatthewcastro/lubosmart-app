import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

type Confirmation = { title: string; description: string; confirmLabel?: string; destructive?: boolean };
type Toast = { id: number; message: string; tone: 'success' | 'error' };
const ConfirmContext = createContext<(options: Confirmation) => Promise<boolean>>(async () => false);
export const useConfirmAction = () => useContext(ConfirmContext);

export function notify(message: string, tone: Toast['tone'] = 'success') {
    queueMicrotask(() => window.dispatchEvent(new CustomEvent('workspace:toast', { detail: { message, tone } })));
}

/** One host survives Inertia visits, so confirmation focus and feedback stay consistent. */
export function ActionFeedbackProvider({ children }: { children: ReactNode }) {
    const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
    const pending = useRef<((accepted: boolean) => void) | null>(null);
    const trigger = useRef<HTMLElement | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(0);
    useEffect(() => {
        const timers = new Set<ReturnType<typeof setTimeout>>();
        const receive = (event: Event) => {
            const detail = (event as CustomEvent<Omit<Toast, 'id'>>).detail;
            const id = ++nextId.current;
            setToasts((current) => [...current.slice(-2), { ...detail, id }]);
            const timer = setTimeout(
                () => {
                    setToasts((current) => current.filter((toast) => toast.id !== id));
                    timers.delete(timer);
                },
                detail.tone === 'error' ? 10000 : 6000,
            );
            timers.add(timer);
        };
        window.addEventListener('workspace:toast', receive);
        return () => {
            window.removeEventListener('workspace:toast', receive);
            timers.forEach(clearTimeout);
            pending.current?.(false);
        };
    }, []);
    const settle = (accepted: boolean) => {
        const resolve = pending.current;
        pending.current = null;
        setConfirmation(null);
        resolve?.(accepted);
    };
    return (
        <ConfirmContext.Provider
            value={(options) => {
                if (pending.current) return Promise.resolve(false);
                trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                setConfirmation(options);
                return new Promise<boolean>((resolve) => {
                    pending.current = resolve;
                });
            }}
        >
            {children}
            <Dialog
                open={!!confirmation}
                onOpenChange={(open) => {
                    if (!open) settle(false);
                }}
            >
                <DialogContent
                    className="print:hidden"
                    overlayClassName="print:hidden"
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        trigger.current?.focus();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>{confirmation?.title}</DialogTitle>
                        <DialogDescription className="whitespace-pre-line">{confirmation?.description}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => settle(false)}>
                            Go back
                        </Button>
                        <Button variant={confirmation?.destructive ? 'destructive' : 'default'} onClick={() => settle(true)}>
                            {confirmation?.confirmLabel ?? 'Confirm action'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div
                aria-label="Action notifications"
                className="pointer-events-none fixed right-4 bottom-4 left-4 z-40 flex flex-col gap-3 sm:left-auto sm:w-96 print:hidden"
            >
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        role={toast.tone === 'error' ? 'alert' : 'status'}
                        className="bg-card text-card-foreground pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-lg"
                    >
                        {toast.tone === 'error' ? (
                            <CircleAlert aria-hidden className="text-destructive size-5 shrink-0" />
                        ) : (
                            <CircleCheck aria-hidden className="text-success size-5 shrink-0" />
                        )}
                        <p className="min-w-0 flex-1 text-sm leading-relaxed break-words">{toast.message}</p>
                        <button
                            type="button"
                            aria-label="Dismiss notification"
                            className="hover:bg-accent -m-2 flex size-11 shrink-0 items-center justify-center rounded-xl"
                            onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
                        >
                            <X aria-hidden className="size-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ConfirmContext.Provider>
    );
}
