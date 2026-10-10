import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

export default function InputError({ message, className = '', ...props }: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    return message ? (
        <p role="alert" {...props} className={cn('text-destructive text-sm leading-relaxed', className)}>
            {message}
        </p>
    ) : null;
}
