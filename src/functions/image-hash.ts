import { Sharp } from "sharp";
import { getImageBitmap } from "./image-bitmap";
const anyBase = require('any-base');

export async function getImageHash(img: Sharp) {
    const size = 32;
    const smallerSize = 8;

    initCoefficients(size);

    const buffer = await img.png().grayscale().resize(size, size).toBuffer()
    const bitmap = getImageBitmap(buffer);

    const vals: number[][] = [];

    let offset = 0;
    for (let x = 0; x < bitmap.width; x++) {
        vals[x] = [];
        for (let y = 0; y < bitmap.height; y++) {
            offset = x * y * 4;
            vals[x][y] = bitmap.data[offset + 2];
        }
    }

    /* 3. Compute the DCT.
       * The DCT separates the image into a collection of frequencies
       * and scalars. While JPEG uses an 8x8 DCT, this algorithm uses
       * a 32x32 DCT.
       */
    const dctVals = applyDCT(vals, size);

    /* 4. Reduce the DCT.
       * This is the magic step. While the DCT is 32x32, just keep the
       * top-left 8x8. Those represent the lowest frequencies in the
       * picture.
       */
    /* 5. Compute the average value.
       * Like the Average Hash, compute the mean DCT value (using only
       * the 8x8 DCT low-frequency values and excluding the first term
       * since the DC coefficient can be significantly different from
       * the other values and will throw off the average).
       */
    let total = 0;

    for (let x = 0; x < smallerSize; x++) {
        for (let y = 0; y < smallerSize; y++) {
            total += dctVals[x][y];
        }
    }

    const avg = total / (smallerSize * smallerSize);

    /* 6. Further reduce the DCT.
       * This is the magic step. Set the 64 hash bits to 0 or 1
       * depending on whether each of the 64 DCT values is above or
       * below the average value. The result doesn't tell us the
       * actual low frequencies; it just tells us the very-rough
       * relative scale of the frequencies to the mean. The result
       * will not vary as long as the overall structure of the image
       * remains the same; this can survive gamma and color histogram
       * adjustments without a problem.
       */
    let hash = '';

    for (let x = 0; x < smallerSize; x++) {
        for (let y = 0; y < smallerSize; y++) {
            hash += dctVals[x][y] > avg ? '1' : '0';
        }
    }

    return anyBase(anyBase.BIN, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')(hash);
}

const c: number[] = [];
function initCoefficients(size: number) {
    for (let i = 1; i < size; i++) {
        c[i] = 1;
    }

    c[0] = 1 / Math.sqrt(2.0);
}

function applyDCT(f: number[][], size: number) {
    const N = size;
    const F: number[][] = [];

    for (let u = 0; u < N; u++) {
        F[u] = [];
        for (let v = 0; v < N; v++) {
            let sum = 0;
            for (let i = 0; i < N; i++) {
                for (let j = 0; j < N; j++) {
                    sum +=
                        Math.cos(((2 * i + 1) / (2.0 * N)) * u * Math.PI) *
                        Math.cos(((2 * j + 1) / (2.0 * N)) * v * Math.PI) *
                        f[i][j];
                }
            }
            sum *= (c[u] * c[v]) / 4;
            F[u][v] = sum;
        }
    }

    return F;
}