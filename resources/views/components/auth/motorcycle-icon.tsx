import type { SVGProps } from 'react';

export default function MotorcycleIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <circle cx="5" cy="17" r="3.5" />
            <circle cx="19" cy="17" r="3.5" />
            <path d="m19 17-4-10h-2m2 0h3l1 2M3 12h5l3 3h3M5 17h7l2-4M4 10h5" />
            <path d="M9 11c1-3 5-3 6-1l-1 3h-4z" fill="currentColor" strokeWidth="1" />
            <path d="M10 14h3v3h-3z" fill="currentColor" strokeWidth="1" />
        </svg>
    );
}
