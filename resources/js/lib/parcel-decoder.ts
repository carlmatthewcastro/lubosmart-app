type Detector = { detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorConstructor = { new (options: { formats: string[] }): Detector; getSupportedFormats: () => Promise<string[]> };

// Existing Code 39 labels and new compact Code 128 labels carry the same identity.
export async function createParcelDecoder(): Promise<(video: HTMLVideoElement) => Promise<string[]>> {
    const Barcode = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    if (Barcode) {
        try {
            const supported = await Barcode.getSupportedFormats();
            if (['code_39', 'code_128'].every((format) => supported.includes(format))) {
                const detector = new Barcode({ formats: ['code_39', 'code_128'] });
                return async (video) => (await detector.detect(video)).map(({ rawValue }) => rawValue);
            }
        } catch {
            // Some browsers expose the API without a working implementation.
        }
    }

    // Load the browser port of ZXing only when camera scanning needs it.
    const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import('@zxing/browser'), import('@zxing/library')]);
    const reader = new BrowserMultiFormatReader(new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_39, BarcodeFormat.CODE_128]]]));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Camera decoding is unavailable. Use a scanner or manual tracking entry.');

    return async (video) => {
        if (!video.videoWidth || !video.videoHeight) return [];
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        return [reader.decodeFromCanvas(canvas).getText()];
    };
}
