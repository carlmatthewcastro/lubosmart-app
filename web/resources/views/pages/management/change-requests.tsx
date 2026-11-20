import { AccountChangeComparison } from '@/components/settings/account-change';
import { Card, Notice, Page, Select, Textarea } from '@/components/shared/marketplace-ui';
import { Button } from '@/components/ui/button';
import { accountApi, type AccountChange, type Region } from '@/lib/account-api';
import { ClipboardCheck } from 'lucide-react';
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="w-full min-w-0 sm:w-56">
                    <Select
                        label="Request status"
                        reserveFeedback={false}
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
                </div>
                {data && !error && (
                    <p role="status" className="text-muted-foreground text-sm tabular-nums sm:pb-3">
                        {data.total} {data.total === 1 ? 'request' : 'requests'}
                    </p>
                )}
            </div>
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
            {!isLoading && !error && data?.data.length === 0 && (
                <Card className="flex flex-col items-center gap-4 py-8 text-center sm:py-10">
                    <span className="bg-accent text-primary flex size-12 items-center justify-center rounded-full">
                        <ClipboardCheck aria-hidden="true" className="size-6" />
                    </span>
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold">No {status === 'pending' ? 'pending' : status} requests</h2>
                        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                            {status === 'pending'
                                ? 'Account changes waiting for review will appear here.'
                                : `No requests have been ${status} yet. Choose another status to view other requests.`}
                        </p>
                    </div>
                </Card>
            )}
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
