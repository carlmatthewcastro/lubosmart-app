import { AccountChangeComparison } from '@/components/settings/account-change';
import { Card, Notice, Page, Select, Textarea } from '@/components/shared/marketplace-ui';
import { Button } from '@/components/ui/button';
import { accountApi, type AccountChange, type Region } from '@/lib/account-api';
import { useState } from 'react';
import useSWR from 'swr';

export default function ChangeRequests() {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('pending');
    const { data, error, isLoading, mutate } = useSWR<{ data: AccountChange[]; total: number; last_page: number; regions: Region[] }>(
        `/api/admin/change-requests?status=${status}&page=${page}`,
        accountApi,
    );
    const [reason, setReason] = useState<Record<number, string>>({});
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState('');
    async function review(id: number, decision: string) {
        setBusy(true);
        setFeedback('');
        try {
            await accountApi(`/api/admin/change-requests/${id}/${decision}`, 'POST', { reason: reason[id] });
            await mutate();
        } catch (err) {
            setFeedback(err instanceof Error ? err.message : 'Review failed.');
        } finally {
            setBusy(false);
        }
    }
    return (
        <Page title="Account change requests" description="Compare approved registration details with proposed changes before deciding.">
            <Select
                label="Request status"
                value={status}
                onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                }}
            >
                <option value="pending">Pending review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
            </Select>
            {feedback && <Notice tone="error">{feedback}</Notice>}
            {isLoading && <p role="status">Loading change requests…</p>}
            {error && (
                <Notice tone="error">
                    Unable to load requests.{' '}
                    <Button variant="outline" onClick={() => void mutate()}>
                        Retry
                    </Button>
                </Notice>
            )}
            {data && <p className="text-muted-foreground text-sm">{data.total} requests</p>}
            {data?.data.length === 0 && <Card>No {status} requests.</Card>}
            {data?.data.map((change) => (
                <Card key={change.id} className="space-y-4">
                    <h2 className="text-lg font-semibold">
                        Account #{change.account_id} · Request #{change.id}
                    </h2>
                    <AccountChangeComparison change={change} regions={data.regions} />
                    {change.document_urls?.map((document) => (
                        <a key={document.kind} href={document.url} className="text-primary block underline">
                            Review {document.kind.replaceAll('_', ' ')}
                        </a>
                    ))}
                    {change.status === 'pending' && (
                        <>
                            <Textarea
                                label={`Rejection reason for request ${change.id}`}
                                value={reason[change.id] ?? ''}
                                maxLength={2000}
                                onChange={(event) => setReason({ ...reason, [change.id]: event.target.value })}
                            />
                            <div className="flex flex-wrap gap-3">
                                <Button disabled={busy} onClick={() => void review(change.id, 'approve')}>
                                    Approve
                                </Button>
                                <Button
                                    variant="destructive"
                                    disabled={busy || !reason[change.id]?.trim()}
                                    onClick={() => void review(change.id, 'reject')}
                                >
                                    Reject with reason
                                </Button>
                            </div>
                        </>
                    )}
                </Card>
            ))}
            {data && data.last_page > 1 && (
                <nav className="flex gap-3" aria-label="Change request pages">
                    <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                        Previous
                    </Button>
                    <span className="self-center">
                        Page {page} of {data.last_page}
                    </span>
                    <Button variant="outline" disabled={page === data.last_page} onClick={() => setPage(page + 1)}>
                        Next
                    </Button>
                </nav>
            )}
        </Page>
    );
}
