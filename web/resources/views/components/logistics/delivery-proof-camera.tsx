import { buttonClass, secondaryClass } from '@/components/shared/marketplace-ui';
import { useEffect, useRef, useState } from 'react';

export default function DeliveryProofCamera({
    onCapture,
    required = true,
    label,
}: {
    onCapture: (file: File | null) => void;
    required?: boolean;
    label?: string;
}) {
    const video = useRef<HTMLVideoElement>(null);
    const stream = useRef<MediaStream | null>(null);
    const [preview, setPreview] = useState('');
    const [starting, setStarting] = useState(false);
    const [active, setActive] = useState(false);
    const [error, setError] = useState('');
    const stop = () => {
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
    };
    useEffect(() => () => stop(), []);
    useEffect(
        () => () => {
            if (preview) URL.revokeObjectURL(preview);
        },
        [preview],
    );
    const start = async () => {
        setError('');
        setStarting(true);
        try {
            if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires a supported browser and HTTPS or localhost.');
            stop();
            const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
            stream.current = media;
            if (!video.current) {
                stop();
                return;
            }
            video.current.srcObject = media;
            await video.current.play();
            setActive(true);
            onCapture(null);
            setPreview('');
        } catch (exception) {
            stop();
            setActive(false);
            setError(exception instanceof Error ? exception.message + ' Allow camera access and try again.' : 'Unable to open camera. Try again.');
        } finally {
            setStarting(false);
        }
    };
    const capture = () => {
        const element = video.current;
        if (!element?.videoWidth) return;
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1800 / element.videoWidth);
        canvas.width = element.videoWidth * scale;
        canvas.height = element.videoHeight * scale;
        canvas.getContext('2d')?.drawImage(element, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    setError('Photo capture failed. Try again.');
                    return;
                }
                onCapture(new File([blob], 'delivery-proof.jpg', { type: 'image/jpeg' }));
                setPreview(URL.createObjectURL(blob));
                stop();
                setActive(false);
            },
            'image/jpeg',
            0.85,
        );
    };
    return (
        <div className="grid gap-4">
            <p className="text-sm font-medium">
                {label ?? (required ? 'Proof of delivery photo (required)' : 'Supporting photo (optional; capture only when safe)')}
            </p>
            <video
                ref={video}
                muted
                playsInline
                aria-label="Delivery photo camera preview"
                className={active ? 'bg-muted aspect-video w-full rounded-xl object-contain' : 'hidden'}
            />
            {preview && <img src={preview} alt="Captured delivery proof" className="aspect-video w-full rounded-xl object-contain" />}
            {error && (
                <p role="alert" className="text-destructive text-sm">
                    {error}
                </p>
            )}
            <div className="flex flex-wrap gap-3">
                {!active && (
                    <button type="button" disabled={starting} className={secondaryClass} onClick={start}>
                        {preview ? 'Retake photo' : 'Open camera'}
                    </button>
                )}
                {active && (
                    <>
                        <button type="button" className={buttonClass} onClick={capture}>
                            Capture photo
                        </button>
                        <button
                            type="button"
                            className={secondaryClass}
                            onClick={() => {
                                stop();
                                setActive(false);
                            }}
                        >
                            Close camera
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
