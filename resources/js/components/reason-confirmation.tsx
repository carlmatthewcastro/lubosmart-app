import { buttonClass, secondaryClass, Select } from '@/components/marketplace-ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function ReasonConfirmation({
    open,
    onOpenChange,
    title,
    reason,
    onReasonChange,
    onConfirm,
    processing,
    required = true,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    reason: string;
    onReasonChange: (value: string) => void;
    onConfirm: () => void;
    processing: boolean;
    required?: boolean;
}) {
    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!processing) onOpenChange(value);
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>Review your decision and reason before saving. This action is recorded in activity history.</DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!processing && (!required || reason.trim())) onConfirm();
                    }}
                >
                    <Select
                        label={required ? 'Reason (Required)' : 'Reason (Optional)'}
                        required={required}
                        value={reason}
                        onChange={(event) => onReasonChange(event.target.value)}
                    >
                        <option value="">Select a Reason</option>
                        {(reason ? [reason] : ['Further review or information required', 'Issue reviewed with involved parties']).map((reason) => (
                            <option key={reason}>{reason}</option>
                        ))}
                    </Select>
                    <div className="flex flex-wrap justify-end gap-3">
                        <button type="button" className={secondaryClass} disabled={processing} onClick={() => onOpenChange(false)}>
                            Cancel
                        </button>
                        <button className={buttonClass} disabled={processing || (required && !reason.trim())}>
                            {processing ? 'Saving…' : 'Confirm Action'}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
