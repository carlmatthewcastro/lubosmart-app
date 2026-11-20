import { Field, Select, secondaryClass } from '@/components/shared/marketplace-ui';
import type { SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';

export const riderQueues = [
    { key: 'all', label: 'All my parcels' },
    { key: 'pickups', label: 'My pickups' },
    { key: 'dispatch', label: 'Dispatch handovers' },
    { key: 'monitoring', label: 'Out for delivery' },
    { key: 'exceptions', label: 'Delivery issues' },
    { key: 'cash', label: 'COD handover' },
    { key: 'completed', label: 'Completed deliveries' },
];

export default function RiderNavigation() {
    const { url, props } = usePage<SharedData>();
    const capability = props.auth.user.rider_capability ?? 'both';
    const params = new URLSearchParams(url.split('?')[1] ?? '');
    const stage = params.get('stage') ?? 'all';
    const workspace = params.get('workspace') ?? '';
    const [search, setSearch] = useState(params.get('search') ?? '');
    return (
        <div className="space-y-4">
            {url.startsWith('/deliveries') && (
                <form
                    className="bg-card flex flex-wrap items-end gap-3 rounded-2xl border p-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        router.get('/deliveries', { stage, workspace, search }, { preserveScroll: true, replace: true });
                    }}
                >
                    <div className="min-w-0 flex-1 basis-64">
                        <Field
                            reserveFeedback={false}
                            label="Search assigned parcels"
                            placeholder="Tracking reference or store name"
                            value={search}
                            maxLength={100}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    {capability === 'both' && (
                        <Select
                            reserveFeedback={false}
                            label="Work type"
                            value={workspace}
                            onChange={(event) =>
                                router.get('/deliveries', { stage, workspace: event.target.value, search }, { preserveScroll: true, replace: true })
                            }
                        >
                            <option value="">All work</option>
                            <option value="pickup">Pickup workspace</option>
                            <option value="delivery">Delivery workspace</option>
                        </Select>
                    )}
                    <button type="submit" className={`${secondaryClass} min-h-11 gap-2`}>
                        <Search aria-hidden="true" className="size-4" />
                        Search
                    </button>
                </form>
            )}
        </div>
    );
}
