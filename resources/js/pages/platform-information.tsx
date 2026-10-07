import { Card, Empty, Page, Pager, type Pagination } from '@/components/marketplace-ui';
type Content = { id: number; kind: string; title: string; body: string };
export default function Information({ contents }: { contents: Pagination<Content> }) {
    return (
        <Page title="Announcements & policies" description="Updates and guidelines from LubosMart.">
            {contents.data.length ? (
                contents.data.map((content) => (
                    <Card key={content.id}>
                        <p className="text-primary mb-2 text-xs font-medium capitalize">{content.kind}</p>
                        <h2 className="text-lg font-semibold break-words">{content.title}</h2>
                        <p className="text-muted-foreground mt-4 text-sm leading-relaxed break-words whitespace-pre-wrap">{content.body}</p>
                    </Card>
                ))
            ) : (
                <Empty title="No updates yet" description="Published announcements and policies will appear here." />
            )}
            <Pager links={contents.links} />
        </Page>
    );
}
