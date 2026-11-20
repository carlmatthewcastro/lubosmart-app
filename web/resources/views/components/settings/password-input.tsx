import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
export default function PasswordInput(props: ComponentProps<typeof Input>) {
    const [visible, setVisible] = useState(false);
    const Icon = visible ? EyeOff : Eye;
    return (
        <div className="relative">
            <Input {...props} type={visible ? 'text' : 'password'} className="pr-14" />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 min-h-11 min-w-11"
                disabled={props.disabled}
                aria-label={
                    (visible ? 'Hide ' : 'Show ') +
                    (props.autoComplete === 'current-password'
                        ? 'current password'
                        : props.id === 'password_confirmation'
                          ? 'password confirmation'
                          : 'new password')
                }
                aria-pressed={visible}
                onClick={() => setVisible(!visible)}
            >
                <Icon aria-hidden="true" className="size-4" />
            </Button>
        </div>
    );
}
