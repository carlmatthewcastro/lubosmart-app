import { buttonClass, secondaryClass } from '@/components/shared/marketplace-ui';
import { createParcelDecoder, parcelReference } from '@/lib/parcel-decoder';
import { useEffect, useRef, useState } from 'react';

export default function ParcelCamera({ onScan }: { onScan: (reference: string) => void }) {
    const video = useRef<HTMLVideoElement>(null);
    const stream = useRef<MediaStream | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const generation = useRef(0);
    const currentScan = useRef(onScan);
    currentScan.current = onScan;
    const [active, setActive] = useState(false);
    const [starting, setStarting] = useState(false);
    const [message, setMessage] = useState('');
    const [captured, setCaptured] = useState('');
    const stopMedia = () => {
        generation.current++;
        clearTimeout(timer.current);
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        if (video.current) video.current.srcObject = null;
    };
    useEffect(() => () => stopMedia(), []);
    const stop = () => {
        stopMedia();
        setActive(false);
        setStarting(false);
        setMessage('Camera stopped. No parcel operation was submitted.');
    };
    const start = async () => {
        stopMedia();
        const session = generation.current;
        setStarting(true);
        setMessage('');
        setCaptured('');
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error(
                    'This browser does not support camera barcode scanning. Use a USB / Bluetooth scanner or enter the printed tracking reference.',
                );
            }
            const decode = await createParcelDecoder();
            if (session !== generation.current) return;
            const media = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false,
            });
            if (session !== generation.current) {
                media.getTracks().forEach((track) => track.stop());
                return;
            }
            stream.current = media;
            setActive(true);
            const element = video.current;
            if (!element) throw new Error('Camera preview is unavailable. Use manual tracking entry.');
            element.srcObject = media;
            await element.play();
            if (session !== generation.current) return;
            const started = Date.now();
            let guidanceShown = false;
            setMessage('Scanning. Keep the full barcode and its white margins visible; hold the label steady.');
            const scan = async () => {
                if (session !== generation.current) return;
                try {
                    const values = await decode(element);
                    if (session !== generation.current) return;
                    const reference = values.map(parcelReference).find((value) => value !== null);
                    if (reference) {
                        stop();
                        setCaptured(reference);
                        setMessage('Parcel reference captured. Review the parcel and confirm the operation.');
                        currentScan.current(reference);
                        return;
                    }
                } catch {
                    // An unreadable frame can be retried without submitting a parcel action.
                }
                if (session !== generation.current) return;
                if (!guidanceShown && Date.now() - started >= 8000) {
                    guidanceShown = true;
                    setMessage(
                        'No barcode captured yet. Move the label closer or farther until the bars look sharp. Avoid screen glare; try a printed waybill or manual entry if needed.',
                    );
                }
                if (session === generation.current) timer.current = setTimeout(() => void scan(), 200);
            };
            timer.current = setTimeout(() => void scan(), 0);
        } catch (error) {
            if (session !== generation.current) return;
            stop();
            setMessage(
                error instanceof Error && error.name !== 'NotAllowedError'
                    ? error.message
                    : 'Camera access was denied. Use a USB / Bluetooth scanner or manual tracking entry.',
            );
        } finally {
            if (session === generation.current) setStarting(false);
        }
    };
    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap gap-3">
                <button
                    type="button"
                    className={`${buttonClass} w-full sm:w-auto ${active ? 'hidden sm:inline-flex' : ''}`}
                    disabled={starting || active}
                    onClick={() => void start()}
                >
                    {starting ? 'Opening camera…' : 'Scan with camera'}
                </button>
                {(active || starting) && (
                    <button type="button" className={`${secondaryClass} w-full sm:w-auto`} onClick={stop}>
                        Stop camera
                    </button>
                )}
            </div>
            <video
                ref={video}
                muted
                playsInline
                aria-label="Parcel barcode camera preview"
                className={active ? 'bg-muted aspect-[4/3] max-h-[50dvh] w-full rounded-xl object-contain sm:aspect-video' : 'hidden'}
            />
            {message && (
                <p role="status" className="text-muted-foreground text-sm">
                    {message}
                </p>
            )}
            {captured && (
                <p className="text-success text-sm font-medium break-all">
                    Captured tracking reference: <span className="font-mono">{captured}</span>
                </p>
            )}
        </div>
    );
}
