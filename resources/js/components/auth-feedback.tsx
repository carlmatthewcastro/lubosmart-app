import { CircleAlert } from 'lucide-react';

export default function AuthFeedback({ message, id }: { message?: string; id?: string }) {
    if (!message) return null;

    return (
        <p
            id={id}
            role="alert"
            className="border-primary/15 bg-accent/60 text-foreground flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs leading-5"
        >
            <CircleAlert className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{message}</span>
        </p>
    );
}

export function validateCredentials(data: { email: string; password: string; password_confirmation?: string }, invalidEmail: boolean) {
    const errors: Partial<Record<'email' | 'password' | 'password_confirmation', string>> = {};
    if (!data.email.trim()) errors.email = 'Enter your email.';
    else if (invalidEmail) errors.email = 'Enter a valid email.';
    if (!data.password) errors.password = 'Enter your password.';
    if (data.password_confirmation !== undefined) {
        if (data.password && data.password.length < 8) errors.password = 'Use 8 or more characters.';
        if (!data.password_confirmation) errors.password_confirmation = 'Confirm your password.';
        else if (data.password !== data.password_confirmation) errors.password_confirmation = 'Passwords don’t match.';
    }
    return errors;
}
