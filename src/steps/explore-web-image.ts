
import { ImageFormat } from '@ournet/images-domain';
import got = require('got');
import jimp = require('jimp');

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
    const image = await jimp.read(data);
    const height = image.getHeight();
    const width = image.getWidth();
    const length = data.byteLength;
    const hash = <any>image.hash() as string;
    const mime = image.getMIME();
    let format: ImageFormat;
    if (mime === 'image/jpeg') {
        format = 'jpg';
    } else if (mime === 'image/npg') {
        format = 'png';
    } else {
        throw new Error(`Invalid image format: ${mime}`);
    }

    return {
        url,
        data,
        width,
        height,
        length,
        hash,
        format,
    }
}

export type WebImage = {
    url: string
    data: Buffer
    width: number
    height: number
    length: number
    hash: string
    format: ImageFormat
}
