// Verify generated demo references survive the same ZXing encoder/decoder used by waybills.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { QRCodeWriter, BarcodeFormat, EncodeHintType, DecodeHintType, RGBLuminanceSource, HybridBinarizer, BinaryBitmap, MultiFormatReader } = require('@zxing/library');

const root = path.resolve(__dirname, '../..');
const guide = JSON.parse(fs.readFileSync(path.join(root, 'storage/app/private/demo/lubosmart-guide.json'), 'utf8'));
const source = path.join(root, 'resources/js/lib/parcel-decoder.ts');
const compiled = ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const decoderModule = new Module(source, module);
decoderModule.filename = source;
decoderModule.paths = module.paths;
decoderModule._compile(compiled.outputText, source);
const { parcelReference } = decoderModule.exports;
const output = path.join(root, 'storage/app/private/demo/qr-labels');
fs.mkdirSync(output, { recursive: true });
let checked = 0;
for (const scenario of guide.scenario_guide) {
    for (const parcel of scenario.parcels) {
        const reference = parcel.tracking_reference;
        assert.equal(parcelReference(reference), reference);
        const hints = new Map([[EncodeHintType.ERROR_CORRECTION, 'M'], [EncodeHintType.MARGIN, 4]]);
        const matrix = new QRCodeWriter().encode(reference, BarcodeFormat.QR_CODE, 0, 0, hints);
        const size = matrix.getWidth();
        const width = size * 8;
        const pixels = new Uint8ClampedArray(width * width);
        const shapes = [];
        for (let y = 0; y < width; y++) {
            for (let x = 0; x < width; x++) pixels[y * width + x] = matrix.get(Math.floor(x / 8), Math.floor(y / 8)) ? 0 : 255;
        }
        const reader = new MultiFormatReader();
        // These are already isolated, generated QR pixels. Camera acquisition is a separate check.
        reader.setHints(new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]], [DecodeHintType.TRY_HARDER, true], [DecodeHintType.PURE_BARCODE, true]]));
        assert.equal(parcelReference(reader.decodeWithState(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels, width, width)))).getText()), reference);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) if (matrix.get(x, y)) shapes.push(`M${x},${y}h1v1h-1z`);
        }
        fs.writeFileSync(path.join(output, `${reference}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" width="328" height="328" viewBox="0 0 ${size} ${size}"><title>DEMO parcel ${reference}</title><rect width="${size}" height="${size}" fill="white"/><path d="${shapes.join('')}" fill="black"/></svg>`);
        checked++;
    }
}
assert.equal(parcelReference('https://example.invalid/unrelated'), null);
fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({ references_checked: checked, status: 'passed', test: 'Pure QR pixel decode and application reference validation', browser_camera_acquisition: 'unverified', physical_camera: 'unverified' }, null, 2));
console.log(`${checked} system-generated demo tracking references passed QR pixel encoding/decoding and scanner reference validation. Physical camera scanning remains unverified.`);
