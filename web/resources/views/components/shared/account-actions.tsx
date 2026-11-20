import { AccountAccessPanel } from '@/components/shared/account-access-panel';
import { ActionDropdown, type DropdownAction } from '@/components/shared/action-dropdown';
import { InfoModal } from '@/components/shared/info-modal';
import type { User } from '@/types';
import { Eye, History, Shield } from 'lucide-react';
import { useRef, useState } from 'react';

export function AccountActions({
    account,
    canView = true,
    canManage = false,
    actions = [],
    open,
    onOpenChange,
    onViewDetails,
}: {
    account: Pick<User, 'id' | 'name' | 'status'>;
    canView?: boolean;
    canManage?: boolean;
    actions?: DropdownAction[];
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onViewDetails?: () => void;
}) {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const inlineFocusPending = useRef(false);
    const [dialog, setDialog] = useState<'details' | 'history' | 'access' | null>(null);
    const restoreFocus = () => triggerRef.current?.focus();
    const items: DropdownAction[] = [
        {
            id: 'details',
            label: 'View details',
            icon: Eye,
            visible: canView,
            onSelect: () => {
                if (onViewDetails) {
                    onViewDetails();
                } else setDialog('details');
            },
        },
        {
            id: 'access',
            label: 'Manage access',
            icon: Shield,
            visible: canManage && ['approved', 'suspended', 'deactivated'].includes(account.status),
            onSelect: () => setDialog('access'),
        },
        { id: 'history', label: 'View activity history', icon: History, visible: canView, onSelect: () => setDialog('history') },
        ...actions,
    ];
    if (!items.some((action) => action.visible !== false)) return null;
    return (
        <>
            <ActionDropdown
                label={`Actions for ${account.name}`}
                triggerRef={triggerRef}
                actions={items}
                open={open}
                onOpenChange={onOpenChange}
                onActionSelect={(id) => {
                    inlineFocusPending.current = id === 'details' && !!onViewDetails;
                }}
                onCloseAutoFocus={(event) => {
                    if (inlineFocusPending.current) {
                        event.preventDefault();
                        inlineFocusPending.current = false;
                    }
                }}
            />
            {canView && (
                <InfoModal
                    kind="account"
                    id={account.id}
                    label="View details"
                    hideTrigger
                    open={dialog === 'details' || dialog === 'history'}
                    onOpenChange={(value) => {
                        if (!value) setDialog(null);
                    }}
                    initialSection={dialog === 'history' ? 'Activity history' : 'Personal information'}
                    onCloseAutoFocus={restoreFocus}
                />
            )}
            {canManage && (
                <AccountAccessPanel
                    account={account}
                    hideTrigger
                    open={dialog === 'access'}
                    onOpenChange={(value) => {
                        if (!value) setDialog(null);
                    }}
                    onCloseAutoFocus={restoreFocus}
                />
            )}
        </>
    );
}
