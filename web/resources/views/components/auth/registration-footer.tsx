import { ArrowRight, LoaderCircle } from 'lucide-react';

export default function RegistrationFooter({
    current,
    total,
    busy,
    onContinue,
}: {
    current: number;
    total: number;
    busy: boolean;
    onContinue: () => void;
}) {
    return (
        <footer className="auth-registration-footer" aria-label="Registration actions">
            <span className="auth-step-count">
                Step {current + 1} of {total}
            </span>
            {current < total - 1 ? (
                <button type="button" disabled={busy} onClick={onContinue} className="auth-action-button">
                    Continue <ArrowRight className="size-4" aria-hidden="true" />
                </button>
            ) : (
                <button type="submit" disabled={busy} className="auth-action-button">
                    {busy && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                    {busy ? 'Creating account...' : 'Create account'}
                </button>
            )}
        </footer>
    );
}
