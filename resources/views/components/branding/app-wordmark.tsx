
import { cn } from '@/lib/utils';

export default function AppWordmark({
    className,
    inverse = false,
}: {
    className?: string;
    inverse?: boolean;
}) {
    return (
        <span
            className={cn(
                'app-wordmark',
                inverse && 'app-wordmark--inverse',
                className
            )}
        >
            <span className="app-wordmark__lubos">LUBOS</span>
            <span className="app-wordmark__mart">MART</span>
        </span>
    );
}
