import { cn } from '@/lib/utils';
import { CircleAlert } from 'lucide-react';
import { HTMLAttributes } from 'react';

export default function InputError({
    message,
    className = '',
    reserveSpace = false,
    ...props
}: HTMLAttributes<HTMLParagraphElement> & { message?: string; reserveSpace?: boolean }) {
    return message ? (
        <p role="alert" {...props} className={cn('text-destructive flex items-start gap-2 text-xs leading-5', reserveSpace && 'min-h-5', className)}>
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{message}</span>
        </p>
    ) : reserveSpace ? (
        <div className="min-h-5" aria-hidden="true" />
    ) : null;
}
