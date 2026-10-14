import { assets } from '@/config/assets';
import type { SVGAttributes } from 'react';
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg viewBox="0 0 72 68" fill="none" aria-hidden="true" {...props}>
            <image href={assets.brand.logo} width="72" height="68" />
        </svg>
    );
}
