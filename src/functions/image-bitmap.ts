const PNG = require('pngjs').PNG;

export function getImageBitmap(buffer: Buffer) {
    return PNG.sync.read(buffer) as {
        data: any
        width: number
        height: number
    }
}
