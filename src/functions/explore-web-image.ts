import {
  ImageFormat,
  getImageSizeByName,
  getImageMasterSizeName,
  ImageFormatHelper
} from "@ournet/images-domain";
import got from "got";
import { URL } from "url";
import { getImageColor } from "./image-color2";
import { getImageHash } from "./image-hash";
const sharp = require("sharp");

export async function exploreWebImage(imageUrl: string) {
  let body: Buffer;
  let url: string;

  try {
    const data = await got(new URL(imageUrl), {
      responseType: "buffer",
      timeout: 1000 * 3,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)",
        // 'user-agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
        accept: "image/jpeg,image/png,image/webp"
      }
    });
    body = data.body;
    url = data.url;
  } catch (e) {
    throw new Error(e.message || "Error GET " + imageUrl);
  }

  if (body.byteLength < 5000) {
    throw new Error("Image is too small: " + body.byteLength);
  }
  // console.time('image');
  const image = await getWebImage(body, url);
  // console.timeEnd('image');

  return image;
}

async function getWebImage(data: Buffer, url: string): Promise<WebImage> {
  const length = data.byteLength;
  let image = sharp(data);
  // console.time('image-meta');
  const metadata = await image.metadata();
  // console.timeEnd('image-meta');

  const height = metadata.height || 0;
  const width = metadata.width || 0;

  const masterSize = getImageSizeByName(getImageMasterSizeName());
  let resized = false;
  if (masterSize < width) {
    image = image.resize(masterSize, undefined);
    resized = true;
  } else if (masterSize < height) {
    image = image.resize(undefined, masterSize);
    resized = true;
  }

  const format = ImageFormatHelper.getFormatByExtension(metadata.format || "");

  if (resized) {
    data = await image.toBuffer();
  }

  // console.time('image-hash');
  const hash = await getImageHash(data);
  // console.timeEnd('image-hash');

  // console.time('image-color');
  const color = await getImageColor(
    data,
    ImageFormatHelper.getMimeByFormat(format)
  );
  // console.timeEnd('image-color');

  return {
    url,
    data,
    width,
    height,
    length,
    hash,
    format,
    color
  };
}

// function getImageHash(data: Buffer): Promise<string> {
//     return imghash.hash(data);
// }

export type WebImage = {
  url: string;
  data: Buffer;
  width: number;
  height: number;
  length: number;
  hash: string;
  format: ImageFormat;
  color: string;
};
