import { useEffect, useState } from 'react';

type Code = { reference: string; path: string; size: number };

export default function ParcelQrCode({ reference }: { reference: string }) {
    const [code, setCode] = useState<Code | null>(null);
    const [failedReference, setFailedReference] = useState('');
    const valid = /^LM-[0-9A-F]{32}$/.test(reference);

    useEffect(() => {
        if (!valid) return;
        let cancelled = false;
        void import('@zxing/library')
            .then(({ QRCodeWriter, BarcodeFormat, EncodeHintType }) => {
                const hints = new Map();
                hints.set(EncodeHintType.ERROR_CORRECTION, 'M');
                hints.set(EncodeHintType.MARGIN, 4);
                const matrix = new QRCodeWriter().encode(reference, BarcodeFormat.QR_CODE, 0, 0, hints);
                const parts: string[] = [];
                for (let y = 0; y < matrix.getHeight(); y++) {
                    for (let x = 0; x < matrix.getWidth(); x++) {
                        if (matrix.get(x, y)) parts.push(`M${x},${y}h1v1h-1z`);
                    }
                }
                if (!cancelled) setCode({ reference, path: parts.join(''), size: matrix.getWidth() });
            })
            .catch(() => {
                if (!cancelled) setFailedReference(reference);
            });
        return () => {
            cancelled = true;
        };
    }, [reference, valid]);

    if (!valid) return null;
    return (
        <figure className="my-5 flex flex-col items-center gap-2 bg-white p-3 text-black">
            {code?.reference === reference ? (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox={`0 0 ${code.size} ${code.size}`}
                    role="img"
                    aria-label={`Parcel QR code ${reference}`}
                    className="size-48 max-w-full print:size-40"
                    shapeRendering="crispEdges"
                >
                    <rect width={code.size} height={code.size} fill="#ffffff" />
                    <path d={code.path} fill="#000000" />
                </svg>
            ) : (
                <p role="status" className="text-center text-sm">
                    {failedReference === reference ? 'QR unavailable. Use the barcode or printed tracking reference.' : 'Preparing parcel QR code...'}
                </p>
            )}
            <figcaption className="text-center text-xs">Phone camera QR · Same tracking reference as the barcode</figcaption>
        </figure>
    );
}
