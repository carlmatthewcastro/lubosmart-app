import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

export default function GoogleContinueButton({
    processing = false,
    disabled,
    ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className' | 'type'> & { processing?: boolean }) {
    return (
        <button
            {...props}
            type="button"
            disabled={disabled || processing}
            aria-busy={processing}
            className="focus-visible:ring-primary/30 inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-[#747775] bg-white px-4 py-3 text-sm font-medium text-[#1f1f1f] transition hover:bg-[#f8f9fa] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
            {processing ? (
                <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            ) : (
                <img src="/images/google-g.png" width={20} height={20} alt="" className="size-5 shrink-0 object-contain" />
            )}
            {processing ? 'Connecting…' : 'Continue with Google'}
        </button>
    );
}
