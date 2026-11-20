import InputError from '@/components/auth/input-error';
import { buttonClass, Field, inputClass, roleLabel, secondaryClass, Select } from '@/components/shared/marketplace-ui';
import ValidatedForm from '@/components/shared/validated-form';
import { fulfillmentConcerns } from '@/components/support/fulfillment-concerns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check, MessageSquare, Package, Paperclip, SendHorizontal, UsersRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
type Recipient = { id: number; name: string; email: string; role: string };
type Options = { recipients: Recipient[]; orders: { id: number; label: string }[] };
const topics = [
    { title: 'Registration Requirements', kind: 'message', hint: 'Specify the missing document, the correction needed, and how to resubmit.' },
    { title: 'Seller Compliance', kind: 'message', hint: 'Include the listing name, the policy involved, and the action needed.' },
    { title: 'Order or Delivery Follow-up', kind: 'message', hint: 'Describe the delivery concern and the update you need from the recipient.' },
    { title: 'Payment or Commission Concern', kind: 'complaint', hint: 'Include the order reference, amount in question, and expected outcome.' },
    { title: 'Product Complaint', kind: 'complaint', hint: 'Describe the product issue and attach photos or other supporting evidence.' },
    { title: 'Delivery Dispute', kind: 'complaint', hint: 'Describe what happened, the delivery date, and the requested resolution.' },
    {
        title: 'Fulfillment protection concern',
        kind: 'complaint',
        hint: 'Describe what you observed, the related parcel, and the evidence Admin should review. A report is an allegation, not a confirmed violation.',
    },
    { title: 'Account Assistance', kind: 'message', hint: 'Explain the account concern and the next step the recipient should take.' },
];
export function NewConversation({
    open,
    onOpenChange,
    admin,
    kind,
}: {
    open: boolean;
    onOpenChange: (value: boolean) => void;
    admin: boolean;
    kind?: string;
}) {
    const { auth } = usePage<SharedData>().props;
    const logistics = auth.user.role === 'logistics';
    const availableTopics = logistics
        ? topics.filter((topic) =>
              [
                  'Registration Requirements',
                  'Order or Delivery Follow-up',
                  'Delivery Dispute',
                  'Fulfillment protection concern',
                  'Account Assistance',
              ].includes(topic.title),
          )
        : topics;
    const [step, setStep] = useState(admin ? 'recipient' : 'message');
    const stepHeading = useRef<HTMLHeadingElement>(null);
    const [audience, setAudience] = useState('account');
    const [query, setQuery] = useState('');
    const [role, setRole] = useState('');
    const [options, setOptions] = useState<Options | null>(null);
    const [error, setError] = useState('');
    const form = useForm({
        kind: kind ?? 'message',
        _modal: true,
        subject: '',
        body: '',
        recipient_email: '',
        seller_order_id: '',
        fulfillment_concern: '',
        attachment: null as File | null,
    });
    useEffect(() => {
        if (!open || !admin) return;
        const controller = new AbortController();
        const timer = setTimeout(
            () =>
                fetch(
                    (logistics ? '/logistics/conversation-options' : '/admin/conversation-options') +
                        '?search=' +
                        encodeURIComponent(query) +
                        '&role=' +
                        role,
                    {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    },
                )
                    .then(async (response) => {
                        if (!response.ok) throw Error('Could not load recipients. Try again.');
                        return response.json();
                    })
                    .then((data) => {
                        if (!controller.signal.aborted) {
                            setOptions(data);
                            setError('');
                        }
                    })
                    .catch((reason) => {
                        if (!controller.signal.aborted) setError(reason.message);
                    }),
            250,
        );
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [open, admin, query, role, logistics, audience]);
    const topic = topics.find((topic) => topic.title === form.data.subject);
    const close = (value: boolean) => {
        if (form.processing) return;
        onOpenChange(value);
        if (!value) {
            form.reset();
            form.clearErrors();
            setQuery('');
            setRole('');
            setOptions(null);
            setAudience('account');
            setStep(admin ? 'recipient' : 'message');
            setError('');
        }
    };

    const recipient = options?.recipients.find((person) => person.email === form.data.recipient_email);
    const parcel = options?.orders.find((order) => String(order.id) === String(form.data.seller_order_id));
    const hasRecipient = !!(form.data.recipient_email || form.data.seller_order_id);
    const changeStep = (value: string) => {
        setStep(value);
        requestAnimationFrame(() => stepHeading.current?.focus());
    };
    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="bg-card max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden !p-0 sm:max-w-xl">
                <DialogHeader className="border-border/60 border-b px-5 py-5 pr-16 sm:px-6">
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-2xl">
                            <MessageSquare aria-hidden="true" className="size-5" />
                        </span>
                        {admin ? 'New conversation' : 'Contact support'}
                    </DialogTitle>
                    <DialogDescription className="leading-relaxed">
                        {admin ? 'A quick message. A clearer next step.' : 'Tell us how we can help.'}
                    </DialogDescription>
                </DialogHeader>
                <ValidatedForm
                    className="flex min-h-0 flex-col"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (form.processing) return;
                        if (admin && step === 'recipient') {
                            if (hasRecipient) changeStep('message');
                            return;
                        }
                        if (!form.data.subject || !form.data.body.trim() || (admin && !hasRecipient)) return;
                        form.post('/support', {
                            forceFormData: true,
                            onSuccess: () => {
                                form.reset();
                                setQuery('');
                                setRole('');
                                setOptions(null);
                                setAudience('account');
                                setError('');
                                setStep(admin ? 'recipient' : 'message');
                                onOpenChange(false);
                            },
                        });
                    }}
                >
                    <div className="grid min-h-0 flex-1 content-start gap-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
                        {admin && (
                            <ol aria-label="Conversation steps" className="flex items-center gap-3 text-xs font-medium">
                                <li aria-current={step === 'recipient' ? 'step' : undefined} className="text-primary flex items-center gap-2">
                                    <span className="bg-primary/10 flex size-6 items-center justify-center rounded-full">
                                        {step === 'message' ? <Check aria-hidden="true" className="size-3.5" /> : '1'}
                                    </span>
                                    Recipient
                                </li>
                                <li aria-hidden="true" className="bg-border h-px flex-1" />
                                <li
                                    aria-current={step === 'message' ? 'step' : undefined}
                                    className={cn('flex items-center gap-2', step === 'message' ? 'text-primary' : 'text-muted-foreground')}
                                >
                                    <span
                                        className={cn(
                                            'flex size-6 items-center justify-center rounded-full',
                                            step === 'message' ? 'bg-primary/10' : 'bg-muted',
                                        )}
                                    >
                                        2
                                    </span>
                                    Message
                                </li>
                            </ol>
                        )}
                        {admin && step === 'recipient' ? (
                            <section className="grid gap-5" aria-labelledby="recipient-heading">
                                <div>
                                    <h2 ref={stepHeading} id="recipient-heading" tabIndex={-1} className="text-lg font-semibold outline-none">
                                        Who would you like to contact?
                                    </h2>
                                    <p className="text-muted-foreground mt-1 text-sm">Choose an account or everyone involved in a parcel.</p>
                                </div>
                                <div className="bg-muted/60 grid grid-cols-2 gap-1 rounded-xl p-1">
                                    {[
                                        ['account', 'Contact an Account'],
                                        ['order', 'Order Participants'],
                                    ].map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            aria-pressed={audience === value}
                                            className={cn(
                                                'focus-visible:ring-ring flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:text-sm',
                                                audience === value ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
                                            )}
                                            onClick={() => {
                                                if (audience === value) return;
                                                setAudience(value);
                                                setQuery('');
                                                setRole('');
                                                setOptions(null);
                                                form.setData('recipient_email', '');
                                                form.setData('seller_order_id', '');
                                            }}
                                        >
                                            {value === 'account' ? (
                                                <UsersRound aria-hidden="true" className="hidden size-4 shrink-0 sm:block" />
                                            ) : (
                                                <Package aria-hidden="true" className="hidden size-4 shrink-0 sm:block" />
                                            )}
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <div className={cn('grid gap-4', audience === 'account' && 'sm:grid-cols-[minmax(0,1fr)_160px]')}>
                                    <Field
                                        reserveFeedback={false}
                                        label={audience === 'account' ? 'Find a recipient' : 'Find a parcel'}
                                        type="search"
                                        maxLength={100}
                                        placeholder={audience === 'account' ? 'Search name or email' : 'Buyer, store or parcel number'}
                                        value={query}
                                        onChange={(event) => {
                                            setQuery(event.target.value);
                                            form.setData('recipient_email', '');
                                            form.setData('seller_order_id', '');
                                            setOptions(null);
                                        }}
                                    />
                                    {audience === 'account' && (
                                        <Select
                                            reserveFeedback={false}
                                            label="Account role"
                                            value={role}
                                            onChange={(event) => {
                                                setRole(event.target.value);
                                                form.setData('recipient_email', '');
                                                setOptions(null);
                                            }}
                                        >
                                            <option value="">All roles</option>
                                            {(logistics ? ['admin', 'buyer', 'seller', 'rider'] : ['buyer', 'seller', 'rider', 'logistics']).map(
                                                (value) => (
                                                    <option key={value} value={value}>
                                                        {roleLabel(value)}
                                                    </option>
                                                ),
                                            )}
                                        </Select>
                                    )}
                                </div>
                                {error ? (
                                    <p role="alert" className="text-destructive text-sm">
                                        {error}
                                    </p>
                                ) : !options ? (
                                    <p role="status" className="text-muted-foreground py-3 text-sm">
                                        Loading options...
                                    </p>
                                ) : audience === 'account' ? (
                                    <Select
                                        reserveFeedback={false}
                                        label="Recipient"
                                        required
                                        value={form.data.recipient_email}
                                        onChange={(event) => form.setData('recipient_email', event.target.value)}
                                        error={form.errors.recipient_email}
                                    >
                                        <option value="">Choose an account</option>
                                        {options.recipients.map((person) => (
                                            <option key={person.id} value={person.email}>
                                                {person.name} / {roleLabel(person.role)}
                                            </option>
                                        ))}
                                    </Select>
                                ) : (
                                    <Select
                                        reserveFeedback={false}
                                        label="Parcel"
                                        required
                                        value={form.data.seller_order_id}
                                        onChange={(event) => form.setData('seller_order_id', event.target.value)}
                                        error={form.errors.seller_order_id}
                                    >
                                        <option value="">Choose a parcel</option>
                                        {options.orders.map((order) => (
                                            <option key={order.id} value={order.id}>
                                                {order.label}
                                            </option>
                                        ))}
                                    </Select>
                                )}
                                <p className="text-muted-foreground text-xs leading-relaxed">
                                    {options && !(audience === 'account' ? options.recipients : options.orders).length
                                        ? 'No matches. Try another search or account role.'
                                        : audience === 'account'
                                          ? 'Only accounts you are authorized to contact appear here.'
                                          : 'Your message will include the authorized participants of this parcel.'}
                                </p>
                            </section>
                        ) : (
                            <section className="grid gap-5" aria-labelledby="compose-heading">
                                <div>
                                    <h2 ref={stepHeading} id="compose-heading" tabIndex={-1} className="text-lg font-semibold outline-none">
                                        Write your message
                                    </h2>
                                    <p className="text-muted-foreground mt-1 text-sm">Choose a topic and let them know what you need.</p>
                                </div>
                                {admin && (
                                    <div className="bg-accent/40 flex min-w-0 items-center gap-3 rounded-xl px-4 py-3">
                                        <span
                                            aria-hidden="true"
                                            className="bg-card text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                                        >
                                            {recipient ? recipient.name.slice(0, 2).toUpperCase() : <Package className="size-5" />}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-muted-foreground text-xs">Sending to</p>
                                            <p className="truncate text-sm font-semibold" title={recipient?.name ?? parcel?.label}>
                                                {recipient?.name ?? parcel?.label ?? 'Order participants'}
                                            </p>
                                            <p className="text-muted-foreground truncate text-xs">
                                                {recipient ? roleLabel(recipient.role) : 'Parcel participants'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className="text-primary focus-visible:ring-ring min-h-11 rounded-lg px-2 text-sm font-medium hover:underline focus-visible:ring-2"
                                            onClick={() => changeStep('recipient')}
                                        >
                                            Change
                                        </button>
                                    </div>
                                )}
                                <InputError message={form.errors.recipient_email ?? form.errors.seller_order_id} />
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Select
                                        reserveFeedback={false}
                                        label="Conversation context"
                                        value={form.data.kind}
                                        onChange={(event) => {
                                            form.setData('kind', event.target.value);
                                            form.setData('fulfillment_concern', '');
                                            form.setData('subject', '');
                                        }}
                                    >
                                        <option value="message">General Message</option>
                                        <option value="complaint">Complaint or Dispute</option>
                                    </Select>
                                    <Select
                                        reserveFeedback={false}
                                        label="Topic"
                                        required
                                        value={form.data.subject}
                                        error={form.errors.subject}
                                        onChange={(event) => form.setData('subject', event.target.value)}
                                    >
                                        <option value="">Select a topic</option>
                                        {availableTopics
                                            .filter((topic) => topic.kind === form.data.kind)
                                            .map((topic) => (
                                                <option key={topic.title}>{topic.title}</option>
                                            ))}
                                    </Select>
                                </div>
                                {!admin && (
                                    <Field
                                        reserveFeedback={false}
                                        label={form.data.fulfillment_concern ? 'Parcel number (required)' : 'Parcel number (optional)'}
                                        required={!!form.data.fulfillment_concern}
                                        type="number"
                                        min="1"
                                        value={form.data.seller_order_id}
                                        onChange={(event) => form.setData('seller_order_id', event.target.value)}
                                        error={form.errors.seller_order_id}
                                    />
                                )}
                                {form.data.kind === 'complaint' && (
                                    <Select
                                        label="Fulfillment concern (optional)"
                                        value={form.data.fulfillment_concern}
                                        onChange={(event) => form.setData('fulfillment_concern', event.target.value)}
                                        error={form.errors.fulfillment_concern}
                                    >
                                        <option value="">No specific fulfillment concern</option>
                                        {Object.entries(fulfillmentConcerns).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </Select>
                                )}
                                {form.data.fulfillment_concern && (
                                    <div className="grid gap-3">
                                        <p className="text-muted-foreground text-sm">
                                            Admin reviews reports. Parcel participants can read this conversation and its attachments. A report does
                                            not change fulfillment, money or account status.
                                        </p>
                                        {admin && (
                                            <Field
                                                label="Related parcel number"
                                                required
                                                type="number"
                                                min="1"
                                                value={form.data.seller_order_id}
                                                onChange={(event) => form.setData('seller_order_id', event.target.value)}
                                                error={form.errors.seller_order_id}
                                            />
                                        )}
                                    </div>
                                )}
                                <div className="grid gap-2">
                                    <label htmlFor="conversation-body" className="text-sm font-medium">
                                        Message
                                    </label>
                                    <div className="focus-within:border-primary/50 focus-within:ring-ring/30 border-input overflow-hidden rounded-xl border focus-within:ring-2">
                                        <textarea
                                            id="conversation-body"
                                            className={cn(
                                                inputClass,
                                                'min-h-32 resize-none overflow-y-auto rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:min-h-36',
                                            )}
                                            required
                                            maxLength={5000}
                                            aria-invalid={!!form.errors.body}
                                            aria-describedby="conversation-body-hint new-message-feedback"
                                            placeholder={topic?.hint ?? 'Hi, I would like to ask about...'}
                                            value={form.data.body}
                                            onChange={(event) => form.setData('body', event.target.value)}
                                        />
                                        <div
                                            id="conversation-body-hint"
                                            className="text-muted-foreground bg-muted/30 flex justify-end px-3 py-2 text-xs tabular-nums"
                                        >
                                            {form.data.body.length.toLocaleString()}/5,000
                                        </div>
                                    </div>
                                    <InputError id="new-message-feedback" message={form.errors.body} />
                                </div>
                                <details className="group">
                                    <summary className="text-muted-foreground hover:text-primary focus-visible:ring-ring flex min-h-9 w-fit cursor-pointer list-none items-center gap-2 rounded-lg text-sm focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
                                        <Paperclip aria-hidden="true" className="size-4" />
                                        {form.data.attachment ? form.data.attachment.name : 'Attach a file'}
                                        <span className="text-xs">(optional)</span>
                                    </summary>
                                    <div className="mt-3 grid gap-2">
                                        <Field
                                            reserveFeedback={false}
                                            label="Attachment"
                                            type="file"
                                            accept="image/jpeg,image/png,application/pdf"
                                            onChange={(event) => form.setData('attachment', event.target.files?.[0] ?? null)}
                                            error={form.errors.attachment}
                                        />
                                        <p className="text-muted-foreground text-xs">JPG, PNG or PDF. Maximum 5 MB.</p>
                                    </div>
                                </details>
                            </section>
                        )}
                    </div>
                    <footer className="bg-muted/20 border-border/60 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-5 py-4 sm:px-6">
                        {admin && step === 'message' ? (
                            <button type="button" className={secondaryClass} disabled={form.processing} onClick={() => changeStep('recipient')}>
                                <ArrowLeft aria-hidden="true" className="size-4" />
                                Back
                            </button>
                        ) : (
                            <button type="button" className={secondaryClass} disabled={form.processing} onClick={() => close(false)}>
                                Cancel
                            </button>
                        )}
                        {admin && step === 'recipient' ? (
                            <button
                                type="button"
                                className={buttonClass}
                                disabled={!hasRecipient || !options || !!error}
                                onClick={() => changeStep('message')}
                            >
                                Continue
                                <ArrowRight aria-hidden="true" className="size-4" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                className={buttonClass}
                                disabled={form.processing || !form.data.subject || !form.data.body.trim() || (admin && !hasRecipient)}
                            >
                                <SendHorizontal aria-hidden="true" className="size-4" />
                                {form.processing ? 'Sending...' : 'Send Message'}
                            </button>
                        )}
                    </footer>
                </ValidatedForm>
            </DialogContent>
        </Dialog>
    );
}
