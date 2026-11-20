import { cn } from '@/lib/utils';

export default function OrderProductImage({ src, name, className }: { src?: string | null; name: string; className?: string }) {
    return (
        <span
            className={cn(
                'bg-accent text-primary relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border',
                className,
            )}
        >
            <span className="text-muted-foreground px-1 text-center text-xs">No photo</span>
            {src && (
                <img
                    key={src}
                    src={src}
                    alt={name}
                    width={64}
                    height={64}
                    loading="lazy"
                    decoding="async"
                    className="bg-card absolute inset-0 size-full object-contain p-1"
                    onError={(event) => {
                        event.currentTarget.hidden = true;
                    }}
                />
            )}
        </span>
    );
}
