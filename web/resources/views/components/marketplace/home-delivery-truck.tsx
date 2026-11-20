import type { SVGProps } from 'react';

type HomeDeliveryTruckProps = SVGProps<SVGSVGElement> & { animated?: boolean };

export default function HomeDeliveryTruck({ animated = true, ...props }: HomeDeliveryTruckProps) {
    return (
        <svg className="home-delivery-truck" viewBox="0 0 360 150" width="240" height="100" fill="none" aria-hidden="true" {...props}>
            <ellipse cx="196" cy="140" rx="147" ry="5" fill="currentColor" opacity=".12" />
            <g className="home-delivery-exhaust" fill="var(--muted-foreground)" visibility={animated ? undefined : 'hidden'}>
                {[0, 1, 2, 3].map((puff) => (
                    <circle key={puff} className="home-delivery-smoke" cx="64" cy="120" r="5" style={{ animationDelay: `${puff * -0.45}s` }} />
                ))}
            </g>
            <g className={animated ? 'home-delivery-body' : undefined}>
                <path d="M67 114H330V130H67z" fill="#292936" />
                <path d="M72 122H59v5h16" stroke="#737380" strokeWidth="4" strokeLinejoin="round" />
                <rect x="75" y="20" width="178" height="96" rx="3" fill="var(--brand-orange)" />
                <path d="M84 31H244V105H84z" fill="#34303f" />
                <path d="M84 105H244L235 97H94z" fill="#d49b60" />
                <path d="M84 31H94V97L84 105z" fill="#efad62" />
                <path d="M102 72h39v29h-39z" fill="#d4a36d" />
                <path d="M116 72h9v29h-9z" fill="#f1d3a5" />
                <path d="M106 77h6m-6 4h6" stroke="#86613e" strokeWidth="2" />
                <path d="M143 81h44v20h-44z" fill="#bd8756" />
                <path d="M160 81h9v20h-9z" fill="#f1d3a5" />
                <path d="M139 48h37v31h-37z" fill="#ddb587" />
                <path d="M153 48h8v31h-8z" fill="#f5d9b2" />
                <path d="m105 58 24-6 5 19-24 6z" fill="#292936" />
                <path d="m109 60 17-4 3 11-17 4z" fill="#a9cbd6" />
                <path d="M181 38h28v42h-28z" fill="#e9e7ee" />
                <path d="M182 56h26m-22-11v7m0 9v8" stroke="#96919e" strokeWidth="2" />
                <rect x="192" y="72" width="39" height="30" rx="2" fill="#f3f0f5" />
                <circle cx="212" cy="88" r="10" fill="#aaa5b4" />
                <circle cx="212" cy="88" r="7" fill="#50505f" />
                <path d="M198 76h4m18 0h5" stroke="#827b8e" strokeWidth="2" />
                <path d="M215 47h20v23h-20z" fill="#bb8c5c" />
                <path d="M222 47h5v23h-5z" fill="#f5d9b2" />
                <path d="M211 43h25v4h-25z" fill="currentColor" />
                <path d="M214 39h20v4h-20z" fill="#e9e7ee" />
                <path d="M217 35h17v4h-17z" fill="var(--brand-orange)" />
                <path d="M151 43h13l-2 5h-9z" fill="#cc805e" />
                <path d="M157 43V33m0 6c-8 0-8-8-8-8 8 0 8 8 8 8Zm0-2c8 0 8-8 8-8-8 0-8 8-8 8Z" stroke="#72a384" strokeWidth="3" />
                <rect x="72" y="17" width="184" height="7" rx="2" fill="#c8c6d0" />
                <path d="M75 24v87m178-87v87" stroke="#e5e2e9" strokeWidth="5" />
                <rect x="72" y="108" width="184" height="8" rx="2" fill="#b6b2c1" />
                <path d="M83 112h12m9 0h12m9 0h12m9 0h12m9 0h12m9 0h12m9 0h12m9 0h12" stroke="var(--brand-orange)" strokeWidth="3" />
                <path d="M259 58h34c8 0 13 5 17 12l22 31v20h-73V58Z" fill="currentColor" />
                <path d="M266 64h25c5 0 8 3 11 8l13 21h-49V64Z" fill="#aed4df" />
                <path d="M291 65v27m-23 8h12" stroke="#3e315a" strokeWidth="3" />
                <path d="M260 106h69v8h-69z" fill="var(--brand-orange)" />
                <path d="M260 117h75v9h-75z" fill="#a9a6b3" />
                <rect x="322" y="99" width="9" height="7" rx="2" fill="#ffe1a0" />
                <path d="M314 77h9v17h-5" stroke="#393345" strokeWidth="3" strokeLinejoin="round" />
                <path d="M86 117h40m25 0h108" stroke="#686371" strokeWidth="4" />
                <path d="M174 121h42v10h-42z" fill="#a9a6b3" />
            </g>
            {[115, 290].map((cx) => (
                <g className={animated ? 'home-delivery-wheel' : undefined} key={cx} style={{ transformOrigin: `${cx}px 123px` }}>
                    <circle cx={cx} cy="123" r="18" fill="#252530" />
                    <circle cx={cx} cy="123" r="13" stroke="#777381" strokeWidth="2" />
                    <circle cx={cx} cy="123" r="10" fill="#c8c6d0" />
                    {[0, 60, 120, 180, 240, 300].map((angle) => (
                        <circle key={angle} cx={cx} cy="116" r="2" fill="#565160" transform={`rotate(${angle} ${cx} 123)`} />
                    ))}
                    <circle cx={cx} cy="123" r="4" fill="#777381" />
                </g>
            ))}
        </svg>
    );
}
