import AuthFeedback from '@/components/auth/auth-feedback';
import { useConfirmAction } from '@/components/shared/action-feedback';
import { type ComponentProps, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type Feedback = { control: Control; container: HTMLDivElement; id: string; message: string; previousInvalid: string | null };

/** Keep native constraints, but present their feedback like registration. */
export default function ValidatedForm({
    onSubmit,
    onInput,
    onInvalid,
    children,
    confirmation,
    ...props
}: ComponentProps<'form'> & { confirmation?: { title: string; description: string; confirmLabel?: string; destructive?: boolean } }) {
    const confirm = useConfirmAction();
    const confirmed = useRef(false);
    const waiting = useRef(false);
    const prefix = useId();
    const feedback = useRef(new Map<Control, Feedback>());
    const [messages, setMessages] = useState<Feedback[]>([]);
    const publish = () => setMessages([...feedback.current.values()]);
    const clear = (control: Control) => {
        const entry = feedback.current.get(control);
        if (!entry) return;
        const describedBy = control
            .getAttribute('aria-describedby')
            ?.split(/\s+/)
            .filter((id) => id !== entry.id)
            .join(' ');
        if (describedBy) control.setAttribute('aria-describedby', describedBy);
        else control.removeAttribute('aria-describedby');
        control.removeAttribute('data-client-invalid');
        if (entry.previousInvalid !== null) control.setAttribute('aria-invalid', entry.previousInvalid);
        else control.removeAttribute('aria-invalid');
        entry.message = '';
    };

    useEffect(() => {
        const entries = feedback.current;
        return () => {
            entries.forEach(({ container }) => container.remove());
            entries.clear();
        };
    }, []);

    return (
        <form
            {...props}
            noValidate
            onInvalid={(event) => {
                event.preventDefault();
                const control = event.target as Control;
                let entry = feedback.current.get(control);
                if (!entry) {
                    const container = document.createElement('div');
                    control.insertAdjacentElement('afterend', container);
                    entry = {
                        control,
                        container,
                        id: `${prefix}-${feedback.current.size}-error`,
                        message: '',
                        previousInvalid: control.getAttribute('aria-invalid'),
                    };
                    feedback.current.set(control, entry);
                }
                entry.message = control.validity.valueMissing ? 'This field is required.' : control.validationMessage;
                control.setAttribute('aria-invalid', 'true');
                control.setAttribute('data-client-invalid', 'true');
                const ids = new Set(control.getAttribute('aria-describedby')?.split(/\s+/).filter(Boolean));
                ids.add(entry.id);
                control.setAttribute('aria-describedby', [...ids].join(' '));
                publish();
                onInvalid?.(event);
            }}
            onInput={(event) => {
                const control = event.target as Control;
                if (feedback.current.get(control)?.message) {
                    if (!control.willValidate || control.validity.valid) clear(control);
                    else
                        feedback.current.get(control)!.message = control.validity.valueMissing
                            ? 'This field is required.'
                            : control.validationMessage;
                    publish();
                }
                onInput?.(event);
            }}
            onSubmit={(event) => {
                feedback.current.forEach(({ control }) => {
                    if (!control.willValidate || control.validity.valid) clear(control);
                });
                if (!event.currentTarget.checkValidity()) {
                    event.preventDefault();
                    event.currentTarget.querySelector<Control>(':invalid')?.focus();
                    publish();
                    return;
                }
                publish();
                if (confirmation && !confirmed.current) {
                    event.preventDefault();
                    if (waiting.current) return;
                    waiting.current = true;
                    const element = event.currentTarget;
                    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
                    void confirm(confirmation).then((accepted) => {
                        waiting.current = false;
                        if (!accepted || !element.isConnected || submitter?.disabled) return;
                        confirmed.current = true;
                        element.requestSubmit(submitter?.isConnected ? submitter : undefined);
                        confirmed.current = false;
                    });
                    return;
                }
                onSubmit?.(event);
            }}
        >
            {children}
            {messages.map(({ container, id, message }) => createPortal(<AuthFeedback id={id} message={message} reserveSpace />, container, id))}
        </form>
    );
}
