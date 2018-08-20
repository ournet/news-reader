
const jschardet = require('jschardet');

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function detectEncoding(data: string): string {
    return jschardet.detect(data).encoding.toLowerCase();
}
