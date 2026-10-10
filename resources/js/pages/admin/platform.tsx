import {
    Badge,
    Card,
    Empty,
    Field,
    Page,
    Pager,
    Select,
    buttonClass,
    inputClass,
    secondaryClass,
    type Pagination,
} from '@/components/marketplace-ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { activityDate } from '@/lib/admin-display';
import { Link, router, useForm } from '@inertiajs/react';
import { Eye, FileText, Globe, Megaphone, Pencil, Plus, Save } from 'lucide-react';
import { useState } from 'react';

type Content = { id: number; kind: string; title: string; body: string; published: boolean | number; updated_at: string };
type Filters = { kind?: string; visibility?: string };
function ContentEditor({ content, onClose }: { content?: Content; onClose: () => void }) {
    const [preview, setPreview] = useState(false);
    const form = useForm({
        kind: content?.kind ?? 'announcement',
        title: content?.title ?? '',
        body: content?.body ?? '',
        published: Boolean(content?.published),
    });
    return (
        <>
            <DialogHeader>
                <DialogTitle>{content ? 'Edit Content' : 'Create Content'}</DialogTitle>
                <DialogDescription>
                    {content ? 'Update the content and choose its visibility.' : 'Share an announcement or update a platform policy.'}
                </DialogDescription>
            </DialogHeader>
            <div className="bg-muted flex rounded-xl p-1" role="group" aria-label="Editor view">
                {['Edit', 'Preview'].map((label, index) => (
                    <button
                        key={label}
                        type="button"
                        aria-pressed={preview === Boolean(index)}
                        onClick={() => setPreview(Boolean(index))}
                        className={
                            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ' +
                            (preview === Boolean(index) ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground')
                        }
                    >
                        {index ? <Eye className="size-4" /> : <Pencil className="size-4" />}
                        {label}
                    </button>
                ))}
            </div>
            <form
                className="flex min-h-0 flex-1 flex-col gap-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    const options = { preserveScroll: true, onSuccess: onClose, onError: () => setPreview(false) };
                    if (content) form.put('/admin/platform/' + content.id, options);
                    else form.post('/admin/platform', options);
                }}
            >
                <div className="max-h-[50dvh] min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-1">
                    {preview ? (
                        <article className="rounded-xl border p-5">
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <span className="text-muted-foreground text-xs font-medium">
                                    {form.data.kind === 'policy' ? 'Platform Policy' : 'Announcement'}
                                </span>
                                <Badge status={form.data.published ? 'published' : 'draft'} />
                            </div>
                            <h3 className="text-xl font-semibold break-words">{form.data.title || 'Your title appears here'}</h3>
                            <p className="text-muted-foreground mt-4 text-sm leading-relaxed break-words whitespace-pre-wrap">
                                {form.data.body || 'Your content appears here.'}
                            </p>
                        </article>
                    ) : (
                        <>
                            <Select
                                label="Content Type"
                                value={form.data.kind}
                                error={form.errors.kind}
                                onChange={(event) => form.setData('kind', event.target.value)}
                            >
                                <option value="announcement">Announcement</option>
                                <option value="policy">Platform Policy</option>
                            </Select>
                            <Field
                                label="Title"
                                required
                                maxLength={160}
                                value={form.data.title}
                                onChange={(event) => form.setData('title', event.target.value)}
                                error={form.errors.title}
                                placeholder={form.data.kind === 'policy' ? 'e.g. Product Listing Policy' : 'e.g. Scheduled Platform Maintenance'}
                            />
                            <div className="grid gap-2">
                                <label htmlFor="platform-content-body" className="text-sm font-medium">
                                    Content
                                </label>
                                <textarea
                                    id="platform-content-body"
                                    className={inputClass + ' min-h-48 resize-y'}
                                    required
                                    maxLength={20000}
                                    value={form.data.body}
                                    onChange={(event) => form.setData('body', event.target.value)}
                                    aria-invalid={!!form.errors.body}
                                    aria-describedby="platform-content-help"
                                    placeholder={
                                        form.data.kind === 'policy'
                                            ? 'Explain who this policy applies to, the requirements, and the actions for violations.'
                                            : 'Explain what is happening, who is affected, and any action users need to take.'
                                    }
                                />
                                <div
                                    id="platform-content-help"
                                    role={form.errors.body ? 'alert' : undefined}
                                    className="text-muted-foreground flex flex-wrap justify-between gap-3 text-sm"
                                >
                                    <span>{form.errors.body || 'Use clear paragraphs and include relevant dates.'}</span>
                                    <span className="shrink-0 tabular-nums">{form.data.body.length.toLocaleString()} / 20,000</span>
                                </div>
                            </div>
                        </>
                    )}
                    <fieldset className="rounded-xl border p-4">
                        <legend className="px-1 text-sm font-medium">Visibility</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {[
                                { value: false, label: 'Draft', detail: 'Only visible to you' },
                                { value: true, label: 'Published', detail: 'Visible on the public website' },
                            ].map((option) => (
                                <label
                                    key={option.label}
                                    className={
                                        'flex cursor-pointer items-start gap-2 rounded-xl border p-3 ' +
                                        (form.data.published === option.value ? 'border-primary/40 bg-accent/50' : '')
                                    }
                                >
                                    <input
                                        type="radio"
                                        name="visibility"
                                        className="accent-primary mt-1"
                                        checked={form.data.published === option.value}
                                        onChange={() => form.setData('published', option.value)}
                                    />
                                    <span>
                                        <span className="block text-sm font-semibold">{option.label}</span>
                                        <span className="text-muted-foreground block text-xs">{option.detail}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    {content?.published && !form.data.published && (
                        <p className="text-muted-foreground text-xs">Saving as a draft removes this content from the public website.</p>
                    )}
                </div>
                <div className="flex shrink-0 justify-end gap-2 border-t pt-4">
                    <button type="button" className={secondaryClass} onClick={onClose} disabled={form.processing}>
                        Cancel
                    </button>
                    <button className={buttonClass} disabled={form.processing || !form.data.title.trim() || !form.data.body.trim()}>
                        <Save className="size-4" />
                        {form.processing ? 'Saving...' : form.data.published ? 'Save & Publish' : 'Save Draft'}
                    </button>
                </div>
            </form>
        </>
    );
}
export default function Platform({
    contents,
    filters = {},
    summary,
}: {
    contents: Pagination<Content>;
    filters?: Filters;
    summary: { total: number; published: number; draft: number };
}) {
    const [editing, setEditing] = useState<Content | 'new' | null>(null);
    const [preview, setPreview] = useState<Content | null>(null);
    const filter = (key: keyof Filters, value: string) =>
        router.get('/admin/platform', { ...filters, [key]: value || undefined }, { preserveScroll: true, preserveState: true });
    return (
        <Page
            title="Platform Settings"
            description="Manage the announcements and policies your users see."
            action={
                <button className={buttonClass} onClick={() => setEditing('new')}>
                    <Plus className="size-4" />
                    Create Content
                </button>
            }
        >
            <div className="grid gap-4 sm:grid-cols-3">
                {[
                    { title: 'All Content', value: summary.total, icon: FileText },
                    { title: 'Published', value: summary.published, icon: Globe },
                    { title: 'Drafts', value: summary.draft, icon: Pencil },
                ].map((item) => (
                    <Card key={item.title} className="flex items-center gap-4">
                        <span className="bg-accent text-primary rounded-xl p-3">
                            <item.icon className="size-5" />
                        </span>
                        <div>
                            <p className="text-muted-foreground text-xs font-medium">{item.title}</p>
                            <p className="mt-1 text-2xl font-semibold tabular-nums">{item.value}</p>
                        </div>
                    </Card>
                ))}
            </div>
            <Card>
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
                        <Select label="Content Type" value={filters.kind ?? ''} onChange={(event) => filter('kind', event.target.value)}>
                            <option value="">All Types</option>
                            <option value="announcement">Announcements</option>
                            <option value="policy">Platform Policies</option>
                        </Select>
                        <Select label="Visibility" value={filters.visibility ?? ''} onChange={(event) => filter('visibility', event.target.value)}>
                            <option value="">All Visibility</option>
                            <option value="published">Published</option>
                            <option value="draft">Drafts</option>
                        </Select>
                    </div>
                    <Link href="/platform-information" className={secondaryClass}>
                        <Globe className="size-4" />
                        View Public Page
                    </Link>
                </div>
            </Card>
            {contents.data.length ? (
                <div className="grid gap-4">
                    {contents.data.map((content) => (
                        <Card key={content.id}>
                            <div className="flex items-start gap-4">
                                <span className="bg-accent text-primary hidden rounded-xl p-3 sm:block">
                                    {content.kind === 'policy' ? <FileText className="size-5" /> : <Megaphone className="size-5" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-muted-foreground text-xs font-medium">
                                            {content.kind === 'policy' ? 'Platform Policy' : 'Announcement'}
                                        </p>
                                        <Badge status={content.published ? 'published' : 'draft'} />
                                    </div>
                                    <h2 className="mt-2 text-lg font-semibold break-words">{content.title}</h2>
                                    <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed break-words">{content.body}</p>
                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                                        <p className="text-muted-foreground text-xs">Updated {activityDate(content.updated_at)}</p>
                                        <div className="flex gap-2">
                                            <button className={secondaryClass} onClick={() => setPreview(content)}>
                                                <Eye className="size-4" />
                                                Preview
                                            </button>
                                            <button className={secondaryClass} onClick={() => setEditing(content)}>
                                                <Pencil className="size-4" />
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Empty
                    title={summary.total ? 'No matching content' : 'No platform content yet'}
                    description={
                        summary.total
                            ? 'Choose another content type or visibility to see more items.'
                            : 'Create an announcement or policy. Save it as a draft until it is ready to publish.'
                    }
                />
            )}
            <Pager links={contents.links} />
            <Dialog
                open={editing !== null}
                onOpenChange={(value) => {
                    if (!value) setEditing(null);
                }}
            >
                <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-2xl">
                    {editing && (
                        <ContentEditor
                            key={editing === 'new' ? 'new' : editing.id}
                            content={editing === 'new' ? undefined : editing}
                            onClose={() => setEditing(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={preview !== null}
                onOpenChange={(value) => {
                    if (!value) setPreview(null);
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="break-words">{preview?.title}</DialogTitle>
                        <DialogDescription>{preview?.kind === 'policy' ? 'Platform Policy' : 'Announcement'} Preview</DialogDescription>
                    </DialogHeader>
                    <Badge status={preview?.published ? 'published' : 'draft'} />
                    <p className="max-h-[55dvh] overflow-y-auto text-sm leading-relaxed break-words whitespace-pre-wrap">{preview?.body}</p>
                    <div className="flex justify-end border-t pt-4">
                        <button
                            className={secondaryClass}
                            onClick={() => {
                                setEditing(preview);
                                setPreview(null);
                            }}
                        >
                            <Pencil className="size-4" />
                            Edit Content
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </Page>
    );
}
