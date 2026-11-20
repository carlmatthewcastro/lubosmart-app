import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import type { ReactNode } from 'react';

export function DirectoryIdentity({ name, avatar, children }: { name: string; avatar?: string; children?: ReactNode }) {
    const initials = useInitials();
    return (
        <div className="flex min-w-0 items-center gap-3">
            <Avatar aria-hidden="true">
                <AvatarImage src={avatar} alt="" className="object-cover" />
                <AvatarFallback className="bg-accent text-primary text-sm font-semibold">{initials(name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <div className="font-semibold break-words">{name}</div>
                {children}
            </div>
        </div>
    );
}

export function AccountDirectory<T extends { id: number }>({
    label,
    items,
    columns,
}: {
    label: string;
    items: T[];
    columns: { label: string; render: (item: T) => ReactNode }[];
}) {
    return (
        <div className="bg-card min-w-0 overflow-hidden rounded-2xl border shadow-sm">
            <div
                role="region"
                aria-label={label}
                tabIndex={0}
                className="focus-visible:ring-ring overflow-x-auto focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
            >
                <table className="w-full min-w-3xl text-left text-sm">
                    <caption className="sr-only">{label}</caption>
                    <thead className="bg-accent/40 text-foreground">
                        <tr>
                            {columns.map((column) => (
                                <th key={column.label} scope="col" className="px-5 py-4 text-xs font-semibold whitespace-nowrap">
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {items.map((item) => (
                            <tr
                                key={item.id}
                                className="hover:bg-accent/20 focus-within:bg-accent/20 transition-colors motion-reduce:transition-none"
                            >
                                {columns.map((column) => (
                                    <td key={column.label} className="max-w-sm px-5 py-3 align-middle break-words">
                                        {column.render(item)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
