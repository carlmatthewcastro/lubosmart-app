import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'action-button inline-flex shrink-0 items-center justify-center gap-2 rounded-control text-sm font-semibold ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                default: 'action-button--solid bg-primary text-primary-foreground hover:bg-primary/90',
                destructive: 'action-button--solid action-button--danger bg-destructive text-destructive-foreground hover:bg-destructive/90',
                outline: 'action-button--outline border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                secondary: 'action-button--soft bg-secondary text-secondary-foreground hover:bg-secondary/80',
                ghost: 'action-button--quiet hover:bg-accent hover:text-accent-foreground',
                link: 'action-button--quiet text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'min-h-11 px-4 py-2.5',
                sm: 'min-h-10 px-3 py-2',
                lg: 'min-h-12 px-6 py-3',
                icon: 'size-11',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
