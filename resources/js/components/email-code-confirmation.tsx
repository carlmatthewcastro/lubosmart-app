import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from '@inertiajs/react';
import { type FormEvent, useState } from 'react';

export default function EmailCodeConfirmation({
    purpose,
    confirmed = false,
    codeSent = false,
}: {
    purpose: 'password' | 'profile';
    confirmed?: boolean;
    codeSent?: boolean;
}) {
    const [sent, setSent] = useState(codeSent);
    const send = useForm({ purpose });
    const verify = useForm({ purpose, code: '' });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        verify.post(route('security-code.verify'), { preserveScroll: true, onSuccess: () => verify.reset('code') });
    };

    return (
        <section className="bg-card grid gap-4 rounded-xl border p-4">
            <h3 className="font-medium">Confirm with an email code</h3>
            <p className="text-muted-foreground text-sm">Codes expire in 10 minutes. You can request 3 per hour; 5 wrong attempts lock a code.</p>
            {confirmed && (
                <p role="status" className="text-primary text-sm">
                    Email confirmed. Save your change within 10 minutes.
                </p>
            )}
            {!confirmed && (
                <>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={send.processing || verify.processing}
                        onClick={() =>
                            send.post(route('security-code.send'), {
                                preserveScroll: true,
                                onSuccess: () => {
                                    setSent(true);
                                    verify.reset('code');
                                    verify.clearErrors();
                                },
                            })
                        }
                    >
                        {send.processing ? 'Sending code…' : sent ? 'Resend email code' : 'Send email code'}
                    </Button>
                    <InputError message={(send.errors as Record<string, string>).code} />
                    {sent && (
                        <form onSubmit={submit} className="grid gap-3">
                            <Label htmlFor={`${purpose}-code`}>6-digit code</Label>
                            <Input
                                id={`${purpose}-code`}
                                required
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                value={verify.data.code}
                                onChange={(event) => verify.setData('code', event.target.value)}
                            />
                            <InputError message={verify.errors.code} />
                            <Button disabled={verify.processing || send.processing}>{verify.processing ? 'Confirming…' : 'Confirm code'}</Button>
                        </form>
                    )}
                </>
            )}
        </section>
    );
}
