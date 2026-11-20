import AuthFeedback from '@/components/auth/auth-feedback';
import { AuthNotificationContext } from '@/components/auth/auth-notification-provider';
import { cn } from '@/lib/utils';
import { CircleAlert } from 'lucide-react';
import { HTMLAttributes, useContext } from 'react';

export default function InputError({
    message,
    className = '',
    reserveSpace = false,
    ...props
}: HTMLAttributes<HTMLParagraphElement> & { message?: string; reserveSpace?: boolean }) {
    const report = useContext(AuthNotificationContext);
    if (report) return <AuthFeedback message={message} id={props.id} />;
    return message ? (
        <p role="alert" {...props} className={cn('text-destructive flex items-start gap-2 text-xs leading-5', reserveSpace && 'min-h-10', className)}>
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 [overflow-wrap:anywhere] break-words">{message}</span>
        </p>
    ) : reserveSpace ? (
        <div className="min-h-10" aria-hidden="true" />
    ) : null;
}
