import JsBarcode from 'jsbarcode';
import { useEffect, useRef } from 'react';

export default function ParcelBarcode({ reference }: { reference: string }) {
    const svg = useRef<SVGSVGElement>(null);
    const valid = /^LM-[0-9A-F]{32}$/.test(reference);

    useEffect(() => {
        if (!valid || !svg.current) return;
        const element = svg.current;
        JsBarcode(element, reference, {
            format: 'CODE128',
            width: 2,
            height: 80,
            margin: 20,
            displayValue: false,
            background: '#ffffff',
            lineColor: '#000000',
        });
        // JsBarcode emits CSS lengths (for example 836px); SVG viewBox requires unitless numbers.
        const width = Number.parseFloat(element.getAttribute('width') ?? '0');
        const height = Number.parseFloat(element.getAttribute('height') ?? '0');
        element.setAttribute('viewBox', `0 0 ${width} ${height}`);
        element.removeAttribute('width');
        element.removeAttribute('height');
    }, [reference, valid]);

    if (!valid) return null;
    return (
        <figure className="my-5 bg-white p-3 text-black">
            <svg
                ref={svg}
                role="img"
                aria-label={`Parcel barcode ${reference}`}
                className="h-auto w-full"
                preserveAspectRatio="xMidYMid meet"
                shapeRendering="crispEdges"
            />
            <figcaption className="mt-3 text-center font-mono text-xs break-all">{reference}</figcaption>
        </figure>
    );
}
