import { cn } from '@/lib/utils';
export default function AppWordmark({ className, inverse = false }: { className?: string; inverse?: boolean }) {
    return <span className={cn('app-wordmark', inverse && 'app-wordmark--inverse', className)}>LUBOSMART</span>;
}
