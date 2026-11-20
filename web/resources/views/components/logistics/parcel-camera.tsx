import { buttonClass, secondaryClass } from '@/components/shared/marketplace-ui';
import { createParcelDecoder, parcelReference } from '@/lib/parcel-decoder';
import { Camera, LoaderCircle, ScanLine, Square } from 'lucide-react';
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
            <div className="order-2 flex flex-wrap gap-3">
                <button
                    type="button"
                    className={`${active || starting ? secondaryClass : buttonClass} w-full`}
                    onClick={() => (active || starting ? stop() : void start())}
                >
                    {starting ? (
                        <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
                    ) : active ? (
                        <Square aria-hidden="true" className="size-4" />
                    ) : (
                        <Camera aria-hidden="true" className="size-4" />
                    )}
                    {starting ? 'Cancel opening camera' : active ? 'Stop camera' : 'Start camera'}
                </button>
            </div>
            <div className="bg-muted/60 relative isolate flex h-56 w-full items-center justify-center overflow-hidden rounded-xl border sm:h-64">
                <video
                    ref={video}
                    muted
                    playsInline
                    aria-label="Parcel barcode camera preview"
                    className={active ? 'absolute inset-0 size-full object-contain' : 'hidden'}
                />
                {!active && (
                    <div className="text-muted-foreground flex flex-col items-center gap-2 px-6 text-center">
                        <ScanLine className="size-8" aria-hidden="true" />
                        <p className="text-foreground text-sm font-medium">
                            {captured ? 'Waybill captured' : 'Position the waybill inside the frame'}
                        </p>
                        <p className="max-w-64 text-xs leading-relaxed">
                            {captured ? 'Your parcel details are ready for review.' : 'Keep the QR code or barcode clear and fully visible.'}
                        </p>
                    </div>
                )}
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-[12%] inset-y-[18%]">
                    <span className="border-primary absolute top-0 left-0 size-7 rounded-tl-lg border-t-2 border-l-2" />
                    <span className="border-primary absolute top-0 right-0 size-7 rounded-tr-lg border-t-2 border-r-2" />
                    <span className="border-primary absolute bottom-0 left-0 size-7 rounded-bl-lg border-b-2 border-l-2" />
                    <span className="border-primary absolute right-0 bottom-0 size-7 rounded-br-lg border-r-2 border-b-2" />
                    {active && <span className="parcel-scan-line bg-primary absolute inset-x-3 top-1/2 h-0.5" />}
                </div>
            </div>
            {message && (
                <p role="status" className="text-muted-foreground order-3 text-sm leading-relaxed">
                    {message}
                </p>
            )}
            {captured && (
                <p className="text-success order-4 text-sm font-medium break-all">
                    Captured tracking reference: <span className="font-mono">{captured}</span>
                </p>
            )}
        </div>
    );
}
