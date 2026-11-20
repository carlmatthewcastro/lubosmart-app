// Import the public PHLPost locator table from a previously downloaded HTML file.
const fs = require('node:fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const clean = (value) =>
    value
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&#039;|&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((row) => [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => clean(cell[1])))
    .filter((cells) => cells.length === 4 && cells[1] && cells[2] && /^\d{4}$/.test(cells[3]));
if (rows.length < 100) throw new Error('Postal-code table could not be parsed; import refused.');
fs.mkdirSync('resources/data', { recursive: true });
fs.writeFileSync(
    'resources/data/phlpost-postal-codes.json',
    JSON.stringify(
        {
            source: 'https://phlpost.gov.ph/zip-code-locator/',
            retrieved: '2026-10-13',
            columns: ['region', 'province', 'locality', 'zip'],
            rows,
        },
        null,
        2,
    ) + '\n',
);
console.log(rows.length + ' postal records imported');
console.log(rows.filter((row) => /Pasig|Quezon City|Commonwealth/i.test(row[1] + ' ' + row[2])).slice(0, 12));
