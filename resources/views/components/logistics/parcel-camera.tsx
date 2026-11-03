import { secondaryClass } from '@/components/shared/marketplace-ui';
import { createParcelDecoder } from '@/lib/parcel-decoder';
import { useEffect, useRef, useState } from 'react';

export default function ParcelCamera({ onScan }: { onScan: (reference: string) => void }) {
    const video = useRef<HTMLVideoElement>(null);
    const stream = useRef<MediaStream | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const generation = useRef(0);
    const [active, setActive] = useState(false);
    const [starting, setStarting] = useState(false);
    const [message, setMessage] = useState('');
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
    };
    const start = async () => {
        stopMedia();
        const session = generation.current;
        setStarting(true);
        setMessage('');
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error(
                    'This browser does not support camera barcode scanning. Use a USB / Bluetooth scanner or enter the printed tracking reference.',
                );
            }
            const decode = await createParcelDecoder();
            if (session !== generation.current) return;
            const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
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
            const scan = async () => {
                if (session !== generation.current) return;
                try {
                    const values = await decode(element);
                    if (session !== generation.current) return;
                    const reference = values.find((value) => /^LM-[0-9A-F]{32}$/.test(value));
                    if (reference) {
                        stop();
                        setMessage('Parcel reference captured. Review the parcel and confirm the operation.');
                        onScan(reference);
                        return;
                    }
                } catch {
                    // An unreadable frame can be retried without submitting a parcel action.
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
                <button type="button" className={secondaryClass} disabled={starting || active} onClick={() => void start()}>
                    {starting ? 'Opening camera…' : 'Scan with camera'}
                </button>
                {(active || starting) && (
                    <button type="button" className={secondaryClass} onClick={stop}>
                        Stop camera
                    </button>
                )}
            </div>
            <video
                ref={video}
                muted
                playsInline
                aria-label="Parcel barcode camera preview"
                className={active ? 'bg-muted aspect-video w-full rounded-xl object-cover' : 'hidden'}
            />
            {message && (
                <p role="status" className="text-muted-foreground text-sm">
                    {message}
                </p>
            )}
        </div>
    );
}
