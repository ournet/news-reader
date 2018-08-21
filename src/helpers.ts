
const jschardet = require('jschardet');
const ellipsize = require('ellipsize');

export function truncateAt(text: string, maxLength: number): string {
    return ellipsize(text, maxLength, { truncate: false });
}

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function detectEncoding(data: string): string {
    return jschardet.detect(data).encoding.toLowerCase();
}
