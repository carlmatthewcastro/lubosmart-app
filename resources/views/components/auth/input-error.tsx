import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

export default function InputError({
    message,
    className = '',
    reserveSpace = false,
    ...props
}: HTMLAttributes<HTMLParagraphElement> & { message?: string; reserveSpace?: boolean }) {
    return message ? (
        <p role="alert" {...props} className={cn('text-destructive text-sm leading-relaxed', reserveSpace && 'min-h-5 text-xs leading-5', className)}>
            {message}
        </p>
    ) : reserveSpace ? (
        <div className="min-h-5" aria-hidden="true" />
    ) : null;
}
