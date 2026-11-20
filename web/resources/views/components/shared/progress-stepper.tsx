import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Check, Circle, CircleX, TriangleAlert, type LucideIcon } from 'lucide-react';

export type ProgressStage = {
    id: string;
    label: string;
    description?: string;
    state: 'completed' | 'current' | 'pending' | 'failed' | 'cancelled';
    icon?: LucideIcon;
    timestamp?: string | null;
    motion?: 'truck' | 'package' | 'scan';
};

export default function ProgressStepper({
    stages,
    label,
    layout = 'horizontal',
    variant = 'compact',
    className,
    onSelect,
    disabled = false,
}: {
    stages: ProgressStage[];
    label: string;
    layout?: 'horizontal' | 'vertical' | 'responsive';
    variant?: 'compact' | 'detailed' | 'parcel';
    className?: string;
    onSelect?: (index: number) => void;
    disabled?: boolean;
}) {
    return (
        <TooltipProvider delayDuration={200}>
            <ol aria-label={label} className={cn('workflow-stepper', `workflow-stepper--${layout}`, `workflow-stepper--${variant}`, className)}>
                {stages.map((stage, index) => {
                    const Icon = stage.state === 'failed' ? TriangleAlert : stage.state === 'cancelled' ? CircleX : (stage.icon ?? Circle);
                    const at = stage.timestamp && !Number.isNaN(Date.parse(stage.timestamp)) ? stage.timestamp : null;
                    const summary = `${stage.label}: ${stage.state}${stage.description ? `. ${stage.description}` : ''}`;
                    return (
                        <li
                            key={stage.id}
                            data-state={stage.state}
                            aria-current={stage.state === 'current' ? 'step' : undefined}
                            className="workflow-stage"
                        >
                            {index < stages.length - 1 && (
                                <span aria-hidden="true" className="workflow-connector">
                                    <span data-filled={stage.state === 'completed' && ['completed', 'current'].includes(stages[index + 1].state)} />
                                </span>
                            )}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    {onSelect ? (
                                        <button
                                            type="button"
                                            className="workflow-node"
                                            aria-label={summary}
                                            disabled={disabled || stage.state === 'pending'}
                                            onClick={() => onSelect(index)}
                                        >
                                            <Icon
                                                aria-hidden="true"
                                                data-motion={stage.state === 'current' ? stage.motion : undefined}
                                                className="size-4"
                                            />
                                            {stage.state === 'completed' && <Check aria-hidden="true" className="workflow-check" />}
                                        </button>
                                    ) : (
                                        <span tabIndex={0} role="img" aria-label={summary} className="workflow-node">
                                            <Icon
                                                aria-hidden="true"
                                                data-motion={stage.state === 'current' ? stage.motion : undefined}
                                                className="size-4"
                                            />
                                            {stage.state === 'completed' && <Check aria-hidden="true" className="workflow-check" />}
                                        </span>
                                    )}
                                </TooltipTrigger>
                                <TooltipContent className="max-w-64 break-words">
                                    {summary}
                                    {at ? ` · ${new Date(at).toLocaleString('en-PH')}` : ''}
                                </TooltipContent>
                            </Tooltip>
                            <div
                                className={cn(
                                    'workflow-copy',
                                    variant === 'parcel' &&
                                        'border-border/60 grid flex-1 grid-cols-1 gap-x-3 border-b pb-3 @lg:grid-cols-[minmax(0,1fr)_auto]',
                                )}
                            >
                                <p className={cn('workflow-label', variant === 'parcel' && '!text-sm font-medium')}>{stage.label}</p>
                                <span
                                    className={cn(
                                        variant === 'compact' ? 'sr-only' : 'text-muted-foreground text-xs capitalize',
                                        variant === 'parcel' && '@lg:col-start-1 @lg:row-start-2',
                                    )}
                                >
                                    {stage.state === 'current' ? 'In progress' : stage.state}
                                </span>
                                {variant !== 'compact' && (
                                    <>
                                        {stage.description ? (
                                            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{stage.description}</p>
                                        ) : null}
                                        {at ? (
                                            <time
                                                dateTime={at}
                                                className={cn(
                                                    'text-muted-foreground mt-1 block text-xs tabular-nums',
                                                    variant === 'parcel' &&
                                                        '@lg:col-start-2 @lg:row-span-2 @lg:row-start-1 @lg:mt-0 @lg:self-center @lg:text-right',
                                                )}
                                            >
                                                {new Date(at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </time>
                                        ) : variant === 'detailed' ? (
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                {stage.state === 'pending'
                                                    ? 'Awaiting this step'
                                                    : stage.state === 'current'
                                                      ? 'In progress'
                                                      : 'Historical timestamp unavailable'}
                                            </p>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </TooltipProvider>
    );
}
