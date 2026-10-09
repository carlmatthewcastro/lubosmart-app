import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';
export default function AppearanceToggleTab({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();
    return <div className={cn('inline-flex gap-2 rounded-xl border p-1', className)} {...props}>{(['light', 'dark'] as const).map(value => <button key={value} type="button" onClick={() => updateAppearance(value)} aria-pressed={appearance === value} className={cn('rounded-lg px-4 py-2 text-sm capitalize', appearance === value && 'bg-accent text-primary')}>{value}</button>)}</div>;
}
