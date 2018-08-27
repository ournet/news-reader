
import { ImageFormat } from '@ournet/images-domain';
import got = require('got');
import sharp = require('sharp');
const imghash = require('imghash');
const rgbToHex = require('rgb-hex');

export async function exploreWebImage(imageUrl: string) {
    const { body, url } = await got(imageUrl, {
        encoding: null,
        timeout: 1000 * 3,
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
            'accept': 'image/jpeg,image/png',
        },
    });

    if (body.byteLength < 5000) {
        throw new Error('Image is too small: ' + body.byteLength);
    }

    const image = await getWebImage(body, url);

    return image;
}

async function getWebImage(data: Buffer, url: string): Promise<WebImage> {
    const image = sharp(data);
    const metadata = await image.metadata();
    if (!metadata.height || !metadata.width) {
        throw new Error(`Invalid image. No metadata. ${url}`);
    }

    const height = metadata.height || 0;
    const width = metadata.width || 0;
    const length = data.byteLength;
    const hash = await getImageHash(data);
    let format: ImageFormat;
    if (metadata.format === 'jpeg') {
        format = 'jpg';
    } else if (metadata.format === 'png') {
        format = 'png';
    } else {
        throw new Error(`Invalid image format: ${metadata.format}`);
    }
    const color = await getDominantColor(data);

    return {
        url,
        data,
        width,
        height,
        length,
        hash,
        format,
        color,
    }
}

function getDominantColor(data: Buffer): Promise<string> {
    return sharp(data)
        .resize(5, 5)
        .crop(sharp.strategy.attention)
        .toBuffer()
        .then(buffer => (<any>sharp(buffer)).stats())
        .then(stats => {
            const { channels: [r, g, b] } = stats;
            const rgb = [
                Math.round(r.max),
                Math.round(g.max),
                Math.round(b.max)
            ];

            return rgbToHex(rgb[0], rgb[1], rgb[2]);
        });
}

function getImageHash(data: Buffer): Promise<string> {
    return imghash.hash(data);
}

export type WebImage = {
    url: string
    data: Buffer
    width: number
    height: number
    length: number
    hash: string
    format: ImageFormat
    color: string
}
