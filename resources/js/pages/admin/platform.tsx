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
import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
type Content = { id: number; kind: string; title: string; body: string; published: boolean | number };
function ContentForm({ content, onClose }: { content?: Content; onClose?: () => void }) {
    const form = useForm({
        kind: content?.kind ?? 'announcement',
        title: content?.title ?? '',
        body: content?.body ?? '',
        published: Boolean(content?.published),
    });
    return (
        <form
            noValidate
            className="grid gap-4"
            onSubmit={(e) => {
                e.preventDefault();
                const options = {
                    preserveScroll: true,
                    onSuccess: () => {
                        if (!content) {
                            form.reset();
                            onClose?.();
                        }
                    },
                };
                if (content) form.put(`/admin/platform/${content.id}`, options);
                else form.post('/admin/platform', options);
            }}
        >
            <Select label="Content type" value={form.data.kind} onChange={(e) => form.setData('kind', e.target.value)}>
                <option value="announcement">Announcement</option>
                <option value="policy">Platform policy</option>
            </Select>
            <Field
                label="Title"
                value={form.data.title}
                maxLength={160}
                onChange={(e) => form.setData('title', e.target.value)}
                error={form.errors.title}
            />
            <label className="grid gap-2 text-sm font-medium">
                Content
                <textarea
                    className={`${inputClass} min-h-40 font-normal`}
                    maxLength={20000}
                    value={form.data.body}
                    onChange={(e) => form.setData('body', e.target.value)}
                />
            </label>
            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.data.published} onChange={(e) => form.setData('published', e.target.checked)} />
                Publish on the website
            </label>
            <p className="text-muted-foreground text-xs">Published content is visible to everyone. Uncheck to keep it as a draft.</p>
            <div className="flex flex-wrap gap-3">
                <button className={buttonClass} disabled={form.processing}>
                    {form.processing ? 'Saving…' : 'Save content'}
                </button>
                {onClose && (
                    <button type="button" className={secondaryClass} onClick={onClose}>
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}
export default function Platform({ contents }: { contents: Pagination<Content> }) {
    const [creating, setCreating] = useState(false);
    return (
        <Page
            title="Platform settings"
            description="Publish announcements and keep platform policies up to date."
            action={
                <button className={buttonClass} onClick={() => setCreating(true)}>
                    New content
                </button>
            }
        >
            <Link href="/platform-information" className="text-primary text-sm font-medium hover:underline">
                View published announcements and policies
            </Link>
            {creating && (
                <Card>
                    <h2 className="mb-5 font-semibold">New announcement or policy</h2>
                    <ContentForm onClose={() => setCreating(false)} />
                </Card>
            )}
            {contents.data.length ? (
                contents.data.map((content) => (
                    <Card key={content.id}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-muted-foreground text-xs capitalize">{content.kind}</p>
                                <h2 className="mt-1 font-semibold break-words">{content.title}</h2>
                            </div>
                            <Badge status={content.published ? 'published' : 'draft'} />
                        </div>
                        <details className="mt-4">
                            <summary className="text-primary cursor-pointer text-sm font-medium">Edit content</summary>
                            <div className="mt-5">
                                <ContentForm content={content} />
                            </div>
                        </details>
                    </Card>
                ))
            ) : (
                <Empty title="No platform content yet" description="Create your first announcement or policy." />
            )}
            <Pager links={contents.links} />
        </Page>
    );
}
