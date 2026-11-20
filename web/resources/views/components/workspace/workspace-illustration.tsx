import HomeDeliveryTruck from '@/components/marketplace/home-delivery-truck';
import { ChartNoAxesCombined, Check, Package, ShieldCheck, Store } from 'lucide-react';

/** Decorative delivery scene. Semantic colors follow the selected theme. */
export function WorkspaceIllustration({ variant = 'delivery' }: { variant?: 'delivery' | 'store' | 'platform' }) {
    if (variant !== 'delivery') {
        const Icon = variant === 'store' ? Store : ChartNoAxesCombined;
        const DetailIcon = variant === 'store' ? Package : ShieldCheck;
        return (
            <svg aria-hidden="true" focusable="false" viewBox="0 0 480 240" className="text-primary h-auto w-full">
                <circle cx="270" cy="116" r="108" fill="currentColor" opacity=".06" />
                <circle cx="270" cy="116" r="90" fill="none" stroke="currentColor" strokeDasharray="5 9" opacity=".2" />
                <ellipse cx="250" cy="222" rx="195" ry="8" fill="currentColor" opacity=".1" />
                <rect x="99" y="40" width="254" height="168" rx="20" className="fill-card" stroke="currentColor" strokeOpacity=".2" />
                <rect x="99" y="40" width="254" height="36" rx="18" fill="currentColor" opacity=".1" />
                <circle cx="119" cy="58" r="4" fill="color-mix(in srgb, var(--brand-orange), white 30%)" />
                <circle cx="133" cy="58" r="4" fill="currentColor" opacity=".35" />
                <Icon x="124" y="94" width="90" height="90" strokeWidth="1.4" />
                <rect x="236" y="103" width="89" height="9" rx="4" fill="currentColor" opacity=".25" />
                <rect x="236" y="125" width="66" height="7" rx="3" fill="currentColor" opacity=".12" />
                <rect x="236" y="148" width="80" height="30" rx="8" fill="currentColor" opacity=".1" />
                <Check x="244" y="155" width="16" height="16" />
                <path d="M270 163h34" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".5" />
                <g transform="rotate(8 364 173)">
                    <rect x="319" y="129" width="91" height="86" rx="18" className="fill-primary" />
                    <DetailIcon x="341" y="149" width="46" height="46" className="text-primary-foreground" strokeWidth="1.5" />
                </g>
                <circle cx="364" cy="62" r="25" fill="currentColor" opacity=".15" />
                <Check x="350" y="48" width="28" height="28" strokeWidth="2.5" />
                <path d="m67 111 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="color-mix(in srgb, var(--brand-orange), white 30%)" />
            </svg>
        );
    }
    return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 480 200" className="text-primary h-auto w-full">
            <ellipse cx="265" cy="190" rx="205" ry="5" fill="currentColor" opacity=".12" />
            <path d="M0 190C20 90 95 20 210 35S390 0 480 15V190Z" fill="currentColor" opacity=".06" />
            <path d="M170 190C215 80 370 75 480 105V190Z" fill="currentColor" opacity=".05" />
            <svg x="20" y="48" width="330" height="145" viewBox="0 0 360 150">
                <HomeDeliveryTruck animated={false} width="360" height="150" />
            </svg>
            <g className="fill-brand-orange stroke-brand-orange" strokeWidth="1">
                <rect x="340" y="134" width="54" height="54" rx="4" fillOpacity=".55" strokeOpacity=".2" />
                <rect x="398" y="148" width="49" height="40" rx="4" fillOpacity=".35" strokeOpacity=".2" />
                <rect x="354" y="93" width="59" height="39" rx="4" fillOpacity=".4" strokeOpacity=".2" />
            </g>
            <path d="M365 134V151M421 148V161M383 94V107" className="stroke-card" strokeWidth="8" opacity=".65" />
            <path d="M386 19C371 19 363 29 363 40C363 55 386 74 386 74S409 55 409 40C409 29 401 19 386 19Z" fill="currentColor" opacity=".8" />
            <circle cx="386" cy="39" r="8" className="fill-card" />
        </svg>
    );
}
