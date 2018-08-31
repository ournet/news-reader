
import { ImageFormat, getImageSizeByName, getImageMasterSizeName, ImageFormatHelper } from '@ournet/images-domain';
import got = require('got');
import { URL } from 'url';
const imghash = require('imghash');
const rgbToHex = require('rgb-hex');
const jimp = require('jimp');
const colorThief = require('color-thief-jimp');

export async function exploreWebImage(imageUrl: string) {
    const { body, url } = await got(new URL(imageUrl), {
        encoding: null,
        timeout: 1000 * 3,
        headers: {
            'user-agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)',
            // 'user-agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
            'accept': 'image/jpeg,image/png,image/webp',
        },
    });

    if (body.byteLength < 5000) {
        throw new Error('Image is too small: ' + body.byteLength);
    }

    const image = await getWebImage(body, url);

    return image;
}

async function getWebImage(data: Buffer, url: string): Promise<WebImage> {
    const length = data.byteLength;
    let image = await jimp.read(data);

    const height = image.getHeight();
    const width = image.getWidth();

    const masterSize = getImageSizeByName(getImageMasterSizeName());
    let resized = false;
    if (masterSize < width) {
        image = await image.resize(masterSize, jimp.AUTO)
        resized = true;
    } else if (masterSize < height) {
        image = await image.resize(jimp.AUTO, masterSize);
        resized = true;
    }

    const mime = image.getMIME();
    const format = ImageFormatHelper.getFormatByMime(mime);

    if (resized) {
        data = await image.getBufferAsync(mime);
    }


    const hash = await getImageHash(data);

    const rgbColor = colorThief.getColor(image);
    const color = rgbToHex(rgbColor[0], rgbColor[1], rgbColor[2]);

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
