import {
    BarChart3,
    Boxes,
    Check,
    ClipboardList,
    MapPinned,
    MessageSquare,
    RotateCcw,
    ScanLine,
    Settings,
    ShieldCheck,
    Truck,
    Users,
    Wallet,
} from 'lucide-react';

function illustrationFor(title: string) {
    if (/scan/i.test(title)) return ScanLine;
    if (/coverage|rates|address/i.test(title)) return MapPinned;
    if (/cash|remittance|allocation|settlement|payment/i.test(title)) return Wallet;
    if (/rider/i.test(title)) return Users;
    if (/report/i.test(title)) return BarChart3;
    if (/return/i.test(title)) return RotateCcw;
    if (/record|history/i.test(title)) return ClipboardList;
    if (/delivery/i.test(title)) return Truck;
    if (/notification/i.test(title)) return ShieldCheck;
    if (/message|support/i.test(title)) return MessageSquare;
    if (/setting|password|profile|security|personal|contact|document/i.test(title)) return Settings;
    return Boxes;
}

export default function LogisticsPageBanner({ title, description }: { title: string; description?: string }) {
    const Icon = illustrationFor(title);

    return (
        <div className="from-primary to-primary/90 text-primary-foreground dark:to-primary relative isolate flex min-h-44 items-center overflow-hidden rounded-3xl bg-linear-to-r px-6 py-8 sm:min-h-52 sm:px-10">
            <div className="relative z-10 min-w-0 sm:w-2/3 sm:pr-6">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
                {description && <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base">{description}</p>}
            </div>
            <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 360 220"
                className="pointer-events-none absolute right-4 hidden h-52 w-1/3 max-w-80 sm:block"
            >
                <circle cx="210" cy="110" r="96" fill="currentColor" opacity=".06" />
                <circle cx="210" cy="110" r="75" stroke="currentColor" strokeDasharray="5 9" opacity=".25" />
                <ellipse cx="180" cy="195" rx="150" ry="12" fill="currentColor" className="text-primary" opacity=".5" />
                <path d="m35 105 65-27 65 27-65 27Z" fill="#ffdda7" />
                <path d="m35 105 65 27v60l-65-27Z" fill="#ffc46c" />
                <path d="m100 132 65-27v60l-65 27Z" fill="#efa653" />
                <path d="m60 95 65 27 20-9-65-27Z" fill="#926078" />
                <path d="m125 122 20-9v30l-20 8Z" fill="#79506b" />
                <path d="m49 139 29 12m-29-1 18 8" stroke="#fff1d6" strokeWidth="4" strokeLinecap="round" />
                <g transform="rotate(8 225 120)">
                    <rect x="164" y="61" width="120" height="120" rx="20" fill="#f8f2ff" />
                    <rect x="181" y="77" width="70" height="8" rx="4" fill="#dfd0f1" />
                    <Icon x="191" y="101" width="66" height="60" className="text-primary" strokeWidth="1.7" />
                </g>
                <circle cx="282" cy="60" r="26" fill="#dac5f4" />
                <Check x="266" y="44" width="32" height="32" className="text-primary" strokeWidth="3" />
                <path d="m26 57 4 10 10 4-10 4-4 10-4-10-10-4 10-4Zm296 91 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#dac5f4" />
                <circle cx="88" cy="39" r="4" fill="#ffdda7" />
            </svg>
        </div>
    );
}
