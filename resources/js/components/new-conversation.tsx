import InputError from '@/components/input-error';
import { buttonClass, Field, inputClass, roleLabel, secondaryClass, Select } from '@/components/marketplace-ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SharedData } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { SendHorizontal, SquarePen } from 'lucide-react';
import { useEffect, useState } from 'react';
type Recipient = { id: number; name: string; email: string; role: string };
type Options = { recipients: Recipient[]; orders: { id: number; label: string }[] };
const topics = [
    { title: 'Registration Requirements', kind: 'message', hint: 'Specify the missing document, the correction needed, and how to resubmit.' },
    { title: 'Seller Compliance', kind: 'message', hint: 'Include the listing name, the policy involved, and the action needed.' },
    { title: 'Order or Delivery Follow-up', kind: 'message', hint: 'Describe the delivery concern and the update you need from the recipient.' },
    { title: 'Payment or Commission Concern', kind: 'complaint', hint: 'Include the order reference, amount in question, and expected outcome.' },
    { title: 'Product Complaint', kind: 'complaint', hint: 'Describe the product issue and attach photos or other supporting evidence.' },
    { title: 'Delivery Dispute', kind: 'complaint', hint: 'Describe what happened, the delivery date, and the requested resolution.' },
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
    const logistics = auth.user.role === 'sorting_center';
    const availableTopics = logistics
        ? topics.filter((topic) =>
              ['Registration Requirements', 'Order or Delivery Follow-up', 'Delivery Dispute', 'Account Assistance'].includes(topic.title),
          )
        : topics;
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
    }, [open, admin, query, role, logistics]);
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
            setError('');
        }
    };
    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="h-[min(90dvh,900px)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden !p-0 sm:max-w-2xl">
                <DialogHeader className="bg-accent/30 border-b px-6 py-5 pr-14">
                    <span className="bg-accent text-primary mb-2 flex size-11 items-center justify-center rounded-xl">
                        <SquarePen className="size-5" />
                    </span>
                    <DialogTitle>{admin ? 'New Conversation' : 'Contact Support'}</DialogTitle>
                    <DialogDescription>
                        {admin ? 'Choose who to contact, select a topic, and write your message.' : 'Tell us what you need help with.'}
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="flex min-h-0 flex-col"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post('/support', {
                            forceFormData: true,
                            onSuccess: () => {
                                form.reset();
                                setQuery('');
                                setRole('');
                                setOptions(null);
                                setAudience('account');
                                setError('');
                                onOpenChange(false);
                            },
                        });
                    }}
                >
                    <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto overscroll-contain px-6 py-5">
                        {admin && (
                            <div className="bg-accent/30 grid gap-4 rounded-xl border p-4">
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        ['account', 'Contact an Account'],
                                        ['order', 'Order Participants'],
                                    ].map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            aria-pressed={audience === value}
                                            className={audience === value ? buttonClass : secondaryClass}
                                            onClick={() => {
                                                setAudience(value);
                                                form.setData('recipient_email', '');
                                                form.setData('seller_order_id', '');
                                            }}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field
                                        label={audience === 'account' ? 'Find a Recipient' : 'Find an Order'}
                                        type="search"
                                        placeholder={audience === 'account' ? 'Name or email address' : 'Buyer, store or parcel number'}
                                        value={query}
                                        onChange={(event) => {
                                            setQuery(event.target.value);
                                            setOptions(null);
                                        }}
                                    />
                                    {audience === 'account' && (
                                        <Select
                                            label="Account Role"
                                            value={role}
                                            onChange={(event) => {
                                                setRole(event.target.value);
                                                setOptions(null);
                                            }}
                                        >
                                            <option value="">All Roles</option>
                                            {(logistics
                                                ? ['admin', 'buyer', 'seller', 'courier']
                                                : ['buyer', 'seller', 'courier', 'sorting_center']
                                            ).map((role) => (
                                                <option key={role} value={role}>
                                                    {roleLabel(role)}
                                                </option>
                                            ))}
                                        </Select>
                                    )}
                                </div>
                                {error ? (
                                    <p role="alert" className="text-destructive text-sm">
                                        {error}
                                    </p>
                                ) : !options ? (
                                    <p role="status" className="text-muted-foreground text-sm">
                                        Loading options...
                                    </p>
                                ) : audience === 'account' ? (
                                    <Select
                                        label="Recipient"
                                        required
                                        value={form.data.recipient_email}
                                        onChange={(event) => form.setData('recipient_email', event.target.value)}
                                        error={form.errors.recipient_email}
                                    >
                                        <option value="">Select an Account</option>
                                        {options.recipients.map((person) => (
                                            <option key={person.id} value={person.email}>
                                                {person.name} / {roleLabel(person.role)} / {person.email}
                                            </option>
                                        ))}
                                    </Select>
                                ) : (
                                    <Select
                                        label="Parcel"
                                        required
                                        value={form.data.seller_order_id}
                                        onChange={(event) => form.setData('seller_order_id', event.target.value)}
                                        error={form.errors.seller_order_id}
                                    >
                                        <option value="">Select a Parcel</option>
                                        {options.orders.map((order) => (
                                            <option key={order.id} value={order.id}>
                                                {order.label}
                                            </option>
                                        ))}
                                    </Select>
                                )}
                                {options && !(audience === 'account' ? options.recipients : options.orders).length && (
                                    <p className="text-muted-foreground text-xs">No matches. Try another name or clear the search.</p>
                                )}
                            </div>
                        )}
                        {!admin && (
                            <Field
                                label="Parcel number (optional)"
                                type="number"
                                min="1"
                                value={form.data.seller_order_id}
                                onChange={(event) => form.setData('seller_order_id', event.target.value)}
                                error={form.errors.seller_order_id}
                            />
                        )}
                        <Select
                            label="Conversation Type"
                            value={form.data.kind}
                            onChange={(event) => {
                                form.setData('kind', event.target.value);
                                form.setData('subject', '');
                            }}
                        >
                            <option value="message">General Message</option>
                            <option value="complaint">Complaint or Dispute</option>
                        </Select>
                        <Select
                            label="Topic"
                            required
                            value={form.data.subject}
                            onChange={(event) => form.setData('subject', event.target.value)}
                            error={form.errors.subject}
                        >
                            <option value="">Select a Topic</option>
                            {availableTopics
                                .filter((topic) => topic.kind === form.data.kind)
                                .map((topic) => (
                                    <option key={topic.title}>{topic.title}</option>
                                ))}
                        </Select>
                        <label className="grid gap-2 text-sm font-medium">
                            Message
                            <textarea
                                className={inputClass + ' h-36 resize-none font-normal'}
                                required
                                maxLength={5000}
                                placeholder={topic?.hint ?? 'Choose a topic to see what to include.'}
                                value={form.data.body}
                                onChange={(event) => form.setData('body', event.target.value)}
                            />
                            <span className="text-muted-foreground text-xs font-normal">{form.data.body.length}/5,000 characters</span>
                            <InputError message={form.errors.body} />
                        </label>
                        <Field
                            label="Attachment (Optional)"
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={(event) => form.setData('attachment', event.target.files?.[0] ?? null)}
                            error={form.errors.attachment}
                        />
                        <p className="text-muted-foreground -mt-3 text-xs">JPG, PNG or PDF, up to 5 MB.</p>
                    </div>
                    <div className="bg-card flex shrink-0 justify-end gap-3 border-t px-6 py-4">
                        <button type="button" className={secondaryClass} disabled={form.processing} onClick={() => close(false)}>
                            Cancel
                        </button>
                        <button
                            className={buttonClass}
                            disabled={form.processing || (admin && !form.data.recipient_email && !form.data.seller_order_id)}
                        >
                            <SendHorizontal className="size-4" />
                            {form.processing ? 'Sending...' : 'Send Message'}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
