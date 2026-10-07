import type { SVGAttributes } from 'react';
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg viewBox="0 0 72 68" fill="none" aria-hidden="true" {...props}>
            <image href="/logo.svg" width="72" height="68" />
        </svg>
    );
}
