
// const jimp = require('jimp');
const quantize = require('quantize');
const rgbToHex = require('rgb-hex');
import sharp = require('sharp');
import { getImageBitmap } from './image-bitmap';

export async function getImageColor(image: sharp.SharpInstance): Promise<string> {
    const palette = getImagePalette(await image.resize(24, 24).png().toBuffer(), 5);
    const dominantColor = palette[0];
    return rgbToHex(dominantColor[0], dominantColor[1], dominantColor[2]);
}

function getImagePalette(pngBuffer: Buffer, colorCount: number, quality: number = 10) {
    const imageData = getImageBitmap(pngBuffer);
    const pixels = imageData.data;
    const pixelCount = imageData.width * imageData.height;

    // Store the RGB values in an array format suitable for quantize function
    const pixelArray = [];
    for (let i = 0, offset, r, g, b, a; i < pixelCount; i = i + quality) {
        offset = i * 4;
        r = pixels[offset + 0];
        g = pixels[offset + 1];
        b = pixels[offset + 2];
        a = pixels[offset + 3];
        // If pixel is mostly opaque and not white
        if (a >= 125) {
            if (!(r > 250 && g > 250 && b > 250)) {
                pixelArray.push([r, g, b]);
            }
        }
    }

    // Send array to quantize function which clusters values
    // using median cut algorithm
    const cmap = quantize(pixelArray, colorCount);
    const palette = cmap ? cmap.palette() : null;

    return palette;
}
