type Detector = { detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorConstructor = { new (options: { formats: string[] }): Detector; getSupportedFormats: () => Promise<string[]> };

export function parcelReference(value: string): string | null {
    const reference = value.trim().toUpperCase();
    return /^LM-[0-9A-F]{32}$/.test(reference) ? reference : null;
}

// Code 39, Code 128 and phone-friendly QR labels carry the same parcel identity.
export async function createParcelDecoder(): Promise<(video: HTMLVideoElement) => Promise<string[]>> {
    const Barcode = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    let detector: Detector | undefined;
    if (Barcode) {
        try {
            const supported = await Barcode.getSupportedFormats();
            const formats = ['code_39', 'code_128', 'qr_code'].filter((format) => supported.includes(format));
            if (formats.length) {
                detector = new Barcode({ formats });
            }
        } catch {
            // Some browsers expose the API without a working implementation.
        }
    }

    // A browser may advertise these formats but still fail to decode camera frames.
    // Keep the software decoder available after empty/invalid native results too.
    const loadSoftwareDecoder = async () => {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
            import('@zxing/browser'),
            import('@zxing/library'),
        ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_39, BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Camera decoding is unavailable. Use a scanner or manual tracking entry.');

        return (video: HTMLVideoElement): string[] => {
            if (!video.videoWidth || !video.videoHeight) return [];
            const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
            const width = Math.round(video.videoWidth * scale);
            const height = Math.round(video.videoHeight * scale);
            for (const rotated of [false, true]) {
                // Rotate the pixels explicitly: canvas-source rotation can retain stale dimensions.
                canvas.width = rotated ? height : width;
                canvas.height = rotated ? width : height;
                context.save();
                if (rotated) {
                    context.translate(0, width);
                    context.rotate(-Math.PI / 2);
                }
                context.drawImage(video, 0, 0, width, height);
                context.restore();
                for (let attempt = 0; attempt < 2; attempt++) {
                    try {
                        const reference = parcelReference(reader.decodeFromCanvas(canvas).getText());
                        if (reference) return [reference];
                    } catch {
                        // An unreadable frame is normal; try inverted contrast, then the next frame.
                    }
                    context.globalCompositeOperation = 'difference';
                    context.fillStyle = 'white';
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    context.globalCompositeOperation = 'source-over';
                }
            }
            return [];
        };
    };
    let softwareDecoder: ReturnType<typeof loadSoftwareDecoder> | undefined;

    return async (video) => {
        if (detector) {
            try {
                const values = (await detector.detect(video))
                    .map(({ rawValue }) => parcelReference(rawValue))
                    .filter((value): value is string => value !== null);
                if (values.length) return values;
            } catch {
                detector = undefined;
            }
        }
        softwareDecoder ??= loadSoftwareDecoder();
        return (await softwareDecoder)(video);
    };
}
