import AuthFeedback, { validateCredentials } from '@/components/auth-feedback';
import GoogleContinueButton from '@/components/google-continue-button';
import { buttonClass, inputClass } from '@/components/marketplace-ui';
import type { SharedData } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { Eye, EyeOff, LoaderCircle, ShoppingBag, Store, Truck, Warehouse } from 'lucide-react';
import { type InputHTMLAttributes, useRef, useState } from 'react';

export type RegistrationRole = 'buyer' | 'seller' | 'courier' | 'sorting_center';
export const authInputClass = inputClass;
export const registrationRoles = [
    { value: 'buyer', title: 'Buyer', description: 'Discover local favorites', icon: ShoppingBag },
    { value: 'seller', title: 'Seller', description: 'Grow your own store', icon: Store },
    { value: 'courier', title: 'Courier', description: 'Deliver in your community', icon: Truck },
    { value: 'sorting_center', title: 'Sorting center', description: 'Manage parcels and couriers', icon: Warehouse },
] as const;

type Details = {
    email: string;
    role: RegistrationRole;
    password: string;
    password_confirmation: string;
};
function Input({ label, error, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
    return (
        <div className="grid gap-2">
            <label htmlFor={props.id} className="text-sm font-medium">
                {label}
            </label>
            <input
                className={authInputClass}
                {...props}
                aria-invalid={!!error}
                aria-describedby={error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined}
            />
            {hint && !error && (
                <p id={`${props.id}-hint`} className="text-muted-foreground text-xs">
                    {hint}
                </p>
            )}
            <AuthFeedback id={`${props.id}-error`} message={error} />
        </div>
    );
}
export function Password({ label, hint, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
    const [visible, setVisible] = useState(false);
    return (
        <div className="grid gap-2">
            <label htmlFor={props.id} className="text-sm font-medium">
                {label}
            </label>
            <div className="relative">
                <input
                    {...props}
                    type={visible ? 'text' : 'password'}
                    className={`${authInputClass} pr-12`}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined}
                />
                <button
                    type="button"
                    className="text-muted-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl"
                    aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
                    aria-pressed={visible}
                    disabled={props.disabled}
                    onClick={() => setVisible(!visible)}
                >
                    {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
            </div>
            {hint && !error && (
                <p id={`${props.id}-hint`} className="text-muted-foreground text-xs">
                    {hint}
                </p>
            )}
            <AuthFeedback id={`${props.id}-error`} message={error} />
        </div>
    );
}

export default function RegistrationForm({ initialRole = 'buyer', compact = false }: { initialRole?: RegistrationRole; compact?: boolean }) {
    const { errors: sharedErrors } = usePage<SharedData>().props;
    const formRef = useRef<HTMLFormElement>(null);
    const form = useForm<Details>({
        email: '',
        role: initialRole,
        password: '',
        password_confirmation: '',
    });
    const google = useForm<{ intent: 'register'; role: RegistrationRole; google?: string }>({
        intent: 'register',
        role: initialRole,
    });
    const error = (key: keyof Details) => form.errors[key] ?? google.errors[key as keyof typeof google.errors];
    const busy = form.processing || google.processing;
    const strength =
        form.data.password.length < 8
            ? 0
            : Math.min(
                  3,
                  1 + Number(form.data.password.length >= 12) + Number(/[A-Za-z]/.test(form.data.password) && /[^A-Za-z]/.test(form.data.password)),
              );
    const focusError = (errors: Record<string, string>) =>
        requestAnimationFrame(() => {
            const key = Object.keys(errors)[0];
            const field = formRef.current?.querySelector<HTMLElement>(`[name="${key}"]`);
            field?.focus();
        });

    return (
        <form
            ref={formRef}
            className={compact ? 'space-y-5' : 'space-y-6'}
            aria-busy={busy}
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                if (busy) return;
                const errors = validateCredentials(
                    form.data,
                    !!formRef.current?.querySelector<HTMLInputElement>('[name="email"]')?.validity.typeMismatch,
                );
                form.clearErrors();
                if (Object.keys(errors).length) {
                    if (errors.email) form.setError('email', errors.email);
                    if (errors.password) form.setError('password', errors.password);
                    if (errors.password_confirmation) form.setError('password_confirmation', errors.password_confirmation);
                    focusError(errors as Record<string, string>);
                    return;
                }
                form.post(route('register'), { onError: focusError, onFinish: () => form.reset('password', 'password_confirmation') });
            }}
        >
            <fieldset disabled={busy} className="space-y-3">
                <legend className="mb-1 text-sm font-semibold">Join as</legend>
                <div className="grid grid-cols-2 gap-3">
                    {registrationRoles.map(({ value, title, description, icon: Icon }) => (
                        <label
                            key={value}
                            className={`relative flex cursor-pointer gap-2 rounded-xl border p-3 transition ${compact ? 'items-center' : 'sm:p-4'} ${form.data.role === value ? 'border-primary bg-accent/60 ring-primary/10 ring-1' : 'bg-card hover:border-primary/40'} ${busy ? 'opacity-60' : ''}`}
                        >
                            <input
                                className="peer sr-only"
                                type="radio"
                                name="role"
                                value={value}
                                checked={form.data.role === value}
                                onChange={() => {
                                    form.setData('role', value);
                                    google.setData('role', value);
                                    form.clearErrors('role');
                                    google.clearErrors();
                                }}
                            />
                            <span className="peer-focus-visible:outline-ring pointer-events-none absolute inset-0 rounded-xl peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2" />
                            <Icon className={`size-4 shrink-0 ${form.data.role === value ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="min-w-0">
                                <span className={`text-sm font-semibold ${form.data.role === value ? 'text-primary' : ''}`}>{title}</span>
                                <span className={compact ? 'sr-only' : 'text-muted-foreground mt-1 block text-xs leading-relaxed'}>
                                    {description}
                                </span>
                            </span>
                        </label>
                    ))}
                </div>
                <AuthFeedback message={error('role')} />
            </fieldset>
            <div>
                <Input
                    label="Email address"
                    id="auth-register-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    maxLength={160}
                    disabled={busy}
                    value={form.data.email}
                    onChange={(e) => {
                        form.setData('email', e.target.value);
                        form.clearErrors('email');
                    }}
                    error={error('email')}
                />
            </div>
            <div className={`grid items-start gap-4 ${compact ? '' : 'sm:grid-cols-2'}`}>
                <Password
                    label="Password"
                    id="auth-register-password"
                    name="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    hint="8 or more characters"
                    disabled={busy}
                    value={form.data.password}
                    onChange={(e) => {
                        form.setData('password', e.target.value);
                        form.clearErrors('password');
                    }}
                    error={error('password')}
                />
                <Password
                    label="Confirm password"
                    id="auth-register-password-confirmation"
                    name="password_confirmation"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    disabled={busy}
                    value={form.data.password_confirmation}
                    onChange={(e) => {
                        form.setData('password_confirmation', e.target.value);
                        form.clearErrors('password_confirmation');
                    }}
                    error={error('password_confirmation')}
                />
            </div>
            {form.data.password && (
                <div className="space-y-2" aria-live="polite">
                    <div className="grid grid-cols-3 gap-1" aria-hidden="true">
                        {[1, 2, 3].map((level) => (
                            <span key={level} className={`h-1.5 rounded-full ${strength >= level ? 'bg-primary' : 'bg-muted'}`} />
                        ))}
                    </div>
                    <p className="text-muted-foreground text-xs">
                        Password strength: {['Too short', 'Basic', 'Good', 'Strong'][strength]}. Longer passwords are stronger.
                    </p>
                </div>
            )}
            <div className="space-y-4">
                <button type="submit" className={`${buttonClass} w-full`} disabled={busy}>
                    {form.processing ? <LoaderCircle className="size-4 animate-spin" /> : null}
                    {form.processing ? 'Creating your account…' : 'Create my account'}
                </button>
                <div className="text-muted-foreground flex items-center gap-3 text-xs">
                    <span className="bg-border h-px flex-1" />
                    or
                    <span className="bg-border h-px flex-1" />
                </div>
                <GoogleContinueButton
                    processing={google.processing}
                    disabled={busy}
                    onClick={() => {
                        google.post(route('auth.google.redirect'), { onError: focusError });
                    }}
                />
                <AuthFeedback message={google.errors.google ?? sharedErrors?.google} />
            </div>
        </form>
    );
}
